import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, ApiError, setToken } from './api';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  setToken(null);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  setToken(null);
  vi.unstubAllGlobals();
});

test('sends the signed session and JSON headers on a same-origin API request', async () => {
  setToken('test-token');
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'doc' }), { status: 200 }));
  expect(
    await api('/documents', { method: 'POST', body: JSON.stringify({ title: 'Draft' }) }),
  ).toEqual({ id: 'doc' });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/documents');
  const headers = new Headers(options!.headers);
  expect(headers.get('Authorization')).toBe('Bearer test-token');
  expect(headers.get('Content-Type')).toBe('application/json');
});

test('leaves the multipart boundary to the browser', async () => {
  const body = new FormData();
  body.append('file', new Blob(['hello']), 'hello.txt');
  fetchMock.mockResolvedValueOnce(new Response('{}', { status: 201 }));
  await api('/documents/import', { method: 'POST', body });
  expect(new Headers(fetchMock.mock.calls[0][1]!.headers).has('Content-Type')).toBe(false);
  expect(fetchMock.mock.calls[0][1]!.body).toBe(body);
});

test('raises the server message and signals session expiry on 401', async () => {
  const listener = vi.fn();
  window.addEventListener('folio-session-expired', listener);
  try {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Session expired.' } }),
        { status: 401 },
      ),
    );
    await expect(api('/documents')).rejects.toMatchObject({
      status: 401,
      message: 'Session expired.',
    });
    expect(listener).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener('folio-session-expired', listener);
  }
});

test('returns a useful connection error without replacing a caller cancellation', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(api('/documents')).rejects.toBeInstanceOf(ApiError);
  const canceled = new DOMException('Canceled', 'AbortError');
  fetchMock.mockRejectedValueOnce(canceled);
  await expect(api('/documents')).rejects.toBe(canceled);
});

test('handles empty successful delete responses', async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
  await expect(api('/documents/doc', { method: 'DELETE' })).resolves.toBeUndefined();
});

test('recognizes a timeout DOMException independently of its JavaScript realm', async () => {
  fetchMock.mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));
  await expect(api('/documents')).rejects.toMatchObject({
    status: 0,
    message: 'The server is taking too long to respond. Please try again.',
  });
});
