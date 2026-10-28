# Assignment QA audit

Audit date: 2026-10-28 (Asia/Karachi). Baseline commit: `ed67fad`.

This baseline was recorded before application fixes. Verification used three newly created UTF-8 PostgreSQL databases: a freshly migrated/seeded API/UI database, a separate test database, and a fresh README setup database. The clean checkout was created from committed files with `git clone --no-hardlinks`; the existing working directory and its application database were not used for the README setup check. Playwright 1.64.1 ran headless Chromium. No real user documents or production database were modified.

## Step 1 — exact baseline command results

| Command                       | Result                         | Evidence                                                                |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `npm install`                 | PASS, exit 0                   | Up to date; audited 647 packages; 0 vulnerabilities.                    |
| `npm run lint`                | PASS, exit 0                   | ESLint completed with no errors or warnings.                            |
| `npm run typecheck`           | PASS, exit 0                   | Client and server TypeScript checks completed; Prisma client generated. |
| `npm run build`               | PASS, exit 0                   | Both client Vite build and server Prisma/TypeScript build completed.    |
| `npm test --workspace client` | FAIL, exit 1                   | `Missing script: "test"`; no client suite exists.                       |
| `npm test --workspace server` | PASS, exit 0                   | 3 test files, 19/19 tests, 9.62 seconds.                                |
| `npm test`                    | PASS with coverage gap, exit 0 | 19/19 tests, 8.37 seconds; root script invokes only the server suite.   |

An initial PowerShell command-loop harness invoked npm incorrectly (`Unknown command: "pm"`). Those were harness errors, not application results; every command above was rerun directly. Likewise, the first standalone API probe raced server startup and received ECONNREFUSED; all reported API checks ran after health returned 200.

## Step 2 — baseline assignment checklist

| Requirement                                                         | Status                         | One-line evidence                                                                                                                                                           |
| ------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create, rename, edit, refresh, persist                              | PASS                           | API POST 201/PATCH 200/GET persisted fields; actual browser reload retained edited title and text.                                                                          |
| Bold, italic, underline, H1/H2/H3, bullet/numbered lists persist    | PASS                           | Direct PostgreSQL row contains `strong/em/u/h1/h2/h3/ul/ol`; each toolbar control was also saved and checked after browser reload.                                          |
| Saving → Saved; failed-save error                                   | PASS                           | A delayed real PATCH exposed Saving then Saved; injected HTTP 500 displayed Save failed and an alert; Retry persisted the retained edits.                                   |
| TXT, Markdown, DOCX create named new documents                      | PASS                           | Each returned 201 with a new UUID, filename-derived title, and preserved fixture text/formatting.                                                                           |
| PDF and EXE rejected clearly                                        | PASS                           | Both returned 400 `UNSUPPORTED_FILE`, naming the supported formats.                                                                                                         |
| Oversized upload rejected                                           | PASS                           | 2,097,153-byte TXT returned 413 with a clear 2 MB message.                                                                                                                  |
| Imported script/onerror sanitized                                   | PASS                           | Markdown containing script, image/onerror, and onclick returned stored HTML without those tags/attributes.                                                                  |
| Supported types and limit in UI and README                          | PASS                           | Browser import dialog lists `.txt, .md, .docx` and `Up to 2 MB`; README specifies formats and 2 MiB byte limit.                                                             |
| Owner grants Viewer/Editor, changes and revokes                     | PASS                           | Seeded Bob's share was created, upgraded, downgraded, and revoked; subsequent access reflected each change.                                                                 |
| Viewer GET; PUT/PATCH/DELETE/share denied; read-only UI             | FAIL                           | GET 200 and PATCH/DELETE/share 403; browser noneditable/disabled controls pass, but PUT returns 404 instead of requested 403.                                               |
| Editor GET/update; share/delete denied                              | PASS                           | API GET/PATCH 200 and share/delete 403; upgraded Bob edited through the browser and persisted after reload.                                                                 |
| Unshared GET/PUT 403; nonexistent document 404                      | FAIL                           | Carol GET existing 403 and nonexistent UUID 404 pass; PUT existing returns 404 instead of requested 403.                                                                    |
| Only owner shares/deletes                                           | PASS                           | Viewer and Editor sharing/deletion attempts returned 403; owner deletion returned 204 and subsequent GET 404.                                                               |
| Self/unknown-email share rejected; duplicate share updates          | PASS                           | Self-share 400; unknown email 404; duplicate email retains the same share UUID and exactly one row while updating role.                                                     |
| Own/shared sections visibly separate with role badges               | PASS                           | Playwright verified both tabs and Owner/Viewer badges; API lists also separate owned/shared documents.                                                                      |
| Missing/tampered token returns 401                                  | PASS                           | Both protected document requests returned 401 `UNAUTHENTICATED`.                                                                                                            |
| Empty/oversized titles and malformed payloads return consistent 400 | PASS                           | Six invalid payloads, including malformed JSON, returned `{error:{code,message}}` with HTTP 400.                                                                            |
| No stack traces leak in errors                                      | PASS                           | Validation/auth/access errors contain no stack; an actual temporary QA-only missing-table error returned generic INTERNAL 500 JSON, then the table was restored.            |
| README setup works from clean clone                                 | FAIL on first verification run | Install/migrate/seed/dev/proxy pass; initial `npm run check` failed one TXT import (422 vs 201 at 10.042 s); warm server rerun passed 19/19.                                |
| Architecture/workflow/submission/env examples/Render YAML exist     | PASS                           | All are tracked; environment examples are `client/.env.example` and `server/.env.example`.                                                                                  |
| No unused dependencies                                              | FAIL                           | Server directly declares `pg`, imports no `pg` API, and already receives `pg` from `@prisma/adapter-pg`'s dependencies.                                                     |
| No core TODOs/stubs                                                 | PASS                           | No TODO/FIXME matches in client/server core or Prisma/scripts; personal workflow and live-URL placeholders remain in the requested documents.                               |
| No secrets committed                                                | PASS, scoped static check      | Only example env files are tracked; six-commit signature scan found no private-key/GitHub-token/API-key signatures; this is not proof against every possible secret format. |

