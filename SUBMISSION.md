# Submission

**Live URL:** TODO — replace after deployment to your Render account.

## Included

- `/client`: React + TypeScript + Vite + Material UI, profile picker, two document collections, server-side title search, paginated cards, Tiptap editor, active toolbar, serial autosave, sharing dialog, file-import dialog, responsive styling, loading/error/empty states, and Vitest/jsdom API/autosave regression tests.
- `/server`: Express + TypeScript, signed mock sessions, Zod validation, centralized JSON errors, Prisma services, role enforcement, sanitized content, memory uploads and worker conversion.
- `/server/prisma`: schema, SQL migration, idempotent four-user/two-document seed.
- `/server/src/**/*.test.ts`: Vitest + Supertest integration tests using separate PostgreSQL data and isolated cleanup, plus worker lifecycle tests.
- `/server/test/fixtures/sample.docx`: real Word conversion fixture.
- `/scripts/local-db.ts`: optional disposable/local PostgreSQL development helper.
- Root npm scripts, lockfile, ESLint/Prettier settings, environment examples, `.gitignore`, `.gitattributes`, and `render.yaml`.
- `README.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md`, `SUBMISSION.md`, `docs/README.md`, `docs/MANUAL_TEST.md`, and `docs/QA_REPORT.md`.

## Accounts

Choose Alice, Bob, Carol, or Dave on the demo login page. Their addresses are `alice@example.com`, `bob@example.com`, `carol@example.com`, and `dave@example.com`. No passwords. Alice owns both seeded documents; Bob initially views “Our next chapter.”

## Working features

Document create/read/inline rename/content edit/delete; formatting persistence; visible debounced autosave with retry; separate own/shared lists with cursor pagination; server-side search; Owner/Editor/Viewer roles enforced by the API; invitation, role change, revocation; `.txt`/`.md`/`.docx` import and validation; same-service production hosting configuration.

## External completion steps

Verification after the assignment QA audit: ESLint, both TypeScript checks, both production builds, and **36 automated tests passed** (12 client, 20 PostgreSQL-backed integration, 4 worker lifecycle). A fresh `npm ci`, fresh database migration/seed, and the full check passed in an isolated clean checkout with the QA changes applied. `npm audit` reported **0 vulnerabilities**. Live Supertest checks passed **22/22**, and headless Chromium browser checks passed **13/13**, including keyboard formatting, undo/redo, autosave/error recovery, persistence, sharing roles, and mobile overflow. Production HTTP smoke checks also passed. Baseline failures and each separate fix/rerun are recorded in `docs/QA_REPORT.md`; actual Render/Neon deployment remains unverified.

- Create Neon database, supply production connection URL, push repository, and deploy to Render.
- Replace the live URL above; validate the actual deployed environment.
- Complete the clearly marked personal sections of `AI_WORKFLOW.md`.
- Capture screenshots listed in `docs/README.md` and record the submission video.

The explicitly out-of-scope features are listed under **Deprioritized** in README. Concurrent sessions use last-write-wins and require reopen to see remote changes; there is no claim of real-time collaboration.
