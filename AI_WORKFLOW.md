# AI workflow — author completion required

These sections are intentionally left for the submission author. They do not assert personal tool usage or decisions on your behalf.

## Tools used

TODO: List the tools/models you actually used and their purpose.

## Where AI sped me up

TODO: Describe specific tasks where AI helped, with examples you can explain.

## What I changed or rejected

TODO: Record recommendations you modified or rejected and why.

## How I verified

TODO: Record the checks you personally ran, their results, and any failures you investigated.

### Verification checklist

- [ ] Run `npm ci` from a clean checkout.
- [ ] Create separate application/test PostgreSQL databases and apply migrations.
- [ ] Run the seed twice; confirm it is non-destructive and idempotent.
- [ ] Run `npm run check` and inspect the output.
- [ ] Follow `docs/MANUAL_TEST.md` including role changes and failed saves.
- [ ] Inspect browser Network requests for bounded metadata-only list pages.
- [ ] Test actual `.txt`, `.md`, and `.docx` imports, invalid files, and the 2 MB limit.
- [ ] Verify formatting survives refresh, viewers cannot edit, and private URLs return 403 for other profiles.
- [ ] Deploy using `render.yaml`, verify health, and repeat the smoke test on the live URL.
- [ ] Capture screenshots and record the walkthrough.
- [ ] Review and explain authorization, sanitization, save ordering, and the concurrency limitation.
