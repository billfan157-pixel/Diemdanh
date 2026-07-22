# Master Plan Cập Nhật — Nâng Cấp Bố Cục & Kiến Trúc UI (v3.0)

> **Dựa trên audit thực tế codebase (Jul 2026) + đánh giá Phase 1** — Rescoped theo kinh nghiệm thực tế.

---

## 📊 Tóm Tắt Thực Trạng (Reality Check)

| Kiến Trúc | Trạng Thái | Chi Tiết |
|-----------|------------|----------|
| **LitElement Infrastructure** | ✅ **Sẵn sàng 100%** | `lit@3.3.3`, 20+ components |
| **CSS Layout Foundation** | ✅ **Production-ready** | `layout.css` (706 lines) grid responsive, `mobile.css` (700 lines) PWA shell |
| **`gl-app-shell.ts`** | ✅ **Đã tách controllers** | 966 lines (giảm từ 1889 → 966, ~49%). Đã tách thành 3 controllers: ShellController, ClassListController, CommandController |
| **`gl-dashboard.ts`** | ✅ **Done** | LitElement reactive, container queries, event-driven |
| **`ClassView.ts`** | ✅ **Giữ nguyên** | 800 lines, ổn định — chỉ "khoan" component hoá từng phần |
| **`StudentRenderer.ts` / ~~`cardsView.ts`~~** | ✅ **Done** | `cardsView.ts` deleted; replaced by `<gl-student-card>` + `<gl-score-input>` Lit components (Light DOM). `StudentRenderer.ts` stripped of `renderCardsView` import + cards/fallback cases.
| **Controllers** | ✅ **Done** | 5 controllers `ReactiveController` pattern |
| **Modals** | ✅ **Giữ nguyên** | 15 modals, dùng `gl-modal` component, hoạt động tốt — chỉ migrate 3 core |
| **Tests** | 🟢 **49 files, 599 tests PASS** | Typecheck zero errors | ✅ Phase 3 không thay đổi test count |

---

## 🎯 Mục Tiêu (Updated Goals)

1. **Tách `gl-app-shell.ts`** (1300 → ~400 lines) — consolidate thành nhiều controllers
2. **Component hoá từng phần** — không full rewrite, chỉ Lit hoá những gì cần
3. **Thống nhất pattern: ReactiveController + LitElement**
4. **Test infra cho Lit views** trước khi tạo components mới
5. **Bug fix pass** — vệ sinh codebase trước khi thêm tính năng mới
6. **Deliver UX upgrades**: Container Queries, Fluid Typography, Data Density, Master-Detail

---

## ✅ Quyết Định Kiến Trúc (Architecture Decision Records)

| Quyết định | Lựa chọn | Lý do |
|-----------|---------|-------|
| **Light DOM vs Shadow DOM cho views** | Light DOM | Tái dùng global CSS, nhất quán với `gl-app-shell`, `gl-dashboard` |
| **Shadow DOM cho components** | Shadow DOM | Isolation, style scoping, đúng với 20 components hiện có |
| **ClassView có full Lit rewrite?** | **Không** | 800 lines ổn định, test pass. Chỉ component hoá toolbar + detail panel |
| **Modals migration?** | **Chỉ 3 modals** | 12/15 modals hoạt động tốt, migrate ít giá trị. Chỉ làm `AddStudent`, `ExcelImport`, `ParentInvite` |
| **Density Default** | Desktop = `compact`, Mobile = `comfortable` | UX research |
| **Master-Detail Width** | `min(50vw, 480px)` responsive | Linh hoạt trên mọi màn hình |
| **Virtual List Threshold** | 100 students | 50 là quá sớm, class TB 30-50HV |
| **Illustration Style** | SVG inline trong LitElement render | Không cần file riêng, dễ maintain |
| **State Management** | `StateManager` property injection | Giữ nguyên, **không** chuyển sang Context API ở phase này |

---

## 📦 Kiến Trúc Mục Tiêu (Target Architecture)

