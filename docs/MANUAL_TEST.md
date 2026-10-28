# Manual walkthrough

Use a freshly seeded database so sample permissions match these instructions. For role changes across users, reopen the document to refresh its permissions.

1. Open the app; choose **Alice**, then **Enter workspace**. Confirm two cards, owner details, updated timestamps, Owner badges, and separate **My documents** and **Shared with me** tabs.
2. Create a document. Rename it inline. Write a paragraph and try Bold, Italic, Underline, all three heading levels, both list types, undo, and redo. Verify active buttons and keyboard shortcuts (`Ctrl` / `⌘` + B/I/U/Z, Shift+Z for redo).
3. Wait for **Saved**. Refresh and verify title, text, formatting, and lists survive. Record the document URL for later steps.
4. Return to the workspace. Import a `.docx` (the test fixture is usable), then a `.txt` and `.md`. Verify each creates a new document, uses the filename as title, preserves supported formatting, and has no embedded scripts/images. Try `.pdf`, an empty file, and a file over 2 MB; verify clear errors.
5. Open the newly created document as Alice. Share with `bob@example.com` as **Viewer**. Confirm the collaborator list. Copy the link; confirm copying alone does not grant access.
6. Switch user to **Bob**. Open **Shared with me**, then the document. Confirm read-only label, disabled title/toolbar, no Share/Delete controls, and that typing/keyboard shortcuts cannot change it. In an API client, PATCH as Bob must return 403.
7. Switch to **Alice**, open the document, and change Bob to **Editor**. Switch back to **Bob** and reopen. Edit text and title, wait for Saved, refresh, and verify persistence. Bob must still be unable to share/delete.
8. Switch to **Carol** and paste the recorded URL. Confirm a permission error; no document text should load. Use a nonexistent UUID URL to confirm a not-found error.
9. As Alice, revoke Bob. As Bob, reopen to confirm access is denied. If Bob already has an open editor, the next attempted save must fail without discarding his unsaved text.
10. On a document Alice owns, temporarily disconnect the network (browser DevTools), type, and verify a clear save error with **Retry**. Restore the connection, retry, wait for Saved, refresh. Navigate away while changes are pending and verify **Keep writing / Discard & leave / Save & leave**.
11. Search by part of a title in the workspace; verify database-filtered results and a useful no-results state. With over 12 documents, use **Load more documents** and inspect Network: each page is bounded and contains no document HTML.
12. At approximately 375 px viewport width, confirm cards, dialogs, editor, and scrollable toolbar remain usable by keyboard and touch. Verify focus indicators and accessible labels.
13. As the owner, delete a disposable document through its confirmation dialog; confirm the list updates after navigation and the old URL is not found. Cancel deletion on a second document and confirm it remains.
14. Repeat the critical flow on the Render URL, including after a cold start. Record the video only after that validation.

## Steps requiring your accounts

- [ ] Create a Neon database (plus a separate disposable test database).
- [ ] Set the production database URL on Render; keep the generated JWT secret server-only.
- [ ] Deploy the repository with the Blueprint and verify `/api/health`.
- [ ] Update the submission URL and fill in your AI workflow notes.
- [ ] Capture screenshots, record the walkthrough video, and submit.
