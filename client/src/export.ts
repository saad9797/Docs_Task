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

export function printDocument(title: string): void {
  const previousTitle = document.title;
  document.title = sanitizeFilename(title);
  try {
    window.print();
  } finally {
    document.title = previousTitle;
  }
}
