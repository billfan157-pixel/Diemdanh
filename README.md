# Sổ Điểm Giáo Lý

App web tính điểm giáo lý theo lớp — chạy trên trình duyệt (máy tính & điện thoại).

**Mở local:** double-click `index.html` hoặc serve thư mục này.

## Dùng trên điện thoại / chia sẻ

1. Đưa code lên GitHub (repo public).
2. Bật **GitHub Pages**: *Settings → Pages → Source: Deploy from branch → `main` / `/ (root)`*.
3. Link dùng: `https://<user>.github.io/<ten-repo>/`
4. Trên điện thoại: mở link → **Thêm vào Màn hình chính**.

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