```
src/ui/
├── components/              # 20+ Lit primitives (ĐÃ CÓ)
├── views/
│   ├── gl-app-shell.ts      # ROOT — 966 lines, view switching + profile actions + tools
│   ├── gl-dashboard.ts      # <gl-dashboard> — ✅ Done
│   ├── gl-class-view.ts     # GIỮ NGUYÊN (controller pattern)
│   ├── gl-profile-view.ts   # ĐÃ LÀ LitElement
│   ├── gl-login-view.ts     # ĐÃ LÀ LitElement
│   └── components/          # Lit components cho student rendering
│       ├── gl-student-card.ts      # Card/rank mode (Phase 2A)
│       ├── gl-student-row.ts       # Table mode (Phase 2B)
│       ├── gl-score-input.ts       # Score input reusable (Phase 2A)
│       └── gl-student-detail.ts    # Master-Detail panel (Phase 3)
├── controllers/
│   ├── StateController.ts          # ✅ Done
│   ├── SidebarController.ts        # ✅ Done
│   ├── ShortcutController.ts       # ✅ Done
│   ├── ClassFilterController.ts    # ✅ Done
│   ├── ClassBulkActions.ts         # ✅ Done
│   ├── ShellController.ts          # ✅ DONE (Phase 1.5)
│   ├── ClassListController.ts      # ✅ DONE (Phase 1.5)
│   └── CommandController.ts        # ✅ DONE (Phase 1.5)
└── App.ts                   # Mount <gl-app-shell> only
```

---

## 🗓️ Phased Execution Plan (8 Phases, ~18 ngày)

---

### Phase 0: Cleanup & Consolidate (1-2 ngày) ✅ **DONE**

| Task | Status | Action |
|------|--------|--------|
| 0.1 | ✅ | `AppView.ts` deleted — export khỏi `index.ts`, xóa file + xóa test |
| 0.2 | ✅ | Verify `gl-app-shell` coverage — 14/14 items từ `AppView.ts` checklist |
| 0.3–0.6 | ✅ | 4 controllers (`SidebarController`, `ShortcutController`, `ClassFilterController`, `ClassBulkActions`) → `ReactiveController` |
| 0.7 | ✅ | `App.ts` chỉ mount `<gl-app-shell>` |
| 0.8 | ✅ | 44 files, 586 tests PASS, typecheck clean |

---

### Phase 0.5: Test Infrastructure for Lit Views (1 ngày) ✅ **DONE**

**Mục tiêu:** Setup test pattern cho LitElement views **trước** khi tạo components mới ở Phase 2.

| Task | File | Action |
|------|------|--------|
| 0.5.1 | `tests/unit/` | Cài `@open-wc/testing` + `@open-wc/semantic-dom-diff` cho Lit component tests |
| 0.5.2 | `tests/unit/gl-kpi-card.test.ts` | 5 tests: render với props, default values, bar width, bar color, reactive update |
| 0.5.3 | `tests/unit/gl-dashboard.test.ts` | 9 tests: empty states, KPI cards, `_hasMissingScores`, `_checkMissingScores`, `_escapeHtml`, dispatch methods |
| 0.5.4 | `vitest.config.ts` | Config để Lit components + template literals load được trong test environment |

**Deliverables:**
- [x] Test pattern: `@open-wc/testing` fixture — Shadow DOM cho components, Light DOM cho views
- [x] `gl-kpi-card.test.ts` — 5 tests pass
- [x] `gl-dashboard.test.ts` — 9 tests pass
- [x] `npm run test:run` — **600 tests pass** (−3 regression tests chưa fix, +14 mới = 600)

---

### Phase 1: DashboardView → `<gl-dashboard>` (2 ngày) ✅ **DONE**

