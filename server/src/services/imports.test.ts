import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { importDocument } from './imports.js';
import { createDocument } from './documents.js';

type FakeWorker = {
  emit: (event: string, ...values: unknown[]) => boolean;
  terminate: ReturnType<typeof vi.fn>;
};
const state = vi.hoisted(() => ({ workers: [] as FakeWorker[] }));

vi.mock('node:worker_threads', async () => {
  const { EventEmitter } = await import('node:events');
  class Worker extends EventEmitter {
    terminate = vi.fn(async () => 0);
    constructor() {
      super();
      state.workers.push(this);
    }
  }
  return { Worker };
});
vi.mock('./documents.js', () => ({
  createDocument: vi.fn(async (ownerId: string, input: { title: string; content: string }) => ({
    id: 'imported',
    ownerId,
    ...input,
  })),
}));

const file = {
  originalname: 'cold.txt',
  size: 4,
  buffer: Buffer.from('text'),
} as Express.Multer.File;
beforeEach(() => {
  vi.useFakeTimers();
  state.workers.length = 0;
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

test('cold worker startup does not consume the document conversion budget', async () => {
  const request = importDocument('owner', file);
  const worker = state.workers[0];
  await vi.advanceTimersByTimeAsync(29000);
  expect(worker.terminate).not.toHaveBeenCalled();
  worker.emit('message', { ready: true });
  await vi.advanceTimersByTimeAsync(9000);
  worker.emit('message', { html: '<p>text</p>' });
  await expect(request).resolves.toMatchObject({ title: 'cold', content: '<p>text</p>' });
  expect(createDocument).toHaveBeenCalledTimes(1);
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});

test('a worker that never becomes ready is terminated after bounded startup', async () => {
  const outcome = importDocument('owner', file).catch((error) => error);
  const worker = state.workers[0];
  await vi.advanceTimersByTimeAsync(30000);
  expect(await outcome).toMatchObject({ status: 422, code: 'IMPORT_TIMEOUT' });
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(createDocument).not.toHaveBeenCalled();
});

test('ready workers still have only ten seconds to convert a document', async () => {
  const outcome = importDocument('owner', file).catch((error) => error);
  const worker = state.workers[0];
  worker.emit('message', { ready: true });
  await vi.advanceTimersByTimeAsync(9999);
  expect(worker.terminate).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(await outcome).toMatchObject({ status: 422, code: 'IMPORT_TIMEOUT' });
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(createDocument).not.toHaveBeenCalled();
});

test('an early worker exit rejects immediately instead of waiting for a timeout', async () => {
  const outcome = importDocument('owner', file).catch((error) => error);
  state.workers[0].emit('exit', 0);
  expect(await outcome).toMatchObject({ status: 422, code: 'IMPORT_FAILED' });
  await vi.advanceTimersByTimeAsync(40000);
  expect(state.workers[0].terminate).toHaveBeenCalledTimes(1);
  expect(createDocument).not.toHaveBeenCalled();
});
