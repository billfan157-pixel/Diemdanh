# Sổ Điểm Giáo Lý

App web tính điểm giáo lý theo lớp — chạy trên trình duyệt (máy tính & điện thoại).

**Mở local:** double-click `index.html` hoặc serve thư mục này.

## Repo

https://github.com/billfan157-pixel/Diemdanh

## Đồng bộ cloud (Supabase)

Project: `gqmbhvgyoenweiepvrvk`  
URL: `https://gqmbhvgyoenweiepvrvk.supabase.co`

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
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   └── mobile.css
│   └── vendor/         # xlsx, jszip (offline)
├── src/
│   ├── platform/       # code chạy rất sớm, trước layout/CSS
│   ├── config/         # hằng số, cấu hình Supabase public
│   ├── core/           # state, auth, tính điểm, helper chung
│   ├── services/
│   │   ├── export/     # tạo workbook và UI xuất file
│   │   ├── import/     # chuẩn hóa, preview và đọc file nhập
│   │   └── ...         # cloud sync, backup
│   ├── features/       # dashboard, báo cáo, journal, parish, invite
│   └── ui/
│       ├── templates/  # login, app shell, feedback, modal
│       ├── events/     # binding theo luồng nghiệp vụ UI
│       ├── mount-templates.js
│       └── ...         # render view + bootstrap gắn event
├── docs/
│   └── ARCHITECTURE.md
├── supabase/
│   └── schema.sql
└── backups/            # file sao lưu thật — không commit
```

## Tài khoản mặc định

- User: `admin` · PIN: `1234` (đổi ngay sau khi đăng nhập)

## Namespace

Mọi module gắn vào `window.GL`. Template UI được mount trước, sau đó thứ tự `<script>` phải giữ nguyên: `config` → `core` → `services` → `features` → `ui` → `app`.

Xem thêm [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) trước khi thêm module mới.
