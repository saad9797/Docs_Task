import { parentPort, workerData } from 'node:worker_threads';
import mammoth from 'mammoth';
import { marked } from 'marked';
import yauzl from 'yauzl';
function inspectZip(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zip) => {
      if (error) return reject(new Error('This is not a valid .docx file.'));
      let total = 0,
        entries = 0,
        hasDocument = false;
      zip.on('error', reject);
      zip.on('entry', (entry) => {
        total += entry.uncompressedSize;
        entries++;
        if (total > 16 * 1024 * 1024 || entries > 1000 || entry.generalPurposeBitFlag & 1) {
          zip.close();
          reject(
            new Error(
              'This .docx is too complex or encrypted. Try a smaller, unencrypted document.',
            ),
          );
          return;
        }
        if (entry.fileName === 'word/document.xml') hasDocument = true;
        zip.readEntry();
      });
      zip.on('end', () =>
        hasDocument ? resolve() : reject(new Error('This file is not a Word document.')),
      );
      zip.readEntry();
    });
  });
}
parentPort.postMessage({ ready: true });
try {
  const buffer = Buffer.from(workerData.buffer);
  let html;
  if (workerData.extension === '.docx') {
    await inspectZip(buffer);
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        externalFileAccess: false,
        convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })),
      },
    );
    html = result.value;
  } else {
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      throw new Error('Text and Markdown files must use UTF-8 encoding.');
    }
    if (text.includes('\0'))
      throw new Error('This file contains binary data. Upload a text, Markdown, or Word document.');
    if (workerData.extension === '.md') html = await marked.parse(text, { async: true });
    else
      html = text
        .split(/\r?\n/)
        .map(
          (line) =>
            `<p>${line.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`,
        )
        .join('');
  }
  if (Buffer.byteLength(html) > 500000)
    throw new Error('The imported text exceeds the 500 KB document limit. Try a smaller file.');
  parentPort.postMessage({ html });
} catch (error) {
  parentPort.postMessage({ error: error.message || 'Unable to read this file.' });
}
