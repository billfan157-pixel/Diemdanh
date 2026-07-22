# Sổ Điểm Giáo Lý

App web tính điểm giáo lý theo lớp — chạy trên trình duyệt (máy tính & điện thoại).

## Chạy local (phát triển)

```bash
npm install
npm run dev        # http://localhost:3002
```

## Build sản phẩm

```bash
npm run build      # output vào dist/
```

## Kiểm thử

```bash
npm run test:run       # Unit tests (Vitest)
npx playwright test    # E2E tests (Playwright)
```

## Repo

https://github.com/billfan157-pixel/Diemdanh

## Đồng bộ cloud (Supabase)

Project: `vugoskzssqhusnzcbfhm` (billfan157-pixel's Project)  
URL: `https://vugoskzssqhusnzcbfhm.supabase.co`

1. Supabase Dashboard → **SQL Editor** → dán & Run file `supabase/schema.sql`
2. **Settings → API** → copy **anon public** key
3. Trong app: **☁️ Đồng bộ cloud** → dán key → **Lưu key**
4. Máy A: **⬆ Đẩy lên cloud** (hoặc tự đẩy khi lưu điểm)
5. Máy B (điện thoại): cùng key → **⬇ Tải từ cloud** (hoặc tự tải khi đăng nhập)

> Anon key nằm trên frontend (bình thường). Ai có URL app + key đều đọc/ghi được snapshot — chỉ dùng trong giáo xứ tin cậy. Vẫn giữ **Sao lưu JSON** làm phao.

## Dùng trên điện thoại / chia sẻ (GitHub Pages)

1. Vào repo → **Settings** → **Pages**.
2. **Source:** Deploy from a branch.
3. Branch: **`main`** · folder: **`/ (root)`** → **Save**.
4. Đợi 1–2 phút, mở link:

   **https://billfan157-pixel.github.io/Diemdanh/**

5. Trên điện thoại: mở link → **Thêm vào Màn hình chính**.

> Dữ liệu điểm lưu **trên từng máy** (IndexedDB). Sao lưu JSON định kỳ nếu dùng nhiều thiết bị.

## Cấu trúc dự án

```
tinh-diem/
├── index.html              # HTML shell, điểm mount duy nhất
├── src/                    # Toàn bộ mã TypeScript
│   ├── main.ts             # Entry point của Vite
│   ├── styles/
│   │   └── main.css        # CSS Design System v2 (đang dùng)
│   ├── config/             # Hằng số nghiệp vụ, storage keys
│   │   └── constants.ts
│   ├── core/               # Logic nền
│   │   ├── calc.ts         # Tính điểm TB, hệ số, xếp loại
│   │   ├── events.ts       # EventEmitter
│   │   └── auth/
│   │       └── AuthManager.ts
│   ├── services/           # Tầng I/O và tích hợp ngoài
│   │   ├── storage/        # IndexedDB adapter + types
│   │   ├── sync/           # SyncManager (Supabase)
│   │   └── NotificationManager.ts
│   └── ui/                 # Giao diện
│       ├── App.ts          # Bootstrap app
│       ├── StateManager.ts # Quản lý state (Immer + Undo/Redo)
│       └── views/
│           ├── AppView.ts
│           ├── LoginView.ts
│           └── modals/
│               └── AddStudentModal.ts
├── assets/
│   ├── css/                # CSS cũ (không còn dùng)
│   │   ├── main.css
│   │   └── mobile.css
│   └── vendor/             # xlsx, jszip (offline)
├── legacy/          # (đã xoá — code đã migrate sang TypeScript)
│   ├── core/               # calc.js, state.js, auth.js ...
│   ├── services/           # backup.js, export/, import/
│   ├── features/           # dashboard.js, journal.js ...
│   └── ui/                 # render.js, events/, templates/
├── tests/
│   ├── unit/               # Vitest unit tests
│   └── e2e/                # Playwright E2E tests
├── docs/
│   └── ARCHITECTURE.md
├── supabase/
│   └── schema.sql
└── backups/                # File sao lưu thật — không commit
```

## Tài khoản mặc định

- User: `admin` · PIN: `1234` (đổi ngay sau khi đăng nhập)

## Kiến trúc

Xem chi tiết tại [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

App sử dụng **TypeScript + Vite**. Toàn bộ logic được đóng gói dưới dạng ES Modules, không còn dùng mô hình toàn cục `window.GL`. Dữ liệu lưu trên **IndexedDB** thông qua `StorageAdapter`.
