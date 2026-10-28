import { expect, test, vi } from 'vitest';
import { downloadPdf, htmlToMarkdown, sanitizeFilename } from './export';

const pdf = vi.hoisted(() => ({ set: vi.fn(), from: vi.fn(), save: vi.fn() }));
vi.mock('html2pdf.js', () => ({
  default: () => {
    pdf.set.mockReturnValue(pdf);
    pdf.from.mockReturnValue(pdf);
    return pdf;
  },
}));

test('downloads current formatted content as a named PDF without opening print', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  pdf.save.mockResolvedValue(undefined);
  const html = '<h1>Latest edits</h1><p><strong>Bold</strong> and <u>underlined</u></p>';
  await downloadPdf(html, 'Report: draft?');
  expect(pdf.set).toHaveBeenCalledWith(
    expect.objectContaining({ filename: 'Report draft.pdf', margin: 15 }),
  );
  const content = pdf.from.mock.calls[0][0] as HTMLElement;
  expect(content.querySelector('h1')?.textContent).toBe('Latest edits');
  expect(content.querySelector('strong')?.textContent).toBe('Bold');
  expect(content.querySelector('u')?.textContent).toBe('underlined');
  expect(content.style.width).toBe('180mm');
  expect(content.isConnected).toBe(false);
  expect(pdf.save).toHaveBeenCalledOnce();
  expect(print).not.toHaveBeenCalled();
});

test('propagates PDF generation failures so the export menu can report them', async () => {
  pdf.save.mockRejectedValueOnce(new Error('PDF generation failed'));
  await expect(downloadPdf('<p>Content</p>', '')).rejects.toThrow('PDF generation failed');
  expect(pdf.set).toHaveBeenCalledWith(
    expect.objectContaining({ filename: 'Untitled document.pdf' }),
  );
});

test('converts editor headings, bold/italic, and both list types to Markdown', async () => {
  const markdown = await htmlToMarkdown(
    '<h1>One</h1><h2>Two</h2><h3>Three</h3><p><strong>Bold</strong> and <em>italic</em> and <u>underline</u>.</p><ul><li><p>Bullet one</p></li><li><p>Bullet two</p></li></ul><ol><li><p>First</p></li><li><p>Second</p></li></ol>',
  );
  expect(markdown).toContain('# One');
  expect(markdown).toContain('## Two');
  expect(markdown).toContain('### Three');
  expect(markdown).toContain('**Bold**');
  expect(markdown).toContain('*italic*');
  expect(markdown).toMatch(/-\s+Bullet one/);
  expect(markdown).toMatch(/-\s+Bullet two/);
  expect(markdown).toMatch(/1\.\s+First/);
  expect(markdown).toMatch(/2\.\s+Second/);
  expect(markdown).toContain('underline');
  expect(markdown).not.toContain('<u>');
});

test('removes illegal filename characters and handles empty or reserved names', () => {
  expect(sanitizeFilename('  Roadmap: Q4/2026\\draft?*<>"|  ')).toBe('Roadmap Q42026draft');
  expect(sanitizeFilename('Notes\u0000\n. ')).toBe('Notes');
  expect(sanitizeFilename('..')).toBe('Untitled document');
  expect(sanitizeFilename('CON')).toBe('_CON');
  expect(sanitizeFilename('NUL.notes')).toBe('_NUL.notes');
  expect(sanitizeFilename('خیالات 🌱')).toBe('خیالات 🌱');
});
