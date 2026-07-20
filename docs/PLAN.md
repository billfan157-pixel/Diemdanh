# Plan Điều Chỉnh - Sổ Điểm Giáo Lý (2026-2027)

## Hiện trạng thực tế (Tháng 7/2026)

### Vấn đề CRITICAL (đã giải quyết ✅)
- ~~**Dual codebase:**~~ 34 file `.js` cũ đã di chuyển sang `legacy/`, `src/` chỉ còn TypeScript
- ~~**Docs không đúng:**~~ README.md và ARCHITECTURE.md đã viết lại mô tả kiến trúc TS/Vite
- ~~**CSS import sai:**~~ src/main.ts import CSS gốc (`assets/css/main.css` + `mobile.css`) — CSS mới (`src/styles/main.css`) chưa đồng bộ class với HTML nên tạm dùng CSS gốc
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
- [x] Tạm giữ import CSS gốc (`assets/css/main.css` + `mobile.css`) vì CSS mới chưa đồng bộ class với HTML
- [x] Test giao diện: đẹp, responsive đúng trên mobile và desktop
- [ ] Chuyển sang CSS mới khi HTML đã đồng bộ class (defer sang Phase 4)

### 0.3 Update docs (Tuần 1-2)
- [x] Update docs/ARCHITECTURE.md mô tả kiến trúc TS/Vite
- [x] Update README.md đúng thực tế
- [x] Thêm hướng dẫn build/deploy cho Vite
- [x] Xóa reference đến window.GL