## Additional browser and clean-checkout evidence

- **12/12 Playwright checks passed**: login/collections, persistence/autosave, inline marks, headings, lists, failure/retry, owner share dialog, Viewer restrictions, Editor upgrade/editing, upload helper text, 375 px layout, and absence of uncaught runtime errors.
- The first browser script incorrectly targeted a trailing empty paragraph for heading/list actions. After moving the caret to the text before applying formatting, both checks passed. No application code was changed to resolve those harness errors.
- Clean checkout `npm ci`: exit 0; 644 packages added, 647 audited, 0 vulnerabilities. Installation took approximately 8 minutes on this Windows filesystem and emitted an ESLint deprecation notice.
- Fresh README database: one migration applied; seeding twice left **4 users, 2 documents, 1 share**.
- Clean checkout initial `npm run check`: lint/typecheck/build passed; **18 tests passed, 1 failed**. TXT import expected 201 and received 422 after 10.042 seconds. Total suite duration 43.72 seconds; module import time 24.29 seconds.
- Warm clean-checkout server rerun: **19/19 passed**, 9.77 seconds. The cold failure is retained as an intermittent reliability finding, not erased by retry success.
- Literal development startup: `npm run dev` started Vite at 5173 and API at 3001; Vite served the React entry, `/api/auth/users` proxied four seeded users, and API health returned 200.

## Findings before fixes

1. **Missing client coverage:** no client test command and root tests omit the client.
2. **PUT denial contract:** unsupported document PUT falls through to 404 before enforcing the expected edit access denial. This is a status-contract failure, not an authorization bypass.
3. **Cold import reliability:** a freshly installed worker can hit the existing 10-second whole-worker deadline during startup. The observed timing is consistent with cold module-loading overhead; warm runs pass.
4. **Redundant dependency:** server's direct `pg` declaration is unused; the adapter provides its driver dependency.

No product feature additions are authorized by this audit. Fixes and their individual rerun results will be appended after the baseline report.

## Not verified / remaining external scope