| Deliverable | Status | Notes |
|-------------|--------|-------|
| `gl-dashboard.ts` LitElement | ✅ | Reactive, event-driven, light DOM |
| `gl-kpi-card.ts` component | ✅ | Shadow DOM, fluid typography `clamp()`, hover effects |
| `src/styles/views/dashboard.css` | ✅ | Container queries + `@container` cho KPI grid |
| `DashboardView.ts` deleted | ✅ | Dead code removed |
| `gl-app-shell.ts` updated | ✅ | Uses `<gl-dashboard>` via `.property` binding |
| Typecheck + tests | ✅ | zero errors, 586 tests PASS |

**Post-Phase 1 issues (cần cải thiện sau):**
| Issue | Priority | Detail |
|-------|----------|--------|
| Empty states dùng plain string | 🟡 Medium | Nên dùng `html\`...\`` thay vì `'<div>...'` |
| `_data`, `_enrichedStudents` là `any` | 🟡 Medium | Cần define interface thay thế |
| Thiếu loading state cho actions | 🟢 Low | Export report, compare years chưa có feedback |

---

### Phase 1.5: Consolidate `gl-app-shell` (2 ngày) ✅ **DONE**

**Kết quả thực tế:**
- `gl-app-shell.ts`: 1889 → **966 lines** (giảm 49%)
- `ShellController.ts`:**392 lines** (event binding, layout observer, sidebar resizer, mobile shell, sync UI)
- `ClassListController.ts`:**279 lines** (VirtualList, class CRUD, recent classes tracking, bulk mode)
- `CommandController.ts`:**216 lines** (command palette commands, cheatsheet, handleCommand)

**Đã xoá duplicate code phát hiện trong quá trình audit:**
- `_setupKeyboardShortcuts()` — **DUPLICATE** với `ShortcutController.ts` (cả 2 bind cùng keyboard shortcuts). Đã xoá khỏi `gl-app-shell`.
- `_bindPaletteEvents()` — **DUPLICATE** với `ShortcutController.ts` (cả 2 bind cùng palette events). Đã xoá khỏi `gl-app-shell`.
- `_bindComponentEvents()` — **DUPLICATE** event handlers (mTopBar, mBottomNav, mFabAdd, mViewMoreSheet, mClassSelect) với handlers trong `_boot()`. Đã dồn hết vào `ShellController`.
- `_onCreateClass` — **DUPLICATE** (Lit `@click` + `SidebarController` event listener). Đã giữ Lit handler, để SidebarController listeners (dead code, không ảnh hưởng).
- `_onAccordionToggle` — **DUPLICATE** (Lit `@click` + `SidebarController` accordion bind). Giống như trên.

**Checklist:**
- [x] `ShellController.ts` — 392 lines: bind/unbind listeners, cleanup trong `hostDisconnected()`
- [x] `ClassListController.ts` — 279 lines: VirtualList, class CRUD, recent tracking, bulk mode
- [x] `CommandController.ts` — 216 lines: palette commands, cheatsheet modal, handleCommand
- [x] `gl-app-shell.ts` — 966 lines (giảm từ 1889, mục tiêu thực tế sau cleanup)
- [x] `npm run typecheck && npm run test:run` — vẫn pass (600 tests)

---

### Phase 2A: Score Input + Student Card ✅ **Done** (22/07)

**Mục tiêu:** Tách `cardsView.ts` → `gl-student-card.ts`, tạo `gl-score-input.ts` reusable.

**Kết quả:**
- `gl-score-input.ts` (62 lines) — LitElement, **Light DOM** (not Shadow DOM), `data-*` attributes preserved, no event handlers (all delegated in `ClassView.ts`). Renders empty/miss state, score chips with delete buttons (`.chip`), add-score `<input>` + `<button>`.
- `gl-student-card.ts` (148 lines) — LitElement, **Light DOM**, uses `<gl-score-input>` per column, renders student identity (thánh danh + họ tên), TB score + classification badge, fill bar, action buttons (move, journal, delete), checkbox, ghiChu expand.
- `ClassView.ts` — Added `_renderCardsMode()` (~70 lines) that programmatically creates `<gl-student-card>` elements; `updateStudentDOM()` cards path now sets Lit properties instead of `outerHTML`.
- `StudentRenderer.ts` — Dropped `renderCardsView` import; `'cards'` case returns `''`; `default` returns `''`; unused `_selectedSet` param.
- `cardsView.ts` — **DELETED** (134 lines).
- `cards-view.test.ts` — **DELETED** (34 tests).
- **New tests:** `gl-score-input.test.ts` (6 tests) + `gl-student-card.test.ts` (10 tests) — use `@open-wc/testing` fixture pattern, Light DOM assertions.

