import { Worker } from 'node:worker_threads';
import { extname } from 'node:path';
import { AppError } from '../errors.js';
import { createDocument } from './documents.js';
import { titleSchema } from '../validation.js';
let active = 0;
export async function importDocument(userId: string, file?: Express.Multer.File) {
  if (!file) throw new AppError(400, 'UPLOAD', 'Choose a .txt, .md, or .docx file to import.');
  let filename = file.originalname;
  try {
    filename = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(filename, 'latin1'));
  } catch {
    /* Preserve a non-UTF-8 multipart filename. */
  }
  const name = filename.replaceAll('\\', '/').split('/').at(-1)!;
  const extension = extname(name).toLowerCase();
  if (!['.txt', '.md', '.docx'].includes(extension))
    throw new AppError(
      400,
      'UNSUPPORTED_FILE',
      'Unsupported file type. Choose .txt, .md, or .docx (up to 2 MB).',
    );
  if (!file.size)
    throw new AppError(400, 'EMPTY_FILE', 'This file is empty. Choose a file with some content.');
  if (active >= 2)
    throw new AppError(
      503,
      'IMPORT_BUSY',
      'Other imports are being processed. Please try again shortly.',
    );
  active++;
  try {
    const html = await new Promise<string>((resolve, reject) => {
      const worker = new Worker(new URL('../import-worker.mjs', import.meta.url), {
        workerData: { buffer: file.buffer, extension },
        resourceLimits: { maxOldGenerationSizeMb: 96, stackSizeMb: 4 },
      });
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      const finish = () => {
        if (settled) return false;
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        return true;
      };
      const timeout = (message: string) => {
        if (finish()) reject(new AppError(422, 'IMPORT_TIMEOUT', message));
      };
      // Cold module loading is separate from the bounded document conversion budget.
      timer = setTimeout(
        () => timeout('Import processing could not start in time. Please try again.'),
        30000,
      );
      worker.on('message', (result: { ready?: boolean; html?: string; error?: string }) => {
        if (settled) return;
        if (result.ready) {
          clearTimeout(timer);
          timer = setTimeout(
            () => timeout('This file took too long to process. Try a simpler document.'),
            10000,
          );
          return;
        }
        if (!finish()) return;
        if (result.error) reject(new AppError(422, 'IMPORT_FAILED', result.error));
        else resolve(result.html!);
      });
      worker.once('error', () => {
        if (finish())
          reject(
            new AppError(
              422,
              'IMPORT_FAILED',
              'This file could not be processed. Try a smaller or simpler document.',
            ),
          );
      });
      worker.once('exit', () => {
        if (finish())
          reject(
            new AppError(
              422,
              'IMPORT_FAILED',
              'Import processing stopped. Try a simpler document.',
            ),
          );
      });
    });
    return await createDocument(userId, {
      title: titleSchema.parse(
        name.slice(0, -extension.length).trim().slice(0, 200) || 'Imported document',
      ),
      content: html,
    });
  } finally {
    active--;
  }
}
