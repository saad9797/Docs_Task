# Architecture and decisions

## Priorities

Correct server authorization, reliable saves, bounded work, and a coherent writing experience came first. The app stays one deployable service with one database. The browser handles editor interaction and rendering; filtering, pagination, import conversion, validation, and sanitization run on the server.

## Layout and data

`client/` contains React screens, a typed API client, shared session/theme components, and a serial autosave hook. The rich editor is lazy-loaded. Tiptap transactions update toolbar state through a focused subscription rather than rerendering the entire editor. HTML serialization happens on save or explicit export, rather than on every transaction.

`server/src/routes.ts` validates transport inputs with Zod and calls `services/`; services enforce access rules and query Prisma. Errors are normalized centrally. `import-worker.mjs` isolates conversion CPU work from the Express event loop. Compiled worker files are included in the server build.

- `User`: UUID, unique email, display name.
- `Document`: UUID, owner FK, title, HTML content, creation/update timestamps.
- `DocumentShare`: UUID, document/user FKs, Editor/Viewer role; unique `(documentId, userId)`.
- Cascading FKs remove orphan shares. Owner/update-time and collaborator indexes support lists. Lists select only metadata, fetch `limit + 1`, and return a keyset cursor ordered by updated time and UUID. Search and file imports are processed on the server.

## Client-side export

Export operates on the single document already loaded and authorized for reading, so Owners, Editors, and Viewers can export without another request, server endpoint, or schema change. Markdown lazily loads Turndown on demand and converts the current editor HTML, preserving headings, emphasis, and lists; underline becomes plain text because standard Markdown has no underline syntax. Filenames remove illegal characters and handle empty/reserved names. PDF lazily loads html2pdf.js to render the current editor HTML into a downloadable A4 PDF with 15 mm margins and document typography. The menu awaits generation and reports export errors. Export does not require saving first or change the existing editing/access behavior.

## Authorization

A selected demo user receives an HS256 JWT with issuer/audience restrictions and a 12-hour lifetime. Every protected request verifies the signature and checks the user still exists. The token is in tab-scoped session storage. Ownership always comes from the verified server session, never the request body. An owner has full access; a share grants only its stored role. Only owners may enumerate/manage collaborators and delete. Missing documents return 404 and inaccessible existing documents return 403 as requested. Mutation predicates repeat edit authorization to prevent a revocation between access checking and content writing from bypassing permissions.

## Saves, imports, and failure behavior

Autosave debounces for one second, sends only changed fields, serializes in-flight writes, and drains edits made while a save was pending. Failed changes remain in memory, with retry and navigation protection. A session can be renewed without unmounting the editor. This protects a single tab’s save order; across sessions the policy is **last-write-wins**, not collaborative merging.

Uploads use multer memory storage with a strict 2 MiB limit and accept exactly one file. Server workers parse Word via mammoth and Markdown via marked. DOCX central-directory metadata is checked before conversion for encryption, expansion size, and entry count. Two workers/process, deadlines, and heap limits bound concurrency and CPU cost. The server allowlists HTML tags on both imports and saves. Images, links, external files, scripts, event handlers, and styles are removed. Nothing is stored on local disk.

## Tradeoffs

- **HTML over Tiptap JSON:** simple, inspectable storage and import path; coupled to the supported HTML subset and less suitable for CRDT editing or semantic migrations. Sanitization and the editor schema intentionally agree on supported formats.
- **Mock auth:** fast reviewer onboarding and reproducible role tests; profiles are publicly selectable, so the deployment must contain demo data only. Real identity is the first production prerequisite.
- **Bounded whole-document saves:** acceptable under the 500 KB content cap; patch-based editing would be more efficient for long documents. Formatting itself must run in the browser; data queries and import transformations do not.
- **Live keyset pages:** avoid large offset scans and full-library downloads; updated rows can move across pages. No expensive total count on every search. Title substring search still has a database scan cost for very large workspaces; a trigram index would be a measured next step.
- **One free Render instance:** simple operations; per-process import/rate limits, startup migrations, no distributed job queue. Provider cold starts are an accepted free-tier limitation.

## Next 2–4 hours

1. Add optimistic concurrency with a version/ETag and a conflict recovery interface before supporting serious multi-session editing.
2. Add a PostgreSQL trigram title index after measuring representative query plans; then add search-specific performance checks.
3. Expand automated browser coverage for keyboard formatting, delayed-network saves, mobile layout, and screen-reader navigation.
4. Add genuine identity before allowing non-demo documents, then move imports into a queued worker if traffic requires it.
