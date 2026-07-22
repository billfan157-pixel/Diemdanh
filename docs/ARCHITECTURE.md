# Kiến Trúc Ứng Dụng Sổ Điểm Giáo Lý v3.0 (TypeScript + Vite + PWA)

> Ứng dụng chạy hoàn toàn trên trình duyệt (Browser PWA). Xây dựng bằng **Vite**, viết bằng **TypeScript**, không phụ thuộc backend riêng. Dữ liệu lưu cục bộ trên **IndexedDB** và hỗ trợ đồng bộ đám mây **Supabase Cloud** (tùy chọn).

---

## 1. Luồng Khởi Động & Bootstrap

```
index.html
  └── src/main.ts               ← Entry point của Vite
        └── App.ts              ← Bootstrap & Mount ứng dụng
              ├── StorageAdapter.init()   ← Kết nối & Migrate IndexedDB
              ├── AuthManager.init()      ← Khôi phục phiên làm việc (Session)
              ├── StateManager.init()      Lav Load State bất biến (Immer)
              └── AppView / LoginView     ← Render Giao diện & Controllers
```

---

## 2. Các Tầng Kiến Trúc (Architectural Layers)

```
src/
├── config/                     # Hằng số nghiệp vụ, định nghĩa cột điểm, storage keys
├── core/                       # Logic tính điểm, xác thực auth & mã hóa PIN (Pure JS/TS)
├── services/                   # Tầng I/O, IndexedDB storage, Supabase Sync, Notifications
└── ui/
    ├── components/             # Lit Web Components (TopBar, BottomNav, Card, Badge, Table...)
    ├── controllers/            # Controller Layer (Tách nhỏ logic ứng dụng & views)
    └── views/                  # Sub-views (DashboardView, ClassView, ProfileView) & Modals
```

### 🔹 `src/config/`
Hằng số nghiệp vụ, storage keys, định nghĩa cột điểm. **Không** chứa logic UI hay I/O.
- [`constants.ts`](../src/config/constants.ts): Định nghĩa `COLS`, `ColumnKey`, `ColumnWeights`, hàm `classifyStudent`, `displayName`, `generateId`.

### 🔹 `src/core/`
Logic tính toán và xác thực thuần túy, độc lập với DOM.
- [`calc.ts`](../src/core/calc.ts): Tính TB học kỳ (`studentTB`), TB cả năm hệ số (`studentYearTB`, HK1×1 + HK2×2), xếp loại (`classify`).
- [`auth/AuthManager.ts`](../src/core/auth/AuthManager.ts): Đăng nhập PIN (PBKDF2/Bcrypt hash), WebAuthn sinh trắc học, quản lý session, phân quyền `admin` / `glv`.

### 🔹 `src/services/`
Tầng I/O, lưu trữ cục bộ và tích hợp đám mây.
- [`storage/StorageAdapter.ts`](../src/services/storage/StorageAdapter.ts): Đọc/ghi IndexedDB (idb). Lưu `appState`, `authStore`, hàng đợi sync, backup.
- [`storage/StorageAdapter.types.ts`](../src/services/storage/StorageAdapter.types.ts): Định nghĩa giao diện data: `AppState`, `ClassData`, `StudentData`, `ColumnWeights`, `ScoresByTerm`.
- [`sync/SyncEngine.ts`](../src/services/sync/SyncEngine.ts) & [`SyncManager.ts`](../src/services/sync/SyncManager.ts): Đồng bộ hai chiều với Supabase Cloud.
- [`NotificationManager.ts`](../src/services/NotificationManager.ts): Toast thông báo, hộp thoại Confirm/Alert/Prompt động.

