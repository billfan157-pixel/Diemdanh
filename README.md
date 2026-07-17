# Sổ Điểm Giáo Lý

App web tính điểm giáo lý theo lớp — chạy trên trình duyệt (máy tính & điện thoại).

**Mở local:** `npm install && npm run dev` → http://localhost:8080 (từ GĐ2 app build bằng Vite, không còn mở trực tiếp `index.html` qua file://).

## Repo

https://github.com/billfan157-pixel/Diemdanh

## Đồng bộ cloud (Supabase)

Project: `gqmbhvgyoenweiepvrvk`  
URL: `https://gqmbhvgyoenweiepvrvk.supabase.co`

1. Supabase Dashboard → **SQL Editor** → dán & Run file `supabase/schema.sql`
   → sau đó chạy thêm `supabase/secure-policies.sql` (khuyến nghị mạnh — chặn người lạ đọc/ghi dữ liệu; xem hướng dẫn trong file)
2. **Settings → API** → copy **anon public** key
3. Trong app: **☁️ Đồng bộ cloud** → dán key → **Lưu key**
4. Máy A: **⬆ Đẩy lên cloud** (hoặc tự đẩy khi lưu điểm)
5. Máy B (điện thoại): cùng key → **⬇ Tải từ cloud** (hoặc tự tải khi đăng nhập)

> Anon key nằm trên frontend (bình thường). Ai có URL app + key đều đọc/ghi được snapshot — chỉ dùng trong giáo xứ tin cậy. Vẫn giữ **Sao lưu JSON** làm phao.

## Dùng trên điện thoại / chia sẻ (GitHub Pages)

1. Vào repo → **Settings** → **Pages**.
2. **Source:** chọn **GitHub Actions** (workflow `deploy.yml` tự build Vite và deploy mỗi lần push lên `main`).
3. Đợi 1–2 phút, mở link:

   **https://billfan157-pixel.github.io/Diemdanh/**

4. Trên điện thoại: mở link → **Thêm vào Màn hình chính**.

> Dữ liệu điểm lưu **trên từng máy** (localStorage). Sao lưu JSON định kỳ nếu dùng nhiều thiết bị.

## Cấu trúc

```
tinh-diem/
├── index.html          # entry Vite (1 thẻ <script type="module">)
├── public/
│   └── no-zoom.js      # chạy rất sớm, trước layout/CSS
├── assets/
│   └── css/
│       ├── main.css    # @import các file trong main/
│       ├── main/       # tách theo khu vực giao diện
│       └── mobile.css
├── src/
│   ├── main.js         # entry — import mọi module theo thứ tự
│   ├── vendor.js       # xlsx, jszip, supabase-js (bundle từ npm)
│   ├── types.js        # định nghĩa type JSDoc (Student, GLClass…)
│   ├── global.d.ts     # khai báo window.GL cho type-check
│   ├── config/         # hằng số, cấu hình Supabase public
│   ├── core/           # state, auth, tính điểm, helper chung
│   ├── services/
│   │   ├── export/     # tạo workbook và UI xuất file
│   │   ├── import/     # chuẩn hóa, preview và đọc file nhập
│   │   └── ...         # cloud sync, backup
│   ├── features/       # dashboard, báo cáo, journal, parish, invite
│   └── ui/
│       ├── templates/  # login, app shell, feedback, modals/
│       ├── views/      # cards, table, year, print
│       ├── events/     # binding theo luồng nghiệp vụ UI
│       ├── mount-templates.js
│       └── ...         # render + bootstrap gắn event
├── docs/
│   └── ARCHITECTURE.md
├── supabase/
│   └── schema.sql
└── backups/            # file sao lưu thật — không commit
```

## Dành cho dev

```bash
npm install       # cài dependencies + tooling
npm run dev       # dev server Vite tại http://localhost:8080
npm run build     # build production ra dist/
npm run preview   # xem thử bản build
npm run lint      # kiểm tra code
npm run typecheck # type-check JSDoc (tsc, checkJs)
npm test          # chạy unit test (tính điểm, auth, import)
```

CI (GitHub Actions) tự chạy lint + typecheck + test + build trên mỗi PR.

## Tài khoản mặc định

- User: `admin` · PIN: `1234` (đổi ngay sau khi đăng nhập)

## Namespace

Mọi module gắn vào `window.GL` (shim tạm trong lúc chuyển dần sang ES modules). Thứ tự load nằm trong `src/main.js`: template → `config` → `core` → `services` → `features` → `ui` → `app`.

Xem thêm [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) trước khi thêm module mới.
