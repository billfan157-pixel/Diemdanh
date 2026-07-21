# Kiến trúc app (TypeScript + Vite)

App chạy hoàn toàn trên trình duyệt. Build bằng **Vite**, viết bằng **TypeScript**, không có backend riêng. Dữ liệu lưu trên **IndexedDB** cục bộ và đồng bộ lên **Supabase** (tuỳ chọn).

---

## Luồng khởi động

```
index.html
  └── src/main.ts           ← Entry point Vite
        └── App.ts          ← Mount toàn bộ app
              ├── StorageAdapter.init()   ← Mở IndexedDB
              ├── AuthManager.init()      ← Load session
              ├── StateManager.init()     ← Load state
              └── AppView / LoginView     ← Render UI
```

---

## Nhóm module

### `src/config/`
Hằng số nghiệp vụ, storage keys, định nghĩa cột điểm. **Không** chứa logic UI hay I/O.

- [`constants.ts`](../src/config/constants.ts): Định nghĩa `COLS` (cột điểm), `ColumnKey`, `ColumnWeights`, hàm `classifyStudent`, `displayName`, `generateId`.

### `src/core/`
Logic tính toán và xác thực thuần túy, không phụ thuộc DOM.

- [`calc.ts`](../src/core/calc.ts): Tính TB theo học kỳ (`studentTB`), TB cả năm có hệ số (`studentYearTB`, HK1×1 + HK2×2), xếp loại (`classify`), migration điểm phẳng sang `scoresByTerm`.
- [`auth/AuthManager.ts`](../src/core/auth/AuthManager.ts): Đăng nhập PIN (bcrypt), WebAuthn sinh trắc học, quản lý session, phân quyền `ban_gl` / `glv`.

### `src/services/`
Tầng I/O và tích hợp bên ngoài.

- [`storage/StorageAdapter.ts`](../src/services/storage/StorageAdapter.ts): Đọc/ghi IndexedDB (idb). Lưu `appState`, `authStore`, hàng đợi sync, backup.
- [`storage/StorageAdapter.types.ts`](../src/services/storage/StorageAdapter.types.ts): Toàn bộ interface: `AppState`, `ClassData`, `StudentData`, `ColumnWeights`, `ScoresByTerm`, `TermScores`.
- [`sync/SyncManager.ts`](../src/services/sync/SyncManager.ts): Đồng bộ state lên Supabase. Push/pull theo `updatedAt`.
- [`NotificationManager.ts`](../src/services/NotificationManager.ts): Toast thông báo, hộp thoại confirm/prompt động.

### `src/ui/`
Render HTML, gắn sự kiện, điều hướng màn hình và bootstrap app.

- [`App.ts`](../src/ui/App.ts): Khởi tạo tất cả manager, lắng nghe sự kiện đăng nhập/đăng xuất, mount view.
- [`StateManager.ts`](../src/ui/StateManager.ts): Quản lý `AppState` bằng **Immer** (immutable). Hỗ trợ Undo/Redo bằng patch. Debounce lưu IndexedDB.
- [`views/AppView.ts`](../src/ui/views/AppView.ts): Render sidebar, dashboard, danh sách lớp, hồ sơ cá nhân. Gắn toàn bộ sự kiện UI.
- [`views/LoginView.ts`](../src/ui/views/LoginView.ts): Màn hình đăng nhập PIN và sinh trắc học.
- [`views/modals/AddStudentModal.ts`](../src/ui/views/modals/AddStudentModal.ts): Modal thêm học viên mới.

---

## Quản lý State

`StateManager` là nguồn dữ liệu duy nhất (single source of truth). Mọi thay đổi phải đi qua `mutate()`:

```typescript
this.stateManager.mutate('Thêm học viên', draft => {
  const cls = draft.classes.find(c => c.id === classId)
  cls?.students.push(newStudent)
})
```

- **Immer** đảm bảo state bất biến (immutable).
- Mỗi `mutate()` tạo `patches` / `inversePatches` để hỗ trợ **Undo/Redo**.
- Sau mỗi thay đổi, state được debounce lưu xuống **IndexedDB** sau 300ms.
- Các component đăng ký lắng nghe bằng `stateManager.subscribe(listener)`.

---

## Cơ sở dữ liệu (IndexedDB)

Schema IndexedDB gồm 4 object store:

| Store | Key | Nội dung |
| :--- | :--- | :--- |
| `appState` | `'state'` | Toàn bộ dữ liệu lớp và học viên |
| `authStore` | `'auth'` | Danh sách người dùng, PIN hash, session |
| `syncQueue` | `autoIncrement` | Hàng đợi chờ đồng bộ lên Supabase |
| `backups` | `autoIncrement` | Lịch sử sao lưu JSON cục bộ |

---

## Tính điểm

Logic tập trung tại [`src/core/calc.ts`](../src/core/calc.ts):

- Mỗi học viên lưu `scoresByTerm: { hk1: TermScores, hk2: TermScores }`.
- `studentTB(student, weights, 'hk1')`: TB học kỳ có hệ số cột.
- `studentYearTB(student, weights)`: TB cả năm = **(TB HK1 × 1 + TB HK2 × 2) / 3**. Nếu thiếu 1 kỳ thì lấy TB kỳ còn lại.
- `classify(avg)`: Xếp loại Xuất sắc / Giỏi / Khá / Trung bình / Yếu.

---

## Quy tắc thêm module mới

1. Đặt file vào nhóm đúng trách nhiệm (`config/`, `core/`, `services/`, `ui/`).
2. Export rõ ràng qua `export function` hoặc `export class` — **không dùng `window.GL`**.
3. Import bằng đường dẫn tương đối có đuôi `.ts`, ví dụ:
   ```typescript
   import { studentYearTB } from '../../core/calc.ts'
   ```
4. Thêm unit test tương ứng trong `tests/unit/`.

---

---

## Kiểm thử

```bash
npm run test:run      # Vitest unit tests (tests/unit/)
npx playwright test   # Playwright E2E tests (tests/e2e/)
```
