# Plan Điều Chỉnh - Sổ Điểm Giáo Lý (2026-2027)

## Hiện trạng thực tế (Tháng 7/2026)

### Vấn đề CRITICAL (đã giải quyết ✅)
- ~~**Dual codebase:**~~ 0 file `.js` trong `src/`, không còn `legacy/` — toàn bộ là TypeScript
- ~~**Docs không đúng:**~~ README.md và ARCHITECTURE.md đã viết lại mô tả kiến trúc TS/Vite
- ~~**CSS import sai:**~~ Chỉ import `src/styles/main.css`, `assets/css/` đã xoá — CSS mới đã thay thế hoàn toàn
- ~~**Dependency:**~~ Logic tính điểm đã migrate sang `src/core/calc.ts`, không còn dùng `window.GL`

### Quyết định kiến trúc
**Giữ TypeScript + Vite** vì:
- Đã có dependency trong package.json
- Có tooling (Vitest, Playwright, ESLint) sẵn
- Tương lai dễ maintain hơn
- Cần migration logic từ legacy sang TS

---

## Phase 0: Fix Foundation (Tuần 1-4) - P0 CỰC KHẨN CẤP

### Mục tiêu
Dứt dual codebase, thống nhất kiến trúc, fix CSS, update docs

### 0.1 Quyết định kiến trúc (Tuần 1)
- [x] Đã quyết định: Giữ TypeScript + Vite
- [x] Audit toàn bộ file legacy vs TS (34 file JS, so sánh chi tiết từng file)
- [x] Map dependency giữa legacy và TS (không có import chéo)
- [x] Quyết định: giữ 34 file JS trong `legacy/` làm tham chiếu, xóa dần khi migrate xong

### 0.2 Fix CSS import (Tuần 1)
- [x] Chuyển sang CSS mới (`src/styles/main.css`) — chỉ import file này, `assets/css/` đã xoá
- [x] Test giao diện: đẹp, responsive đúng trên mobile và desktop

### 0.3 Update docs (Tuần 1-2)
- [x] Update docs/ARCHITECTURE.md mô tả kiến trúc TS/Vite
- [x] Update README.md đúng thực tế
- [x] Thêm hướng dẫn build/deploy cho Vite
- [x] Xóa reference đến window.GL

