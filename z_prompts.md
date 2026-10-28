Core functionality is complete and tested. Add ONE small enhancement: document export. Do not modify existing behavior or schema.

- Add an "Export" menu in the editor toolbar with "Markdown (.md)" and "PDF".
- Markdown: convert the editor HTML to Markdown on the client using `turndown` (headings, bold, italic, lists must map correctly; underline may fall back to plain text, so document this). Download as `<title>.md`.
- PDF: use a print stylesheet (`@media print`) that hides the app chrome and toolbar and shows only the document with clean typography, then call `window.print()`. Add a short hint that the user should choose "Save as PDF".
- Export must be available to owner, editor, and viewer (viewers may read, so they may export). No new server endpoints.
- Sanitize the filename (strip characters illegal in filenames).
- Add one frontend or unit test for the HTML-to-Markdown conversion covering headings, bold/italic, and lists.
- Update README (features), ARCHITECTURE.md (one paragraph on why client-side export), and SUBMISSION.md.
- Run lint, typecheck, build, and tests, and report results.

implement this without taking any half measures and take care of user experience.