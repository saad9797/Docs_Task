import { expect, test } from 'vitest';
import { htmlToMarkdown, sanitizeFilename } from './export';

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