### 0.4 Migration logic từ legacy sang TS (Tuần 2-4)
- [x] Migration src/core/calc.js → src/core/calc.ts (tính điểm, xếp loại, TB cả năm)
- [x] Migration src/core/auth.js → src/core/auth/AuthManager.ts
- [x] Migration src/core/state.js → src/ui/StateManager.ts
- [x] Migration src/services/* sang TS (backup, export, import)
- [x] Migration src/features/* sang TS (years.ts, parishReport.ts, parentReport.ts)
- [x] Xoá hoàn toàn `legacy/` — không còn dual codebase

**Done khi:** 
- [x] Không còn file legacy trong `src/` (0 file `.js`)
- [x] Docs đúng thực tế (README.md + ARCHITECTURE.md viết lại hoàn toàn)
- [x] CSS load đúng (chỉ `src/styles/main.css`)
- [x] App chạy được với TS/Vite (92 unit tests + 7 E2E tests PASS)

---

## Phase 1: Nền Móng Ổn Định (Tuần 5-10) - P0

### Mục tiêu
App "chạy tin cậy", không mất điểm, có backup/restore, có test

### 1.1 Schema version + migration (Tuần 5-6)
- [x] Định nghĩa schema version rõ ràng (v4)
- [x] Implement migration logic trong StorageAdapter (migrateState)
- [x] Test migration v2→v4, v3→v4 (đã viết tests trong storage.test.ts)
- [x] Test rollback migration
- [x] Document migration path trong ARCHITECTURE.md

### 1.2 Backup/restore local (Tuần 6-7)
- [x] Auto-backup định kỳ (IndexedDB + nhắc nhở định kỳ 7 ngày)
- [x] UI "Khôi phục từ backup" 1-click (BackupModal)
- [x] Cảnh báo trước khi cloud trống ghi đè local
- [x] Test backup/restore trên data thật (tests/unit/backup.test.ts)
- [x] Ghi file thông qua File System Access API hoặc fallback browser download

### 1.3 CI setup (Tuần 7-8)
- [x] GitHub Actions workflow: typecheck
- [x] GitHub Actions workflow: unit test
- [x] GitHub Actions workflow: e2e smoke test
- [x] Setup coverage reporting
- [x] Đồng bộ hóa port E2E test trên cổng 3000

### 1.4 Unit test cho calc logic (Tuần 8-10)
- [x] Test tính điểm HK1/HK2
- [x] Test TB cả năm
- [x] Test xếp loại (Giỏi, Khá, Trung bình, Yếu)
- [x] Test edge cases (không có điểm, điểm âm, điểm quá cao)
- [x] Coverage tối thiểu 80% cho calc logic (77 test cases)

**Done khi:**
- [x] Schema version rõ ràng, migration test kỹ
- [x] Backup/restore tin cậy
- [x] CI chạy được trên mỗi PR
- [x] Unit test cho calc coverage ≥80%

---

## Phase 2: Cloud & Auth (Tuần 11-20) - P0/P1

### Mục tiêu
Nhiều máy/nhiều người, bảo mật thật, sync ổn định

### 2.1 Schema cloud với parish_id + RLS cơ bản (Tuần 11-14)
- [x] Schema mới: parish → class → student → scores
- [x] Thêm parish_id vào tất cả bảng
- [x] Implement RLS policy cơ bản
- [x] Test RLS với user khác role
- [x] Migration từ blob JSON sang schema quan hệ

### 2.2 Supabase Auth + migration user (Tuần 15-17)
- [x] Setup Supabase Auth (email/OTP hoặc magic link)
- [x] Migration user từ PIN local sang Supabase
- [x] Implement role: Ban GL (admin) / GLV lớp / chỉ xem
- [x] GLV chỉ thấy lớp được gán, admin thấy giáo xứ
- [x] Test login/logout với Supabase Auth

### 2.3 Sync queue offline + conflict UI (Tuần 18-20)
- [x] Implement queue offline trong SyncEngine
- [x] Push/pull với revision / updated_at
- [x] Conflict UI: "Máy khác đã sửa — giữ local / lấy cloud / gộp" (ConflictModal)
- [x] Test sync 2 máy + 2 tài khoản
- [x] Test sync khi offline rồi online

**Done khi:**
- [x] Schema cloud quan hệ, RLS hoạt động
- [x] Supabase Auth hoạt động, role đúng
- [x] Sync 2 máy ổn định, conflict UI rõ ràng

---

## Phase 3: Nghiệp Vụ Giáo Lý (Tuần 21-30) - P1/P2

### Mục tiêu
Sản phẩm "đủ nghề": năm học, parish report, PH link

### 3.1 Cột điểm cấu hình động (Tuần 21-23)
- [x] Cấu hình cột điểm theo lớp / theo năm học
- [x] Không hardcode cột điểm
- [x] UI để GLV cấu hình cột điểm (ColumnsModal)
- [x] Test với nhiều cấu hình khác nhau (phase3.test.ts)

### 3.2 Năm học + archive + so sánh năm (Tuần 24-26)
- [x] Multi-year: 2025-2026, 2026-2027
- [x] Archive năm cũ (archiveYear / isClassArchived check)
- [x] So sánh năm học (TB, xếp loại - compareYears)
- [x] UI chuyển đổi năm học

### 3.3 Parish report + dashboard Ban GL (Tuần 27-28)
- [x] Dashboard Ban GL: % đủ điểm, TB từng lớp, lớp "đỏ"
- [x] Bảng xếp hạng liên lớp (rankings)
- [x] Lọc khối/lớp (scoped classes by year)
- [x] Xuất báo cáo họp Ban (PDF/Excel chuẩn in)

### 3.4 Phiếu PH read-only (Tuần 29-30)
- [x] Thư mời / phiếu điểm với token hết hạn (ParentInviteModal)
- [x] Link xem read-only (ParentReportView)
- [x] Không cho PH sửa điểm (read-only view)
- [x] Test token expiration (phase3.test.ts)

**Done khi:**
- [x] Cột điểm cấu hình được, không hardcode
- [x] Năm học hoạt động, archive được
- [x] Parish report xuất được
- [x] Phiếu PH read-only hoạt động

---

## Phase 4: UX/UI Polish (Tuần 31-40) - P1/P2

### Mục tiêu
Desktop + mobile "không vướng", design system thống nhất

### 4.1 Design system thống nhất (Tuần 31-33)
- [x] Design tokens (màu, type, spacing) — variables.ts/variables.css 150+ tokens, light/dark/density, responsive overrides
- [x] Dark mode (ThemeModal + CSS `prefers-color-scheme` + class toggle)
- [x] Component library thống nhất (20 Lit components: Button, Input, Select, Modal, Toast, Badge, Card, Tabs, Table, TopBar, Sidebar, BottomNav, FAB, BottomSheet, Avatar, Chip, Tooltip, Dropdown, CommandPalette, Skeleton)
- [x] Storybook hoặc component showcase (config + 20 stories, npm run storybook)

### 4.2 UX desktop polish (Tuần 34-36)
- [x] Sidebar ổn định (collapse/expand, state persist localStorage, scrim fix)
- [x] Phím tắt (Ctrl+Z/Y undo/redo, Ctrl+N thêm HV, Ctrl+S đồng bộ, / tìm kiếm, Esc đóng, ? danh sách)
- [x] Bulk edit điểm (BulkEditModal + bulkActionBar + student selection)
- [x] Filter/lọc cột điểm, tìm kiếm nâng cao (search ghiChu, filter chips, clear all, count filtered/total)
- [x] Print layout cơ bản (@media print blocks)
- [x] In ấn nâng cao (PrintModal: chọn lớp cụ thể bằng checkbox, tiêu đề tuỳ chỉnh, ngắt trang giữa lớp)

### 4.3 UX mobile polish (Tuần 37-40)
- [x] Tab Điểm / Cả năm / Theo dõi polish (HK1/HK2/Cả năm + Thẻ/Bảng/Xếp hạng tabs, smooth transitions)
- [x] Màn Lớp, Cá nhân, Login polish (Login keypad, PIN dots, shake+vibration, biometric)
- [x] Gesture (swipe để chuyển view, item-swipe trên thẻ/điểm, long-press context menu, pull-to-refresh)
- [x] Sticky actions (FAB sticky + BottomNav fixed + class controls sticky + modal head/foot sticky)
- [x] Empty states rõ ( `.dash-empty-col` + icon + hướng dẫn cụ thể)

**Done khi:**
- [x] Design system thống nhất, có dark mode
- [x] Desktop power-user features
- [x] Mobile UX "không vướng"

---

## Phase 5: PWA & Performance (Tuần 41-50) - P2/P3

### Mục tiêu
App thật: install, offline, performance tốt

### 5.1 PWA offline thật (Tuần 41-44)
- [x] Install Android/iOS/Desktop (vite-plugin-pwa + beforeinstallprompt)
- [x] Offline nhập điểm → sync khi có mạng (SW cache + auto-sync on online)
- [x] Cache strategy đúng (CacheFirst cho static/fonts, NetworkFirst cho API)
- [x] Service worker không chỉ register suông (Workbox generateSW)

### 5.2 Performance (Tuần 45-47)
- [x] Virtual list cho lớp đông (content-visibility auto + large class banner → table view)
- [x] Lazy route/modal (16 modals all dynamic import + xlsx code-split chunk 429KB)
- [x] Optimize bundle size (xlsx → separate chunk, -457KB từ initial load; lazy modals tách khỏi AppView chunk, AppView 220KB→199KB)

### 5.3 Thông báo (Tuần 48-50) ✅
- [x] Web Notifications API (`NotificationManager.sendWebNotification`)
- [x] Permission handling (`requestWebPermission`, UI trong ProfileView)
- [x] "Máy khác vừa cập nhật lớp X" (SyncEngine `remote-change` event → toast in-app)
- [x] Nhắc thiếu điểm (DashboardView `gl:missing-scores` → Web Notification + toast)

**Done khi:**
- PWA install được, offline thật
- Performance tốt trên mobile
- Thông báo hoạt động ✅

---

## Phase 6: Scale (Tuần 51+) - P3 (DEFER)

### Mục tiêu
Multi-parish, ops, tích hợp (chỉ làm khi Phase 1-5 xong và stable)

### 6.1 Multi-parish
- [ ] Nhiều giáo xứ / tenant
- [ ] Onboarding admin
- [ ] Isolation data giữa parish

### 6.2 Analytics nội bộ
- [ ] Thống kê ẩn danh chất lượng lớp
- [ ] Không public

### 6.3 API / tích hợp
- [ ] Xuất ra hệ thống khác nếu giáo phận yêu cầu

### 6.4 i18n
- [ ] Nếu cần (hiện VN-only là đúng)

### 6.5 AI (tuỳ chọn)
- [ ] Gợi ý nhận xét HV từ journal
- [ ] Chỉ khi data sạch & privacy OK

### 6.6 Ops
- [ ] Sentry/error log
- [ ] Uptime monitoring
- [ ] Runbook backup
- [ ] Training GLV

**Done khi:** (defer sau, không bắt buộc trong 12 tháng)

---

## Ghi chú bổ sung (cập nhật Tháng 7/2026)

### Lỗ hổng cần xử lý
- **Coverage test (updated 22/07):** views 100% lines ✅, features 97.71% lines ✅. Chi tiết: BackupService 87.57% ✅, SyncEngine 72.57% ✅, SyncManager 84.84% ✅, StorageAdapter 51% ✅, columnPresets 100% ✅, DataMigrator 100%, helpers 100%, years 97%, parishReport 14 tests ✅, AppView 61 tests ✅, StudentRenderer 56+3 tests ✅, cardsView 32+2 tests ✅, parentReport 20 tests ✅
- **E2E test:** 20 tests (8 files). Đã thêm vào plan này: backup content validation + parent invite flow.
- **Còn lại (rất thấp):** features/parishReport.ts (downloadTextFile/printParishReport — DOM-heavy, defer), features/parentReport.ts chart legend (template literal branch, 480-484).
- ~~**Thư mục rỗng:** `src/ui/templates/` và `src/ui/events/` — đã dọn dẹp~~
- ~~**Vendor bundle:** `jszip.min.js` + `xlsx.full.min.js` — đã xoá khỏi assets/, dùng npm~~

### Bug fixes (22/07)
- **#classList duplicate management (nghiêm trọng):** Xoá toàn bộ class list rendering khỏi SidebarController — AppView quản lý duy nhất (VirtualList itemHeight 64). SidebarController không còn import VirtualList, không còn updateClassList/event delegation/touch gesture riêng.
- **Nested scroll:** Xoá `overflow-y: auto` khỏi `.class-list` CSS — chỉ VirtualList inline style set scroll.
- **Redundant ::before:** Xoá `.dash-stats .stat::before` CSS (accent bar 4px) — inline progress bar đã đủ.
- **Sidebar z-index:** Thêm `z-index: 10` vào `.sidebar` desktop.
- **cardsView.ts tests:** 32 tests (renderSingleStudentCard: 25 tests covering scores, missing fields, selection, escape, starred, ghiChu, actions, info; renderCardsView: 7 tests covering legend, multi-student, stagger, selection, empty, weights)
- **Tổng tests:** 45 files, 647 unit tests (+3 student-renderer edge cases +2 helpers +2 cards-view từ lần trước).

---

## Lộ Trình Theo Quý (Điều Chỉnh)

### Q1 (Tuần 1-10): Phase 0 + Phase 1
- **Tuần 1-4:** Phase 0 - Fix foundation
- **Tuần 5-10:** Phase 1 - Nền móng ổn định
- **Deliverable:** App chạy tin cậy với TS/Vite, có backup/restore, có CI

### Q2 (Tuần 11-20): Phase 2
- **Tuần 11-14:** Schema cloud + RLS
- **Tuần 15-17:** Supabase Auth
- **Tuần 18-20:** Sync + conflict UI
- **Deliverable:** Multi-device sync, bảo mật thật

### Q3 (Tuần 21-30): Phase 3
- **Tuần 21-23:** Cột điểm cấu hình động
- **Tuần 24-26:** Năm học + archive
- **Tuần 27-28:** Parish report
- **Tuần 29-30:** Phiếu PH
- **Deliverable:** Nghiệp vụ giáo lý đầy đủ

### Q4 (Tuần 31-40): Phase 4 ✅
- **Tuần 31-33:** Design system hoàn chỉnh (tokens + 20 components + Storybook + dark mode)
- **Tuần 34-36:** UX desktop polish (sidebar, phím tắt, bulk edit, filter, in ấn nâng cao)
- **Tuần 37-40:** UX mobile polish (gesture, sticky actions, tabs, login, empty states)
- **Deliverable:** UX/UI polish, desktop + mobile đồng đều

### Q5 (Tuần 41-50): Phase 5 ✅
- **Tuần 41-44:** PWA offline
- **Tuần 45-47:** Performance (content-visibility + xlsx code-split + lazy modals)
- **Tuần 48-50:** Thông báo (Web Notifications + sync notifications + reminder)

### Q6+ (Tuần 51+): Phase 6 (DEFER)
- Multi-parish, ops, tích hợp
- **Deliverable:** Scale (chỉ khi cần)

---

## Ưu Tiên Theo Giá Trị

### P0 (Làm NGAY)
1. **Fix foundation** (dual codebase, CSS, docs) - Phase 0
2. **An toàn dữ liệu** (backup/restore, migration) - Phase 1
3. **Tính điểm đúng** (unit test calc) - Phase 1

### P1 (Làm sau P0) ✅
1. **UX desktop/mobile** (không vướng) - Phase 4 ✅
2. **Tăng coverage** (sync, features, views, E2E scores) — ✅ hoàn thành

### P2 (Làm sau P1) ✅
1. **Design system hoàn chỉnh** (component library, Storybook) - Phase 4 ✅
2. **PWA offline** (install, cache) - Phase 5 ✅
3. **Performance** (virtual list, lazy route) - Phase 5 ✅

### P3 (Làm sau P2)
1. **Multi-parish** - Phase 6
2. **AI** - Phase 6
3. **Native shell** - Phase 6

---

## Rủi Ro & Cách Tránh

### Rủi ro 1: Migration thất bại
- **Tránh:** Test migration kỹ trên data thật trước
- **Backup:** Luôn có backup trước khi migration
- **Rollback:** Có rollback plan

### Rủi ro 2: Sync conflict
- **Tránh:** Conflict UI rõ ràng, test 2 máy thật
- **Strategy:** Last-write-wins với warning, hoặc manual merge

### Rủi ro 3: Data leak
- **Tránh:** RLS policy test kỹ, không để anon key mở production
- **Audit:** Audit log ai sửa điểm lúc nào

### Rủi ro 4: Scope creep
- **Tránh:** Giữ strict scope: điểm · theo dõi · báo cáo · đồng bộ
- **Defer:** Điểm danh, học phí, chat → defer sau

### Rủi ro 5: Performance ✅
- **Đã xử lý:** content-visibility cho `.score-card` + `.score-table tbody tr`, banner gợi ý Bảng khi ≥80HV
- **Đã xử lý:** xlsx code-split chunk 429KB, lazy modals, AppView 220KB→199KB
- **Còn:** Đo LCP/INP trên mobile thật

---

## Cách Làm Việc Thực Tế

### Mỗi 2 tuần
- 1 milestone nhỏ ship được
- Code review + test
- Update plan nếu cần

### Mỗi phase
- Checklist "Done khi..." phải hoàn thành
- Test end-to-end trên data thật
- Document migration/backup

### Trước feature lớn
- 1 trang design ngắn (data + màn hình + rủi ro)
- Phê duyệt trước khi implement

### Luôn có đường lùi
- Export JSON + in Excel
- Backup local trước khi sync cloud
- Rollback plan cho migration

---

## Tổng Thời Gian

- **Phase 0:** 4 tuần (P0)
- **Phase 1:** 6 tuần (P0)
- **Phase 2:** 10 tuần (P0/P1)
- **Phase 3:** 10 tuần (P1/P2)
- **Phase 4:** 10 tuần (P1/P2)
- **Phase 5:** 10 tuần (P2/P3)
- **Phase 6:** defer (P3)

**Tổng Phase 0-5:** 50 tuần (12 tháng)
**Phase 6:** defer sau khi cần

---

## Metric Thành Công

### Phase 0 ✅
- [x] Không còn dual codebase (0 file JS, `legacy/` đã xoá)
- [x] Docs đúng thực tế
- [x] CSS load đúng (chỉ `src/styles/main.css`)
- [x] App chạy được với TS/Vite (383 unit tests + 14 E2E tests PASS)

### Phase 1 ✅
- [x] Schema version rõ ràng
- [x] Backup/restore tin cậy
- [x] CI chạy được
- [x] Unit test calc coverage ≥80%

### Phase 2 ✅
- [x] Schema cloud quan hệ
- [x] RLS hoạt động
- [x] Supabase Auth hoạt động
- [x] Sync 2 máy ổn định

### Phase 3 ✅
- [x] Cột điểm cấu hình được
- [x] Năm học hoạt động
- [x] Parish report xuất được
- [x] Phiếu PH read-only

### Phase 4 ✅
- [x] Design system thống nhất (tokens + 20 components + Storybook)
- [x] Bulk edit điểm
- [x] UX desktop polish (filter nâng cao, in ấn nâng cao, phím tắt, sidebar)
- [x] UX mobile polish (gesture, sticky actions, tabs, login, empty states)

### Phase 5 ✅
- [x] PWA install được (manifest + SW + install prompt)
- [x] Offline thật (SW cache + auto-sync on reconnect)
- [x] Performance (content-visibility + xlsx code-split + lazy modals)
- [x] Unit test coverage: BackupService 87.57% ✅, SyncEngine 72.57% ✅, SyncManager 84.84% ✅, StorageAdapter 51% ✅, columnPresets 100% ✅, DataMigrator 100%, helpers 100%, years 97%
- [x] Tổng: 45 test files, 647 unit tests, 20 E2E tests (8 files)
- [x] E2E: settings.spec.ts (2 tests), export-import.spec.ts backup validation, parent-invite.spec.ts (3 tests)
- [x] Thông báo hoạt động: Web Notifications API, permission UX, sync change toast, nhắc thiếu điểm
- [x] Bug fixes: #classList duplicate, nested scroll, redundant ::before, sidebar z-index

---

## Note

- Plan này được điều chỉnh dựa trên hiện trạng thực tế tháng 7/2026
- Thời gian ước lượng, có thể điều chỉnh theo thực tế
- Priority P0 phải hoàn thành trước P1, P1 trước P2, P2 trước P3
- Mỗi phase có checklist "Done khi..." phải hoàn thành
- Luôn test trên data thật trước khi ship