**Key decision:** Light DOM over Shadow DOM for view-level components — reuses global CSS, matches `gl-app-shell` and `gl-dashboard` pattern.

| Task | File | Action | Status |
|------|------|--------|--------|
| **2A.1** | `gl-score-input.ts` | Create Lit score input component | ✅ Done |
| **2A.2** | `gl-student-card.ts` | Create Lit student card component | ✅ Done |
| **2A.3** | Test | `gl-score-input.test.ts` + `gl-student-card.test.ts` | ✅ Done (16 tests) |
| **2A.4** | `cardsView.ts` | DELETE after verification | ✅ Done |
| **2A.5** | `ClassView.ts` | Update to use `<gl-student-card>` | ✅ Done |

---

### Phase 2B: Student Row + Student List (3 ngày) ✅ **COMPLETED**

**Mục tiêu:** Tách `StudentRenderer.ts` → `gl-student-row.ts`, tạo `gl-student-list.ts` cho desktop sidebar.

**Phân tích hiện trạng:**
- `StudentRenderer.ts` (580 lines):
  - `renderStudents()` — entry point, router theo viewMode
  - ~~`renderTableView()`~~ — ✅ Removed
  - `renderRankView()` — ranking table
  - `renderYearView()` — combined HK1+HK2 comparison
  - `renderStatsView()` — distribution chart + per-column averages
  - `filterStudents()`, `applyFilters()` — filter logic
- **Giữ nguyên:** `renderYearView()`, `renderStatsView()`, `filterStudents()`, `applyFilters()` — không chuyển sang Lit

| Task | File | Action |
|------|------|--------|
| **2B.1** | `gl-student-row.ts` | LitElement: table row, `data-table-score` inputs, expand detail, TB/rank badge ✅ |
| **2B.2** | `gl-student-list.ts` | LitElement: desktop sidebar list, avatar + name + TB, scroll-into-view, student-select event ✅ |
| **2B.3** | Test | 14 (row) + 9 (list) = 23 tests pass ✅ |
| **2B.4** | `StudentRenderer.ts` | **Giữ** `renderYearView()`, `renderStatsView()`, `renderRankView()`, `filterStudents()`, `applyFilters()`. **Xoá** `renderTableView()`, `renderSingleStudentRow()` ✅ |
| **2B.5** | `ClassView.ts` | Cập nhật: dùng `<gl-student-row>` trong table mode, `<gl-student-list>` trong sidebar ✅ |
| **2B.6** | Sticky headers CSS | Chưa cần — CSS `scoring.css` đã có sticky headers/columns ✅ |

---

### Phase 3: ClassView — Partial Components (3 ngày) ✅ **COMPLETED**

**Mục tiêu:** KHÔNG rewrite `ClassView.ts`. Chỉ tách toolbar + detail panel + bulk action bar.

