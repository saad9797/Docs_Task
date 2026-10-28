# Folio

A lightweight collaborative document workspace: React, TypeScript, Vite, Material UI, Tiptap, Express, Prisma, and PostgreSQL. One Render service serves the API and built SPA; Neon stores all documents, users, and shares.

## Features

- Four password-free demo profiles with signed, expiring sessions.
- Create, rename inline, edit, delete, reopen, and autosave rich-text documents. Bold, italic, underline, headings 1–3, lists, undo/redo, and standard editor keyboard shortcuts.
- One-second debounced, serial autosave with visible status, explicit retry, and protection against leaving with unsaved edits. A session can be resumed without losing the open editor.
- Separate **My documents** / **Shared with me** views, metadata-only cursor pagination (12 documents per page, maximum 50), database-side title search, owner details, updated time, and role badges.
- Owners invite by email, change roles, revoke access, copy links, and delete documents. Editors edit title/content; viewers see a read-only editor. The API enforces every role.
- Import `.txt`, `.md`, or `.docx` as a **new** editable document. Filename becomes the title. Upload limit: **2 MiB (2,097,152 bytes)**, displayed as 2 MB in the UI. Text/Markdown must be UTF-8. Sanitized document content is limited to **500,000 UTF-8 bytes**.
- **Export** in the editor toolbar is available to Owners, Editors, and Viewers. Markdown downloads the currently displayed content (including unsaved edits) as a sanitized `<title>.md` filename using Turndown, loaded only when needed. Headings, bold, italic, and lists are preserved; Markdown has no standard underline syntax, so underline falls back to plain text. **PDF** downloads the current content directly as a sanitized `<title>.pdf` file, including unsaved edits. PDF generation runs in the browser and loads only when needed, with A4 pages, fixed typography independent of screen size, normalized nested lists, and page-break protection for paragraphs and headings. PDF content is rasterized by html2pdf.js; text is not selectable.
- Responsive workspace, accessible control labels, active formatting state, loading/error/empty states, and a centered white writing surface.

Conversion and HTML sanitization happen on the server. Word/Markdown parsing runs in worker threads, with two concurrent conversions per process, a 30-second cold worker startup allowance followed by a 10-second conversion deadline, 96 MB worker JS heap limit, and ZIP expansion checks (16 MiB / 1,000 entries). Files stay in memory and are not retained. Images, tables, external assets, and advanced Word layout are not imported. Supported text formatting survives refresh.

## Demo profiles

| Name  | Email             | Initial access                     |
| ----- | ----------------- | ---------------------------------- |
| Alice | alice@example.com | Owns two sample documents          |
| Bob   | bob@example.com   | Viewer of “Our next chapter”       |
| Carol | carol@example.com | Empty workspace, no initial shares |
| Dave  | dave@example.com  | Empty workspace, no initial shares |

This is intentionally mocked authentication. Anyone can choose any demo profile. Do not store sensitive documents in a public evaluation deployment.

## Local setup

Prerequisites: Node.js **22.19+**, npm 11, Git, and PostgreSQL 16+ (or a Neon database). The optional `db:local` helper downloads/runs PostgreSQL through an npm development dependency; Docker is not required. Windows, macOS, and Linux supported by that package. On Linux, run it as a normal non-root user.

```sh
npm ci
```

Copy `server/.env.example` to `server/.env`. PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

macOS/Linux:

```sh
cp server/.env.example server/.env
```

Set `DATABASE_URL` and a randomly generated `JWT_SECRET` of at least 32 characters. For example, generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. The client has no secrets; `client/.env.example` explains the same-origin setup.

Optional local database, in a separate terminal:

```sh
npm run db:local
```

Keep that terminal open. It creates `folio` and `folio_test` on localhost:54329, matching the example environment, and persists them in ignored `.local-postgres/`. Otherwise supply your own PostgreSQL URLs.

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to port 3001. Seeding is idempotent: it does not overwrite document edits or reset existing share roles. To restore the initial demo, use a fresh disposable database.

### Environment

| Variable            | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection URL; Neon URLs should retain their TLS parameters |
| `JWT_SECRET`        | Random signing secret, at least 32 characters; server-only              |
| `PORT`              | API port, default 3001; Render supplies this                            |
| `NODE_ENV`          | `development` locally; `production` on Render                           |
| `TEST_DATABASE_URL` | Separate disposable PostgreSQL database, name must contain `test`       |

### Verification

Server integration tests use real PostgreSQL and delete only the test users/documents they create. Never point the test URL at valuable data. Apply migrations to the test database first.

The server suite uses Vitest/Supertest against PostgreSQL. Client tests use Vitest/jsdom with mocked requests to verify autosave ordering, retry, navigation protection, and the typed API client. `npm test` runs both workspaces; use `npm test --workspace client` or `npm test --workspace server` to run them separately.

