export async function htmlToMarkdown(html: string): Promise<string> {
  const { default: TurndownService } = await import('turndown');
  const converter = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    codeBlockStyle: 'fenced',
  });
  return converter.turndown(html);
}

export function sanitizeFilename(title: string): string {
  const base = Array.from(title)
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()
    .replace(/[. ]+$/g, '');
  if (!base) return 'Untitled document';
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base) ? `_${base}` : base;
}

export async function downloadMarkdown(html: string, title: string): Promise<void> {
  const markdown = await htmlToMarkdown(html);
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(title)}.md`;
  document.body.append(link);
  link.click();
  link.remove();
  // Keep the URL alive until the browser has started consuming the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPdf(html: string, title: string): Promise<void> {
  const { default: html2pdf } = await import('html2pdf.js');
  const content = document.createElement('div');
  // Do not inherit .tiptap screen/media-query styles: the same document must
  // export identically from a phone and a desktop.
  content.className = 'pdf-document';
  content.innerHTML = html;
  // Use a fixed page width, independent of the editor's responsive layout.
  Object.assign(content.style, {
    width: '180mm',
    display: 'flow-root',
    boxSizing: 'border-box',
    padding: '0',
    minHeight: '0',
    backgroundColor: '#ffffff',
    color: '#111111',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '12pt',
    lineHeight: '1.55',
    overflowWrap: 'anywhere',
  });
  content.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.style.boxSizing = 'border-box';
    element.style.maxWidth = '100%';
  });
  content.querySelectorAll<HTMLElement>('p').forEach((paragraph) => {
    paragraph.style.margin = '0 0 0.75em';
  });
  content.querySelectorAll<HTMLElement>('h1, h2, h3').forEach((heading) => {
    Object.assign(heading.style, {
      fontFamily: "Arial, 'Helvetica Neue', sans-serif",
      fontSize: { H1: '24pt', H2: '18pt', H3: '14pt' }[heading.tagName],
      lineHeight: '1.25',
      margin: '0.9em 0 0.45em',
    });
  });
  content.querySelectorAll<HTMLElement>('ul, ol').forEach((list) => {
    Object.assign(list.style, { margin: '0 0 0.75em', paddingLeft: '1.8em' });
  });
  content.querySelectorAll<HTMLElement>('li').forEach((item) => {
    item.style.marginBottom = '0.25em';
    item.querySelectorAll<HTMLElement>(':scope > p').forEach((paragraph) => {
      paragraph.style.margin = '0';
    });
  });
  content.querySelectorAll<HTMLElement>('pre').forEach((block) => {
    Object.assign(block.style, {
      whiteSpace: 'pre-wrap',
      background: '#f3f4f6',
      padding: '10pt',
      fontSize: '10pt',
    });
  });
  content.querySelectorAll<HTMLElement>('blockquote').forEach((block) => {
    Object.assign(block.style, {
      margin: '0 0 0.75em',
      paddingLeft: '12pt',
      borderLeft: '2pt solid #cccccc',
    });
  });
  // html2pdf does not implement break-after: avoid. Keep each heading run with
  // its following paragraph in an explicit, unbreakable group instead.
  content.querySelectorAll<HTMLElement>('h1, h2, h3').forEach((heading) => {
    if (heading.parentElement?.className === 'pdf-heading-group') return;
    const group = document.createElement('div');
    group.className = 'pdf-heading-group';
    group.style.display = 'flow-root';
    heading.before(group);
    group.append(heading);
    while (group.nextElementSibling?.matches('h1, h2, h3')) {
      group.append(group.nextElementSibling);
    }
    if (group.nextElementSibling?.matches('p')) group.append(group.nextElementSibling);
  });
  await document.fonts?.ready;
  const worker = html2pdf();
  // The library's bundled declaration omits its documented pagebreak option.
  const options: Parameters<typeof worker.set>[0] & {
    pagebreak: { mode: string[]; avoid: string[] };
  } = {
    filename: `${sanitizeFilename(title)}.pdf`,
    margin: 15,
    image: { type: 'png', quality: 1 },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['p', 'li', 'pre', 'blockquote', '.pdf-heading-group'],
    },
    html2canvas: { scale: 2, backgroundColor: '#ffffff', scrollY: 0, windowWidth: 1024 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };
  await worker.set(options).from(content).save();
}