- Actual Neon/Render deployment and cold start on those providers; no live URL is configured in the submission.
- Exhaustive assistive-technology compatibility, multi-browser behavior, load testing, and absence of every possible credential format.
- Document concurrency remains the explicitly documented last-write-wins design; genuine authentication and real-time collaboration are outside assignment scope.

## Fix log

### 1. PUT denial contract

Added an authorization guard for the existing unsupported PUT path. Viewer/unshared callers now receive 403, missing documents 404, and authorized callers 405 with instructions to use PATCH. PUT editing was not added. Regression coverage also confirms rejected PUT does not mutate the document.

Validation: `npm run check` exited 0; lint/typecheck/build passed; server tests **20/20 passed**. The standalone HTTP audit rerun passed **22/22**, including both original failures.

### 2. Client test coverage

Added a Vitest/jsdom client suite and included both workspaces in root `npm test`. Initial client run: **10 passed, 1 failed**. The failure exposed cancellation classification across JavaScript realms: the API catches only `instanceof Error` named AbortError, so jsdom's DOMException is replaced by an ApiError. A headless Chromium probe confirmed its native DOMException/fetch abort currently are Error instances, so this is a cross-realm robustness failure rather than a reproduced Chromium UI failure. The regression remained enabled; the separate follow-up fix is recorded below.

Validation after this coverage-only change: lint/typecheck/build passed; client **10/11** and server **20/20**. Root `npm run check` correctly exited 1 for the newly exposed client failure.

### 3. Cross-realm cancellation and timeout errors

Changed API error classification to inspect standard AbortError/TimeoutError names independently of `instanceof Error`. This preserves intended cancellation/timeout behavior across realms without adding a feature. Added a timeout DOMException regression alongside the existing cancellation case.

Validation: `npm run check` exited 0; lint/typecheck/build passed; client **12/12**, server **20/20**.

### 4. Cold import startup

Separated bounded worker startup (30 seconds) from actual conversion (still 10 seconds), using a worker readiness message after module initialization. Both paths terminate expired workers; early worker exit now rejects immediately. Memory/concurrency/file-size limits are unchanged. Added four deterministic fake-clock lifecycle tests and increased the integration test ceiling to cover the maximum bounded worker lifetime.

Validation: `npm run check` exited 0; lint/typecheck/build passed; client **12/12**, server **24/24**. The lifecycle regression explicitly models 29 seconds of startup followed by 9 seconds of valid conversion without waiting in real time; separate cases verify both deadlines still terminate workers.

### 5. Redundant PostgreSQL dependency

Removed only the server's direct `pg` declaration. The required driver remains provided by `@prisma/adapter-pg`. `npm uninstall pg --workspace server` exited 0 and audited 688 packages with 0 vulnerabilities; application behavior is unchanged.

Validation: lint/typecheck/build passed; client **12/12**, server **24/24**. `npm ls pg --workspace server` shows the driver only under the Prisma adapter. `npm audit` reports **0 vulnerabilities**.

## Final runtime verification

The rebuilt server was restarted before these checks so the worker readiness protocol and API guards were tested together. **22/22 live HTTP checks passed using Supertest against the running app**, and **13/13 headless Playwright checks passed**. The same API checks were also independently repeated using native HTTP fetch. No product features were added.

The additional keyboard case verifies actual Ctrl/Meta+B/I/U and Z/Shift+Z, followed by save/reload. Its first harness attempted to append while an AllSelection was still active and therefore replaced the sample text; explicitly collapsing selection corrected the test. Heading/list targeting was also made deterministic by clicking the actual sample text rather than relying on Ctrl+Home from a trailing empty paragraph. No application changes were made for these harness issues.