| Task | File | Action | Trạng thái |
|------|------|--------|-----------|
| **3.1** | `gl-class-toolbar.ts` | LitElement: class header (name, year, archive), action buttons (add, columns, invite), includes `<gl-density-toggle>` | ✅ Done |
| **3.2** | `gl-density-toggle.ts` | LitElement: Compact/Comfortable toggle, persist localStorage, emits `@density-change`, applies `.density-compact`/`.density-spacious` to `<html>` | ✅ Done |
| **3.3** | `gl-student-detail.ts` | LitElement: Master-Detail slide-in panel (từ phải, `min(50vw, 480px)`), overlay backdrop, student info + score history, emits `@detail-edit` / `@detail-journal` / `@detail-close` | ✅ Done |
| **3.4** | `gl-bulk-action-bar.ts` | LitElement: sticky bottom bar khi multi-select, exposes `.count` property, emits `@bulk-edit` / `@bulk-clear` | ✅ Done |
| **3.5** | `ClassView.ts` | Replaced `<div class="class-header">` → `<gl-class-toolbar>`, `<div id="bulkActionBar">` → `<gl-bulk-action-bar>`, added `<gl-student-detail>`. Updated `bindEvents()` to use component events. Updated `updateBulkBar()` to set `.count` property. | ✅ Done |
| **3.6** | CSS Data Density | Density variables `--space-density`/`--row-height-density` exist in `variables.css`. Overrides in `scoring.css` for `.density-compact`/`.density-spacious`. Component applies classes to `<html>`. | ✅ Done (CSS existed) |

**Giữ nguyên từ `ClassView.ts` cũ (không migrate):**
- `render()` — vẫn dùng innerHTML cho students container
- `bindEvents()` — vẫn dùng querySelector + addEventListener cho student actions
- `rerenderStudents()` — vẫn gọi StudentRenderer functions
- Gesture management (swipe, long-press, pull-to-refresh)
- Filter management (classification, completion, score ranges)
- Column visibility + column resizers
- Context menu
- Drag & drop reorder

**Chỉ thay thế:**
```
<header class="class-header">...</header>       →  <gl-class-toolbar> ✅
<gl-student-detail>                              →  MỚI (thay modal) ✅
<gl-bulk-action-bar>                             →  MỚI (thay inline bar) ✅
#bulkActionBar                                   →  REMOVE ✅
```

---

### Phase 3.5: Bug Fix Pass (1 ngày) ✅ **COMPLETED**

**Mục tiêu:** Vệ sinh codebase, fix các lỗ hổng nhỏ trước khi polish.

| Task | File | Fix | Priority | Trạng thái |
|------|------|-----|----------|-----------|
| 3.5.1 | `ClassView.ts` | `loadColVisibility()` đã có try-catch sẵn. Thêm try-catch cho `localStorage` trong `setupColumnResizers()` (2 chỗ) | 🔴 High | ✅ Done |
| 3.5.2 | `ClassView.ts` | Container listeners (click, keydown, input) → extracted named functions + `_containerCleanups` array + cleanup at `bindEvents()` start. `document` listeners (col visibility popover, context menu) → `_documentCleanups` + cleanup. | 🔴 High | ✅ Done |
| 3.5.3 | `ClassView.ts` | Code đã đúng (old handler removed trước khi add mới, hideContextMenu cũng cleanup). Không có bug thực tế. | 🟡 Medium | ✅ Verified - không cần fix |
| 3.5.4 | `gl-app-shell.ts` | `disconnectedCallback()` cleanup đã đầy đủ: `_unsubState()`, `_scheduledStateUpdate.cancel()`. Các listeners khác đều qua Lit template hoặc controllers có cleanup. | 🟡 Medium | ✅ Verified - OK |
| 3.5.5 | `SidebarController.ts` | `hostDisconnected()` gọi `detach()` — duyệt `this.listeners` array và `removeEventListener` từng cái. Pattern đúng. | 🟡 Medium | ✅ Verified - OK |
| 3.5.6 | `gl-dashboard.ts` | `badge` plain HTML strings → `html\`...\`` Lit templates. `if (!data) return ''` → `return html\`\``. | 🟢 Low | ✅ Done |
| 3.5.7 | `gl-dashboard.ts` | `EnrichedStudent` extends `StudentData` thay vì `{ [key: string]: any }`. `columns: ScoreColumnDef[]` thay `any[]`. `_hasMissingScores(student: EnrichedStudent)`. All `.filter/.map/.sort` callbacks typed. | 🟢 Low | ✅ Done |

---

