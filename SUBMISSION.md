# Submission

**Live URL:** TODO — replace after deployment to your Render account.

## Included

- `/client`: React + TypeScript + Vite + Material UI, profile picker, two document collections, server-side title search, paginated cards, Tiptap editor, active toolbar, serial autosave, sharing dialog, file-import dialog, responsive styling, loading/error/empty states.
- `/server`: Express + TypeScript, signed mock sessions, Zod validation, centralized JSON errors, Prisma services, role enforcement, sanitized content, memory uploads and worker conversion.
- `/server/prisma`: schema, SQL migration, idempotent four-user/two-document seed.
- `/server/src/*.test.ts`: Vitest + Supertest integration tests using separate PostgreSQL data and isolated cleanup.
- `/server/test/fixtures/sample.docx`: real Word conversion fixture.
- `/scripts/local-db.ts`: optional disposable/local PostgreSQL development helper.
- Root npm scripts, lockfile, ESLint/Prettier settings, environment examples, `.gitignore`, `.gitattributes`, and `render.yaml`.
- `README.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md`, `SUBMISSION.md`, `docs/README.md`, and `docs/MANUAL_TEST.md`.

## Accounts

Choose Alice, Bob, Carol, or Dave on the demo login page. Their addresses are `alice@example.com`, `bob@example.com`, `carol@example.com`, and `dave@example.com`. No passwords. Alice owns both seeded documents; Bob initially views “Our next chapter.”

## Working features

Document create/read/inline rename/content edit/delete; formatting persistence; visible debounced autosave with retry; separate own/shared lists with cursor pagination; server-side search; Owner/Editor/Viewer roles enforced by the API; invitation, role change, revocation; `.txt`/`.md`/`.docx` import and validation; same-service production hosting configuration.

## External completion steps

Verification in the implementation workspace: ESLint, both TypeScript checks, both production builds, and **19 PostgreSQL-backed integration tests passed**. `npm audit` reported **0 vulnerabilities**. Production HTTP smoke checks passed for database readiness, SPA deep links, gzip/immutable assets, JSON asset errors, mock login, and metadata-only document pages. Browser interaction was stopped by the user before visual/manual validation; complete `docs/MANUAL_TEST.md` before submission.

- Create Neon database, supply production connection URL, push repository, and deploy to Render.
- Replace the live URL above; validate the actual deployed environment.
- Complete the clearly marked personal sections of `AI_WORKFLOW.md`.
- Capture screenshots listed in `docs/README.md` and record the submission video.

The explicitly out-of-scope features are listed under **Deprioritized** in README. Concurrent sessions use last-write-wins and require reopen to see remote changes; there is no claim of real-time collaboration.
