import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api } from './api';
import { useAutosave } from './useAutosave';

vi.mock('./api', () => ({
  api: vi.fn(),
  message: (error: Error) => error.message,
}));

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
let root: Root | null;
let current: ReturnType<typeof useAutosave>;
const mockedApi = vi.mocked(api);

function Harness() {
  current = useAutosave('10000000-0000-4000-8000-000000000001');
  return null;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(async () => {
  vi.useFakeTimers();
  mockedApi.mockReset();
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<Harness />);
  });
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  document.body.replaceChildren();
  vi.useRealTimers();
});

test('debounces edits, serializes HTML only when saving, and exposes saving/saved', async () => {
  const request = deferred();
  mockedApi.mockReturnValueOnce(request.promise);
  const serialize = vi.fn(() => '<p>Latest text</p>');
  await act(async () => {
    current.change({ title: 'First title', content: serialize });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
    current.change({ title: 'Latest title' });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(999);
  });
  expect(mockedApi).not.toHaveBeenCalled();
  expect(serialize).not.toHaveBeenCalled();
  expect(current.dirty).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(current.status).toBe('saving');
  expect(serialize).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mockedApi.mock.calls[0][1]!.body as string)).toEqual({
    title: 'Latest title',
    content: '<p>Latest text</p>',
  });
  await act(async () => {
    request.resolve();
    await request.promise;
  });
  expect(current.status).toBe('saved');
  expect(current.dirty).toBe(false);
});

test('keeps writes in order and drains edits made during an in-flight save', async () => {
  const first = deferred(),
    second = deferred();
  mockedApi.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  await act(async () => {
    current.change({ content: () => '<p>First</p>' });
    await vi.advanceTimersByTimeAsync(1000);
  });
  await act(async () => {
    current.change({ content: () => '<p>Second</p>' });
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(mockedApi).toHaveBeenCalledTimes(1);
  await act(async () => {
    first.resolve();
    await first.promise;
  });
  expect(mockedApi).toHaveBeenCalledTimes(2);
  expect(JSON.parse(mockedApi.mock.calls[1][1]!.body as string).content).toBe('<p>Second</p>');
  expect(current.status).toBe('saving');
  await act(async () => {
    second.resolve();
    await second.promise;
  });
  expect(current.status).toBe('saved');
  expect(current.dirty).toBe(false);
});

test('retains failed edits and retries them without losing the latest content', async () => {
  mockedApi.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => {
    current.change({ content: () => '<p>Keep me</p>' });
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(current.status).toBe('error');
  expect(current.error).toBe('Offline');
  expect(current.dirty).toBe(true);
  mockedApi.mockResolvedValueOnce(undefined);
  await act(async () => {
    expect(await current.flush()).toBe(true);
  });
  expect(JSON.parse(mockedApi.mock.calls[1][1]!.body as string).content).toBe('<p>Keep me</p>');
  expect(current.status).toBe('saved');
  expect(current.error).toBe('');
  expect(current.dirty).toBe(false);
});

test('warns on unload while dirty and stops warning after saving', async () => {
  await act(async () => {
    current.change({ title: 'Pending' });
  });
  const pending = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(pending);
  expect(pending.defaultPrevented).toBe(true);
  mockedApi.mockResolvedValueOnce(undefined);
  await act(async () => {
    await current.flush();
  });
  const clean = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
});

test('unmount cancels the pending debounce', async () => {
  await act(async () => {
    current.change({ title: 'Discard' });
    root!.unmount();
    root = null;
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(mockedApi).not.toHaveBeenCalled();
});

test('discarding during an in-flight request does not send the queued next edit', async () => {
  const first = deferred();
  mockedApi.mockReturnValueOnce(first.promise);
  await act(async () => {
    current.change({ title: 'Already sent' });
    await vi.advanceTimersByTimeAsync(1000);
  });
  await act(async () => {
    current.change({ title: 'Discard this queued edit' });
    root!.unmount();
    root = null;
  });
  await act(async () => {
    first.resolve();
    await first.promise;
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(mockedApi).toHaveBeenCalledTimes(1);
});