| Assignment item                           | Final status | Evidence                                                                                                                          |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Create/rename/edit/refresh persistence    | PASS         | Browser reload and subsequent API GET retain both fields.                                                                         |
| All requested rich-text formatting        | PASS         | PostgreSQL and browser reload checks contain strong/em/u/h1/h2/h3/ul/ol.                                                          |
| Formatting and history keyboard shortcuts | PASS         | Actual Ctrl/Meta B/I/U and Z/Shift-Z work; formatted text survives reload.                                                        |
| Autosave and error feedback               | PASS         | Saving → Saved observed; injected 500 shows error; Retry persists retained edits.                                                 |
| TXT/MD/DOCX import                        | PASS         | All three live uploads return 201, distinct new documents, filename titles, and expected text/formatting.                         |
| Unsupported PDF/EXE                       | PASS         | Both return clear 400 errors naming allowed types.                                                                                |
| Oversized file                            | PASS         | One byte above 2 MiB returns 413.                                                                                                 |
| Import sanitization                       | PASS         | Script, onerror, and onclick are absent from stored/returned imported HTML.                                                       |
| Types/limit in UI and README              | PASS         | Browser dialog and README explicitly state formats and size limit.                                                                |
| Owner grant/change/revoke                 | PASS         | Role upsert, downgrade, revoke, and subsequent access all pass.                                                                   |
| Viewer API restrictions and read-only UI  | PASS         | GET 200; PUT/PATCH/DELETE/share 403; editor/title/toolbar noneditable or disabled.                                                |
| Editor read/update; no share/delete       | PASS         | API and upgraded Bob's browser edit pass; management actions remain forbidden.                                                    |
| Unshared/missing access                   | PASS         | Existing private GET/PUT 403; nonexistent document 404.                                                                           |
| Only owner shares/deletes                 | PASS         | Non-owner mutations 403; owner deletion 204 and follow-up GET 404.                                                                |
| Invalid/duplicate sharing                 | PASS         | Self-share 400, unknown email 404, duplicate UUID unchanged with one updated row.                                                 |
| Separate own/shared views and badges      | PASS         | Visible collection tabs and Owner/Viewer badges checked in Chromium.                                                              |
| No/tampered token                         | PASS         | Both protected requests return 401.                                                                                               |
| Invalid title/payload validation          | PASS         | Six invalid payloads return consistent JSON 400 errors.                                                                           |
| No error-response stack traces            | PASS         | Validation/access responses and a real generic 500 database-error response contain no stack.                                      |
| Required documentation/config files       | PASS         | Tracked docs, both environment examples, and render.yaml present.                                                                 |
| Unused dependencies/core TODOs/secrets    | PASS, scoped | Redundant dependency removed; core scan clean; no tracked real env or matching credential signatures.                             |
| README final clean-install verification   | PASS         | Fresh npm ci, two new databases, migrations/seed, full check, and production startup all pass on the first final-install attempt. |

Current automated suites: **12 client tests + 24 server tests = 36 passing tests**. Provider deployment, other browser engines, exhaustive accessibility, and load testing remain outside verified scope.

## Final clean-checkout rerun

Only the audited QA changes were applied to the isolated checkout; private environment files and user notes were not copied from the working directory. Dependencies were removed/reinstalled by npm ci, and two additional empty PostgreSQL databases were created for this final run.

| Command/check                           | Exact final result                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                | Exit 0; 685 packages added, 688 audited, 0 vulnerabilities; approximately 7 minutes on this Windows filesystem. |
| `npm run db:migrate` (application DB)   | Exit 0; initial migration applied to a new empty database.                                                      |
| `npm run db:seed`                       | Exit 0; exactly 4 users, 2 documents, 1 share.                                                                  |
| `npm run db:migrate` (separate test DB) | Exit 0; initial migration applied to a second new empty database.                                               |
| `npm run check`                         | Exit 0; ESLint, both TypeScript checks, both builds, and both complete test suites passed.                      |
| Client suite in that cold checkout      | 2 files, 12/12 passed; 37.14 seconds including cold jsdom initialization.                                       |
| Server suite in that cold checkout      | 4 files, 24/24 passed; 44.85 seconds including cold module/worker initialization.                               |
| `npm start` and production HTTP smoke   | Startup succeeded; health and SPA deep link 200; gzip/immutable JavaScript; missing asset 404.                  |
| `git diff --check`                      | Exit 0; no whitespace errors.                                                                                   |

The original first-run TXT import failure is resolved by the bounded startup/conversion split; it did not recur in this fresh dependency/database run. This is evidence for the observed environment, not a guarantee against every host stall. Credential-signature checks were also repeated on the final working tree with no findings; only example env files are tracked.