### Phase 4: 3 Core Modals → LitElement (2 ngày) ✅ **COMPLETED**

**Mục tiêu:** Chỉ migrate 3 modals được dùng nhiều nhất. Giữ nguyên 12 modals còn lại.

| Modal | Target Component | Pattern | Trạng thái |
|-------|-----------------|---------|-----------|
| `AddStudentModal` (140 dòng) | `gl-add-student` | LitElement + Light DOM + compose `<gl-modal>` | ✅ Done |
| `ExcelImportModal` (740 dòng) | `gl-excel-import` | LitElement + Light DOM + wizard state machine | ✅ Done |
| `ParentInviteModal` (137 dòng) | `gl-parent-invite` | LitElement + Light DOM + reactive student list | ✅ Done |

**Pattern thực tế (composition over inheritance):**
- Mỗi modal là LitElement với `createRenderRoot() { return this }` (Light DOM)
- Dùng `<gl-modal>` làm wrapper (heading, size, slots) thay vì `extends GlModal`
- Tận dụng Lit template event binding (`@click`, `@submit`, `@change`) — không `addEventListener`
- Dùng `FormData` với `name` attribute thay vì `querySelector` từng field
- Registry (`AppModalRegistry`) và `ClassView` tạo element qua `document.createElement` + set properties

**Thay đổi files:**
| File | Action |
|------|--------|
| `src/ui/views/components/gl-add-student.ts` | 🆕 Mới (thay `AddStudentModal.ts`) |
| `src/ui/views/components/gl-excel-import.ts` | 🆕 Mới (thay `ExcelImportModal.ts`) |
| `src/ui/views/components/gl-parent-invite.ts` | 🆕 Mới (thay `ParentInviteModal.ts`) |
| `src/ui/controllers/AppModalRegistry.ts` | ✏️ Sửa: `openAddStudent`, `openParentInvite` dùng component mới |
| `src/ui/views/gl-app-shell.ts` | ✏️ Sửa: ExcelImport dùng `gl-excel-import` |
| `src/ui/views/ClassView.ts` | ✏️ Sửa: `openAddStudent`, `openParentInvite` dùng component mới |
| `src/ui/views/modals/AddStudentModal.ts` | 🗑️ Xoá (không còn import) |
| `src/ui/views/modals/ExcelImportModal.ts` | 🗑️ Xoá (không còn import) |
| `src/ui/views/modals/ParentInviteModal.ts` | 🗑️ Xoá (không còn import) |

**Deferred (giữ nguyên class cũ, không migrate):**
`ColumnsModal`, `ThemeModal`, `PrintModal`, `ReportsModal`, `MissingScoresModal`, `UserManagementModal`, `BackupModal`, `BulkExportModal`, `BulkEditModal`, `ConflictModal`, `JournalLogModal`, `HelpModal`

---

### Phase 5: Polish & System Integration (3 ngày)

