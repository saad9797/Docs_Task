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
  content.className = 'tiptap';
  content.innerHTML = html;
  // Use a fixed page width, independent of the editor's responsive layout.
  Object.assign(content.style, {
    width: '180mm',
    padding: '0',
    minHeight: '0',
    backgroundColor: '#ffffff',
    color: '#283047',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '12pt',
    lineHeight: '1.8',
  });
  content.querySelectorAll<HTMLElement>('h1, h2, h3').forEach((heading) => {
    heading.style.breakAfter = 'avoid';
  });
  await document.fonts?.ready;
  await html2pdf()
    .set({
      filename: `${sanitizeFilename(title)}.pdf`,
      margin: 15,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff', scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(content)
    .save();
}
