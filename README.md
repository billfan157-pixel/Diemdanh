# Sổ Điểm Giáo Lý

App web tính điểm giáo lý theo lớp — chạy trên trình duyệt (máy tính & điện thoại).

**Mở local:** double-click `index.html` hoặc serve thư mục này.

## Repo

https://github.com/billfan157-pixel/Diemdanh

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