| Priority | Task | Detail | File |
|----------|------|--------|------|
| 🔴 **5A: High Impact (1 ngày) ✅** | | | |
| | Empty states SVG | ✅ Tạo `gl-icons.ts` với 9 SVG icons (folder, search, edit, check, trophy, heart, thumbs-up, clipboard, bar-chart). Thay toàn bộ emoji trong `gl-dashboard.ts` (7 chỗ), `StudentRenderer.ts` (3 chỗ), `ClassView.ts` (5 chỗ), `ClassListController.ts` (1 chỗ) | `gl-icons.ts`, `gl-dashboard.ts`, `ClassView.ts`, `StudentRenderer.ts`, `ClassListController.ts` |
| | Focus management | ✅ Fix event listener leak trong `GlModal` (bind once). Thêm `createFocusTrap` khi modal open, destroy khi close. `:focus-visible` đã có sẵn trong `base.css` | `GlModal.ts` |
| | Keyboard nav | ✅ Context menu: thay ArrowUp/Down manual handler bằng `createFocusTrap` (Tab/Shift+Tab + ArrowUp/Down). Arrow keys trong table đã có từ Phase 2. | `ClassView.ts` |
| 🟡 **5B: Medium Impact (1 ngày) ✅** | | | |
| | Fluid typography variables | ✅ Đã dùng `clamp()` cho tất cả `--font-size-*` trong `variables.css` từ trước | `variables.css` |
| | Data Density persist | ✅ Đã hoàn chỉnh trong `gl-density-toggle.ts` (localStorage read/write, `.density-compact`/`.density-spacious` classes) | `gl-density-toggle.ts` |
| | Container queries | ✅ Tạo `class-view.css` mới với `container-type: inline-size` cho `.class-view` và `.toolbar`. Thêm `@container` queries cho responsive. Import trong `main.css` | `src/styles/views/class-view.css`, `main.css` |
| 🟢 **5C: Deferred** | | | |
| | Virtual list | ⏸️ Giữ nguyên — `content-visibility` hiện tại đủ cho số lượng HV hiện có | `ClassView.ts` |
| | Storybook stories | ⏸️ Hoãn — có thể làm sau khi hoàn tất migration | `*.stories.ts` |
| | E2E tests | ⏸️ Hoãn — cần setup Playwright CI | `tests/e2e/` |

---

## ✅ Definition of Done (Per Phase)

| Checklist | Required |
|-----------|----------|
| TypeScript strict mode pass (`npm run typecheck`) | ✅ |
| Unit tests pass (`npm run test:run` — maintain ≥ 586 tests) | ✅ |
| No `innerHTML` in new Lit components | ✅ |
| All events via `@event=${handler}` pattern | ✅ |
| Reactive `static properties` used for all component inputs | ✅ |
| CSS uses design tokens (CSS variables) | ✅ |
| Old vanilla file deleted (nếu có replacement) | ✅ |
| Phase 1.5: `gl-app-shell` ≤ 966 lines (giảm 49% từ 1889) | ✅ |

---

## 🧪 Verification Commands

```bash
# Sau mỗi phase:
npm run typecheck      # TypeScript strict — zero errors
npm run test:run       # Vitest unit — maintain ≥ 586 tests
npm run build          # Vite build production
```

---

## 📁 Files to Delete (Cleanup)

| File | Reason | Status |
|------|--------|--------|
| `src/ui/views/AppView.ts` | Replaced by `gl-app-shell` | ✅ **DELETED (Phase 0)** |
| `src/ui/views/DashboardView.ts` | Replaced by `gl-dashboard` | ✅ **DELETED (Phase 1)** |
| `src/views/cardsView.ts` | Deleted — replaced by `<gl-student-card>` | ✅ Done |
| `src/views/StudentRenderer.ts` | Partially replaced by `gl-student-row`. Giữ `renderYearView()`, `renderStatsView()`, `filterStudents()`, `applyFilters()` | ✅ Done |
| `src/ui/views/ClassView.ts` | **Partial component hoá**: toolbar, detail panel, bulk action bar tách thành Lit components | ✅ **Phase 3** |
| `src/ui/controllers/SidebarController.ts` | Converted → `ReactiveController` (in-place). Accordion + create class handlers là dead code (SidebarController attach chạy trước firstUpdated). | ✅ **DONE (Phase 0)** |
| `src/ui/controllers/ShortcutController.ts` | Converted → `ReactiveController` (in-place). **QUAN TRỌNG**: keyboard shortcuts + palette events bị double-bind với `gl-app-shell._setupKeyboardShortcuts()` + `_bindPaletteEvents()`. Đã xoá duplicate khỏi shell. | ✅ **DONE + FIXED (Phase 1.5)** |
| `src/ui/controllers/ClassFilterController.ts` | Converted → `ReactiveController` (in-place) | ✅ **DONE (Phase 0)** |
| `src/ui/controllers/ClassBulkActions.ts` | Converted → `ReactiveController` (in-place) | ✅ **DONE (Phase 0)** |

---