### 🔹 `src/ui/controllers/` (Tầng Controller Mới v3.0)
Tách biệt trách nhiệm điều khiển ứng dụng, giải phóng "God Class" giúp mã nguồn cực kỳ sạch sẽ:
- [`ShortcutController.ts`](../src/ui/controllers/ShortcutController.ts): Quản lý phím tắt toàn cục (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+N`, `Ctrl+S`, `Ctrl+K`, `/`, `?`) & Command Palette.
- [`AppModalRegistry.ts`](../src/ui/controllers/AppModalRegistry.ts): Đóng gói quản lý và lazy-load 11 Modals toàn app.
- [`SidebarController.ts`](../src/ui/controllers/SidebarController.ts): Quản lý Accordion state, VirtualList danh sách lớp, bộ lọc tìm kiếm & thao tác vuốt chạm Mobile (Swipe to delete/rename).
- [`ClassFilterController.ts`](../src/ui/controllers/ClassFilterController.ts): Quản lý Bộ lọc mẫu (Filter Presets), Popover ẩn/hiện cột điểm & Bộ lọc dải điểm.
- [`ClassBulkActions.ts`](../src/ui/controllers/ClassBulkActions.ts): Quản lý chọn nhiều học sinh & thanh thao tác sửa điểm hàng loạt.

### 🔹 `src/ui/views/`
Cấu trúc màn hình UI rút gọn (Slim Views):
- [`AppView.ts`](../src/ui/views/AppView.ts): Chỉ huy trung tâm (Orchestrator), điều phối giữa 3 Sub-views và 3 Controllers.
- [`ClassView.ts`](../src/ui/views/ClassView.ts): Màn hình Sổ Điểm Lớp (Hỗ trợ 3 chế độ xem: Bảng điểm, Thẻ học sinh, Xếp hạng).
- [`DashboardView.ts`](../src/ui/views/DashboardView.ts): Màn hình Tổng quan niên khóa & Thống kê Ban Giáo lý.
- [`ProfileView.ts`](../src/ui/views/ProfileView.ts): Màn hình Hồ sơ cá nhân & Cài đặt hệ thống.

---

## 3. Hệ Thống Thiết Kế v3.0 (Royal Sanctum Design System)

- **Bảng Màu**: Tone nền Slate Obsidian (`#0f172a`), điểm nhấn Vàng Kim (`#d97706`) và Royal Sapphire (`#2563eb`).
- **Typography**: Kết hợp Google Font **Plus Jakarta Sans** cho tiêu đề trang trọng và **Inter** cho giao diện.
- **Glassmorphic UI**: Áp dụng `.glass-panel`, `.glass-card` hỗ trợ `backdrop-filter: blur(16px)` với viền mỏng mây đêm.
- **Tabular Figures**: Áp dụng `tabular-nums` cho toàn bộ ô điểm và số thống kê giúp căn chỉnh thẳng cột tuyệt đối.

---

## 4. Quản Lý State (StateManager)

`StateManager` là nguồn dữ liệu duy nhất (Single Source of Truth). Mọi thay đổi state bắt buộc thông qua `mutate()`:

```typescript
this.stateManager.mutate('Thêm học viên', draft => {
  const cls = draft.classes.find(c => c.id === classId)
  cls?.students.push(newStudent)
})
```

- **Immer**: Đảm bảo state bất biến (Immutable State).
- **Undo/Redo**: Tự động sinh `patches` / `inversePatches` cho phép Hoàn tác / Làm lại bất kỳ thao tác nào.
- **Debounced Save**: Tự động lưu xuống IndexedDB sau 300ms.

---

## 5. Cơ Sở Dữ Liệu (IndexedDB Schema)

| Store Name | Key | Mục Đích Lưu Trữ |
| :--- | :--- | :--- |
| `appState` | `'state'` | Dữ liệu niên khóa, danh sách lớp, học viên & điểm số |
| `authStore` | `'auth'` | Danh sách người dùng, mã PIN (PBKDF2 hash), session |
| `syncQueue` | `autoIncrement` | Hàng đợi chờ đẩy dữ liệu lên Supabase Cloud |
| `backups` | `autoIncrement` | Các bản sao lưu JSON tự động cục bộ |

---

## 6. Lệnh Kiểm Thử (Testing & Quality Assurance)

```bash
# Chạy toàn bộ Unit Tests (Vitest)
npm run test:run

# Kiểm tra an toàn kiểu dữ liệu (TypeScript Typecheck)
npm run typecheck

# Kiểm tra E2E Tests (Playwright)
npm run test:e2e
```
