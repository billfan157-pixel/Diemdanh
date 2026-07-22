# TODO.md - Fix SyncEngine Critical Issues

## Step 1: Add `applyFromNetwork()` + `onMutation()` to StateManager
- [x] Thêm method chính thức để SyncEngine dùng, không cần `(sm as any)`
- [x] File: `src/ui/StateManager.ts` — added `applyFromNetwork()`, `onMutation()`, `getUndoStack()`

## Step 2: Write tests for SyncEngine BEFORE refactoring
- [x] File mới: `tests/unit/sync-engine.test.ts`
- [x] Test insert/update/delete operations
- [x] Test conflict detection
- [x] Test mergeRecordLocally
- [x] Test queue processing

## Step 3: Refactor SyncEngine.setStateManager()
- [x] File: `src/services/sync/SyncEngine.ts`
- [x] Replace `(sm as any).mutate = ...` with event-based tracking
- [x] Use `StateManager.subscribe()` to track state changes

## Step 4: Refactor SyncEngine.mergeRecordLocally()
- [x] File: `src/services/sync/SyncEngine.ts`
- [x] Use `applyFromNetwork()` instead of `(sm as any).mutate()`
- [x] Remove hardcoded score keys, use `resolveClassColumns()`

## Step 5: Refactor SyncManager.pull()
- [x] File: `src/services/sync/SyncManager.ts`
- [x] Use `applyFromNetwork()` instead of `(sm as any).mutate()`
- [x] Remove hardcoded score keys

## Step 6: Write tests for SyncManager
- [x] File mới: `tests/unit/sync-manager.test.ts`
- [x] Test pull, push, sync flow
- [x] Test conflict event propagation

## Additional Critical Fixes Completed
- [x] Remove hardcoded Supabase key from `src/services/SupabaseClient.ts`
- [x] Update Supabase schema with relational tables (classes, students, scores, learning_logs)
- [x] Create logging service to replace console.log
- [x] Cleanup console logs in codebase
- [x] Add retry logic utility for network operations

## Verification
- [x] Run `npm test` - no regression (SyncEngine: 14 passed, SyncManager: 11 passed)
- [x] Run `npm run typecheck` - type safety
- [ ] Manual sync flow test
