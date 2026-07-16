# Sổ Điểm Giáo Lý

App web tính điểm giáo lý theo lớp — chạy trên trình duyệt (máy tính & điện thoại).

**Mở local:** double-click `index.html` hoặc serve thư mục này.

## Repo

https://github.com/billfan157-pixel/Diemdanh

## Đồng bộ cloud (Supabase)

Project: `vugoskzssqhusnzcbfhmn`  
URL: `https://vugoskzssqhusnzcbfhmn.supabase.co`

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

> Dữ liệu điểm lưu **trên từng máy** (localStorage). Sao lưu JSON định kỳ nếu dùng nhiều thiết bị.

## Cấu trúc

```
tinh-diem/
├── index.html
├── css/
│   ├── styles.css
│   └── mobile.css      # Giao diện mobile app
├── js/
│   ├── config.js, utils.js, calc.js, state.js, auth.js
│   ├── views.js, render.js, import-export.js, app.js
│   ├── invite.js, journal.js, dashboard.js, parish.js, …
│   └── vendor/         # xlsx, jszip (offline)
└── backups/            # file sao lưu thật — không commit
```

## Tài khoản mặc định

- User: `admin` · PIN: `1234` (đổi ngay sau khi đăng nhập)

## Namespace

Mọi module gắn vào `window.GL`. Thứ tự `<script>` trong `index.html` phải giữ nguyên.