PowerShell:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:54329/folio_test?schema=public'
npm run db:migrate
Remove-Item Env:DATABASE_URL
npm run check
```

macOS/Linux:

```sh
DATABASE_URL='postgresql://postgres:postgres@localhost:54329/folio_test?schema=public' npm run db:migrate
npm run check
```

`npm run check` runs ESLint, TypeScript, production builds, and Vitest/Supertest. Stop the development servers while doing the final production verification. `npm run format` formats project-owned files. The `.docx` integration fixture is in `server/test/fixtures/`.

Production locally:

```sh
npm run build
npm start
```

Open **http://localhost:3001**. The compiled server serves built assets and SPA routes. Health check: `GET /api/health`, returning 200 only when PostgreSQL is reachable. Stop the dev API before starting the production server on the same port.

## API

All responses are JSON except 204 deletes and the SPA. Errors use `{ "error": { "code": "FORBIDDEN", "message": "…" } }`. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint                                                  | Purpose                                   |
| ------ | --------------------------------------------------------- | ----------------------------------------- |
| GET    | `/api/health`                                             | Database readiness                        |
| GET    | `/api/auth/users`                                         | Four bounded demo profiles                |
| POST   | `/api/auth/login`                                         | `{ userId }` → signed session             |
| GET    | `/api/auth/me`                                            | Current profile                           |
| GET    | `/api/documents?section=mine\|shared&q=&limit=12&cursor=` | Metadata page and `nextCursor`            |
| POST   | `/api/documents`                                          | `{ title, content? }`                     |
| POST   | `/api/documents/import`                                   | Multipart field `file`, single file       |
| GET    | `/api/documents/:id`                                      | One document with HTML and effective role |
| PATCH  | `/api/documents/:id`                                      | `{ title?, content? }`                    |
| DELETE | `/api/documents/:id`                                      | Owner-only permanent deletion             |
| GET    | `/api/documents/:id/shares?limit=10&cursor=`              | Owner-only collaborator page              |
| PUT    | `/api/documents/:id/shares`                               | Owner upsert by `{ email, role }`         |
| PATCH  | `/api/documents/:id/shares/:shareId`                      | Owner changes `{ role }`                  |
| DELETE | `/api/documents/:id/shares/:shareId`                      | Owner revokes access                      |

Share role values: `EDITOR`, `VIEWER`; computed document roles also include `OWNER`. No access returns 403; a nonexistent document returns 404. Unknown inputs are rejected. General API limit: 180 requests/minute/IP; imports: 10/minute/IP. A deployment behind a proxy trusts one proxy hop, matching Render; adjust this if your infrastructure differs.

## Deploy to Render + Neon (free tiers)

1. Create a Neon project and database. Copy its PostgreSQL URL including TLS options. Keep production and test databases separate.
2. Push this repository to your Git hosting account.
3. In Render, create a Blueprint from the repo using `render.yaml`. It selects one free Node Web Service.
4. Set `DATABASE_URL` to the Neon URL when prompted. The Blueprint generates `JWT_SECRET`, sets Node and production mode, builds both workspaces, then runs migrations and the idempotent seed during service startup.
5. Wait for `/api/health` to pass. Open the Render URL and follow `docs/MANUAL_TEST.md`.
6. Put the live URL in `SUBMISSION.md`, capture the listed screenshots, and record your walkthrough.

Migrations run at startup because free Render services do not provide the paid-service pre-deploy step. For this single-instance take-home, Prisma migration locking and idempotent seeding are sufficient; separate release migrations for a larger deployment. Free Render instances may sleep after inactivity and take time to start, and Neon can also need a warm-up. The first request can therefore be slow; the UI exposes loading and retry states. Free plans and limits may change—verify the linked provider documentation before deployment.

References: [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Render free services](https://render.com/docs/free), [Neon connection setup](https://neon.com/docs/connect/connect-from-any-app), [Tiptap React](https://tiptap.dev/docs/editor/getting-started/install/react).

## Known limitations

- Concurrent editing is **last-write-wins per changed field**. Local requests are serialized, but other sessions are not synchronized live. Reopen to see permission changes or edits from other sessions. Revoked writes fail on the server and leave local edits visible for recovery.
- Pagination is a live updated-time cursor, not a snapshot. Concurrent changes can move rows between pages; refresh the list to reconcile. The browser deduplicates displayed pages.
- File/content limits intentionally bound editor memory and save cost. ZIP checks, worker limits, and a timeout reduce import resource exhaustion but are not a general document sandbox.
- No offline storage/recovery. Closing/reloading with unsaved edits prompts the browser, but browser crashes or forcing a close can lose those edits. Keep the tab open and retry after network failure.
- Mock profiles and public profile selection are evaluation features, not production security.
- No live deployment is claimed until the Neon/Render account steps have been completed.

## Deprioritized

Real-time cursors/CRDT, comments, version history, real authentication/signup, docx export, image embedding, and offline mode are explicitly out of scope. PDF export generates the file in the browser.
