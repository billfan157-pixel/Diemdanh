---
name: testing-diemdanh
description: Test the Sổ Điểm Giáo Lý static app end-to-end (login/PIN, classes, scores, sync, backups). Use when verifying UI or auth/sync/backup changes in this repo.
---

# Testing Diemdanh (Sổ Điểm Giáo Lý)

## Run the app
- Static app, no build: `python3 -m http.server 8080` in repo root, open `http://localhost:8080/index.html`.
- Unit tests: `npm test` (Vitest, happy-dom). Lint: `npm run lint`.

## Isolate from production cloud (IMPORTANT)
- The app syncs a single snapshot to Supabase with a public anon key — testing with the real key can overwrite real parish data.
- Before testing, set an invalid key so all cloud ops fail safely: `localStorage.setItem('giao-ly-supabase-anon-v2','invalid-key-disable-sync')`. The app keeps working offline and shows "Invalid API key".

## Resetting state — auto-save gotcha
- The app auto-saves state, score history, AND authStore on `beforeunload`/`pagehide`/every 30s (`src/core/history.js` → `setupAutoSave`).
- A plain `localStorage.clear()` followed by reload gets UNDONE: the flush re-writes the in-memory store during unload.
- Workaround: in the same evaluate, stub the savers before clearing, then reload:
  ```js
  GL.saveAuthStore = function(){}; GL.saveState = function(){}; GL.saveScoreHistory = function(){};
  localStorage.clear();
  localStorage.setItem('giao-ly-supabase-anon-v2','invalid-key-disable-sync');
  location.reload();
  ```
- Also delete IndexedDB backups if needed: `indexedDB.deleteDatabase('giao-ly-auto-backup')`.
- Close stale tabs of the app before testing — a second tab can re-save old state too.

## Golden-path scenarios
1. **Legacy PIN migration**: fresh state → login `admin`/`1234` → hash should become `pbkdf2$150000$...` (check `GL.authStore.users[0].pinHash`), `pinPlain` must be absent, and the forced PIN-change modal must appear (weak PIN detected). Note: `GL.login` is async.
2. **Class/student/scores**: create class (sidebar), add student ("Thêm HV"), enter scores in ĐG/1T columns → TB updates (weighted average). If `GL.createStudent is not a function` appears, the utils restore might have regressed.
3. **User management**: "👥 Tài khoản GLV" → create GLV account; list must show "PIN: đã mã hóa" and never plaintext digits.
4. **Cloud sync modal**: "☁️ Đồng bộ cloud" → field "Mã bảo vệ giáo xứ" (`#syncParishKey`); saving stores it under `giao-ly-parish-key-v1` and it is sent as `x-parish-key` header.
5. **Auto-backup**: `await GL.autoBackupList()` → snapshots with `valid: true` and correct class/student counts. Force one with `await GL.autoBackupNow()`.
6. **Relogin**: logout, reload, old PIN must be rejected ("Sai tài khoản hoặc PIN."), new PIN logs in without force-modal; data persists.

## Things that may be untestable locally
- Real cloud sync with parish key requires running `supabase/secure-policies.sql` in Supabase with a real secret (manual user step). Realtime may not work with the custom header; manual pull/push is the fallback.

## Devin Secrets Needed
- None for offline testing. Real cloud sync testing would need a Supabase anon key and the parish secret (do not use production data for write tests).