### 0.4 Migration logic từ legacy sang TS (Tuần 2-4)
- [x] Migration src/core/calc.js → src/core/calc.ts (tính điểm, xếp loại, TB cả năm)
- [x] Migration src/core/auth.js → src/core/auth/AuthManager.ts (đã hoàn thành từ trước)
- [x] Migration src/core/state.js → src/ui/StateManager.ts (đã hoàn thành từ trước)
- [x] Migration src/services/* sang TS (backup, export, import — đã hoàn thành)
- [ ] Migration src/features/* sang TS (dashboard, journal, reports — chưa migrate)
- [x] Di chuyển 34 file legacy sang `legacy/`, test toàn bộ flow OK

**Done khi:** 
- [x] Không còn file legacy trong `src/` (34 file đã di chuyển sang `legacy/`)
- [x] Docs đúng thực tế (README.md + ARCHITECTURE.md viết lại hoàn toàn)
- [x] CSS load đúng (dùng CSS gốc, giao diện đẹp)
- [x] App chạy được với TS/Vite (44 unit tests + 21 E2E tests PASS)

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
- [ ] Cấu hình cột điểm theo lớp / theo năm học
- [ ] Không hardcode cột điểm
- [ ] UI để GLV cấu hình cột điểm
- [ ] Test với nhiều cấu hình khác nhau

### 3.2 Năm học + archive + so sánh năm (Tuần 24-26)
- [ ] Multi-year: 2025-2026, 2026-2027
- [ ] Archive năm cũ
- [ ] So sánh năm học (TB, xếp loại)
- [ ] UI chuyển đổi năm học

### 3.3 Parish report + dashboard Ban GL (Tuần 27-28)
- [ ] Dashboard Ban GL: % đủ điểm, TB từng lớp, lớp "đỏ"
- [ ] Bảng xếp hạng liên lớp
- [ ] Lọc khối/lớp
- [ ] Xuất báo cáo họp Ban (PDF/Excel chuẩn in)

### 3.4 Phiếu PH read-only (Tuần 29-30)
- [ ] Thư mời / phiếu điểm với token hết hạn
- [ ] Link xem read-only
- [ ] Không cho PH sửa điểm
- [ ] Test token expiration

**Done khi:**
- Cột điểm cấu hình được, không hardcode
- Năm học hoạt động, archive được
- Parish report xuất được
- Phiếu PH read-only hoạt động

---

## Phase 4: UX/UI Polish (Tuần 31-40) - P1/P2

### Mục tiêu
Desktop + mobile "không vướng", design system thống nhất

### 4.1 Design system thống nhất (Tuần 31-33)
- [ ] Design tokens (màu, type, spacing) 1 nguồn
- [ ] Dark mode (tuỳ chọn)
- [ ] Component library thống nhất
- [ ] Storybook hoặc component showcase

### 4.2 UX desktop polish (Tuần 34-36)
- [ ] Sidebar ổn
- [ ] Phím tắt
- [ ] Bulk edit
- [ ] Filter cột
- [ ] Print layout đẹp

### 4.3 UX mobile polish (Tuần 37-40)
- [ ] Tab Điểm / Cả năm / Theo dõi polish
- [ ] Màn Lớp, Cá nhân, Login polish
- [ ] Gesture
- [ ] Sticky actions
- [ ] Empty states rõ

**Done khi:**
- Design system thống nhất, có dark mode
- Desktop power-user features
- Mobile UX "không vướng"

---

## Phase 5: PWA & Performance (Tuần 41-50) - P2/P3

### Mục tiêu
App thật: install, offline, performance tốt

### 5.1 PWA offline thật (Tuần 41-44)
- [ ] Install Android/iOS/Desktop
- [ ] Offline nhập điểm → sync khi có mạng
- [ ] Cache strategy đúng
- [ ] Service worker không chỉ register suông

### 5.2 Performance (Tuần 45-47)
- [ ] Virtual list cho lớp đông (100+ HV)
- [ ] Lazy route/modal
- [ ] Đo LCP/INP trên mobile thật
- [ ] Optimize bundle size

### 5.3 Thông báo (Tuần 48-50)
- [ ] Nhắc thiếu điểm trước hạn tổng kết
- [ ] "Máy khác vừa cập nhật lớp X"
- [ ] Web Notifications API
- [ ] Permission handling

**Done khi:**
- PWA install được, offline thật
- Performance tốt trên mobile
- Thông báo hoạt động

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

### Q4 (Tuần 31-40): Phase 4
- **Tuần 31-33:** Design system
- **Tuần 34-36:** UX desktop polish
- **Tuần 37-40:** UX mobile polish
- **Deliverable:** UX/UI polish, desktop + mobile đồng đều

### Q5 (Tuần 41-50): Phase 5
- **Tuần 41-44:** PWA offline
- **Tuần 45-47:** Performance
- **Tuần 48-50:** Thông báo
- **Deliverable:** App thật, install được, offline

### Q6+ (Tuần 51+): Phase 6 (DEFER)
- Multi-parish, ops, tích hợp
- **Deliverable:** Scale (chỉ khi cần)

---

## Ưu Tiên Theo Giá Trị

### P0 (Làm NGAY)
1. **Fix foundation** (dual codebase, CSS, docs) - Phase 0
2. **An toàn dữ liệu** (backup/restore, migration) - Phase 1
3. **Tính điểm đúng** (unit test calc) - Phase 1

### P1 (Làm sau P0)
1. **Sync đa thiết bị** (cloud, auth, sync) - Phase 2
2. **UX desktop/mobile** (không vướng) - Phase 4
3. **Nghiệp vụ giáo lý** (năm học, parish report) - Phase 3

### P2 (Làm sau P1)
1. **Design system** (tokens, dark mode) - Phase 4
2. **PWA offline** (install, cache) - Phase 5
3. **Performance** (virtual list, lazy route) - Phase 5

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

### Rủi ro 5: Performance
- **Tránh:** Virtual list cho lớp đông, lazy load
- **Measure:** Đo LCP/INP trên mobile thật

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
- [x] Không còn dual codebase (34 file JS di chuyển sang `legacy/`)
- [x] Docs đúng thực tế
- [x] CSS load đúng
- [x] App chạy được với TS/Vite

### Phase 1 ✅
- [x] Schema version rõ ràng
- [x] Backup/restore tin cậy
- [x] CI chạy được
- [x] Unit test calc coverage ≥80%

### Phase 2
- [x] Schema cloud quan hệ
- [x] RLS hoạt động
- [x] Supabase Auth hoạt động
- [x] Sync 2 máy ổn định

### Phase 3
- [ ] Cột điểm cấu hình được
- [ ] Năm học hoạt động
- [ ] Parish report xuất được
- [ ] Phiếu PH read-only

### Phase 4
- [ ] Design system thống nhất
- [ ] UX desktop polish
- [ ] UX mobile polish

### Phase 5
- [ ] PWA install được
- [ ] Offline thật
- [ ] Performance tốt
- [ ] Thông báo hoạt động

---

## Note

- Plan này được điều chỉnh dựa trên hiện trạng thực tế tháng 7/2026
- Thời gian ước lượng, có thể điều chỉnh theo thực tế
- Priority P0 phải hoàn thành trước P1, P1 trước P2, P2 trước P3
- Mỗi phase có checklist "Done khi..." phải hoàn thành
- Luôn test trên data thật trước khi ship