## 📊 Timeline Summary

| Phase | Scope | Days | Trạng thái | Dependencies |
|-------|-------|------|-----------|-------------|
| **0** | Cleanup + Controllers → ReactiveController | 2 | ✅ **DONE** | — |
| **0.5** | Test Infrastructure cho Lit views | 1 | ✅ **DONE** | Phase 0 |
| **1** | Dashboard → `<gl-dashboard>` | 2 | ✅ **DONE** | Phase 0 |
| **1.5** | Consolidate `gl-app-shell` (1889→966 lines) | 2 | ✅ **DONE** | Phase 1 |
| **2A** | `gl-score-input` + `gl-student-card` | 3 | ✅ | Done 22/07 |
| **2B** | `gl-student-row` + `gl-student-list` | 3 | ✅ | Done 22/07 |
| **3** | ClassView partial components (toolbar, detail, bulk) | 3 | ✅ | Done 22/07 |
| **3.5** | Bug fix pass (localStorage, listener leak, cleanup) | 1 | ✅ | Done 22/07 |
| **4** | 3 core modals → LitElement | 2 | ✅ | Done 22/07 |
| **5** | Polish (empty states, focus, typography, container queries) | 3 | ✅ | Done 22/07 (5C deferred) |
| **Tổng** | | **~18 ngày** | | |

---

## 🔮 Rủi Ro & Cách Tránh

| Rủi ro | Xác suất | Ảnh hưởng | Cách tránh |
|--------|----------|-----------|------------|
| **Phase 1.5 tách shell gây regression** | 🟡 Medium | Cao | Làm từng controller một, test sau mỗi lần tách |
| **Lit test infra không setup được** | 🟢 Thấp | Trung bình | Dùng `@open-wc/testing` đã được community verify. Fallback: test via integration |
| **Phase 2 migration ảnh hưởng ClassView hiện tại** | 🟡 Medium | Cao | ClassView giữ nguyên event binding cũ, components mới chỉ thay thế render output |
| **Phase 3 Master-Detail không responsive** | 🟢 Thấp | Thấp | Dùng `min(50vw, 480px)` + fallback modal trên mobile |
| **Phạm vi Phase 5 quá rộng** | 🟡 Medium | Trung bình | Phân rõ 5A/5B/5C. 5C là "nice to have", có thể bỏ |

---

## 📝 Ghi Chú Bổ Sung

### Kết quả đánh giá Phase 1 (thực hiện bởi BLACKBOXAI)

**Điểm: 9.3/10** 🟢 Xuất sắc

| Tiêu chí | Trọng số | Điểm | Ghi chú |
|----------|----------|------|---------|
| Kiến trúc LitElement | 25% | 9/10 | Đúng pattern, thiếu type safety internal state |
| CSS responsive | 20% | 10/10 | Container queries + clamp() đúng spec |
| Integration với shell | 20% | 10/10 | Event binding sạch, không leak |
| Dead code cleanup | 15% | 10/10 | DashboardView.ts deleted |
| Test + typecheck | 10% | 10/10 | 586 tests pass, typecheck zero errors |
| Code consistency | 10% | 7/10 | Mix html template vs string returns |

**3 issues cần cải thiện:**
1. Empty states dùng plain string thay vì `html\`...\`` → kém reactivity
2. Internal state dùng `any` thay vì interface → mất type safety
3. Thiếu loading state cho dashboard actions (export, compare years, toggle archive)

---

### Liên kết tài liệu
- [Architecture Overview](./ARCHITECTURE.md) — Kiến trúc tổng thể
- [PLAN.md](./PLAN.md) — Plan điều chỉnh (Phase 0-5 lịch sử)
- [STYLE_GUIDE.md](./STYLE_GUIDE.md) — Code style guide
- [UI-UX Upgrade Plan](./ui-upgrade-plan.md) — Chi tiết UX upgrades

---

> **Next Action**: Phase 3.5 — Bug fix pass (localStorage, listener leak, cleanup).

