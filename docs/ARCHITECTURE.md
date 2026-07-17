# Kiến trúc app

App là static web app build bằng Vite. Các module dùng chung namespace `window.GL` (shim tạm trong lúc chuyển dần sang ES modules) và được import theo thứ tự trong `src/main.js`.

## Mục tiêu cấu trúc

- `index.html` chỉ giữ shell tối thiểu, điểm mount và 1 thẻ `<script type="module" src="/src/main.js">`.
- `public/` chứa file copy nguyên trạng (ví dụ `no-zoom.js` phải chạy rất sớm, trước CSS).
- `assets/` chỉ chứa tài nguyên tĩnh: CSS, hình ảnh nếu có. Thư viện ngoài (xlsx, jszip, supabase-js) bundle từ npm qua `src/vendor.js`.
- `src/` chứa toàn bộ logic app, chia theo trách nhiệm để dễ tìm và dễ review.
- `supabase/` chứa tài nguyên phía database, không trộn vào code frontend.
- `backups/` chứa dữ liệu sao lưu thật trên máy, không commit file JSON.

## Nhóm module

`src/config/`
: Hằng số nghiệp vụ, storage keys, cấu hình public. Không đặt logic UI ở đây.

`src/core/`
: Logic nền của app: helper chung, tính điểm, state/localStorage, auth, sinh trắc, lịch sử sửa điểm.

`src/services/`
: Các tác vụ I/O hoặc tích hợp bên ngoài: Supabase sync, backup, import/export Excel/CSV/DOCX. Export được chia thành `export/workbook.js` và `export/ui.js`; import được chia thành `import/data.js`, `import/preview.js` và `import/parsers.js`.

`src/features/`
: Tính năng độc lập theo domain: dashboard, báo cáo, journal, tổng hợp giáo xứ, thư mời phụ huynh.

`src/ui/`
: Render HTML động, gắn sự kiện, điều hướng màn hình và bootstrap app. Markup tĩnh được chia trong `src/ui/templates/` và mount qua `src/ui/mount-templates.js`; event binding được chia theo luồng trong `src/ui/events/`.

## Template giao diện

- `templates/login.js`: màn hình đăng nhập.
- `templates/app-shell.js`: khung điều hướng và các màn hình chính.
- `templates/feedback.js`: toast, hướng dẫn và lớp phủ giao diện.
- `templates/modals/`: modal nhập liệu chia 3 nhóm: `data.js` (học viên, xuất/nhập, hệ số), `tools.js` (hướng dẫn, sao lưu, giáo xứ, báo cáo), `admin.js` (đồng bộ cloud, PIN, tài khoản).
- `templates/registry.js` và `mount-templates.js`: đăng ký, sau đó chèn template vào `#appMount` trước khi logic UI chạy.

Template là JavaScript thay vì HTML partial để không phải fetch file rời khi chạy.

## Event UI

- `events/navigation.js`: điều hướng, dashboard, lớp và mobile shell.
- `events/students.js`: nhập điểm, thông tin học viên, tìm kiếm và theo dõi.
- `events/import-export.js`: thao tác modal import/export.
- `events/operations.js`: backup, cloud sync, báo cáo, in và thư mời.
- `events/security.js`: tài khoản, PIN, sinh trắc, chuyển lớp và đăng nhập.

`ui/app.js` chỉ cung cấp helper chung, khởi tạo app và gọi các binder theo thứ tự.

## Thứ tự load bắt buộc

Giữ thứ tự import trong `src/main.js`:

1. `src/vendor.js` (xlsx, jszip, supabase-js)
2. Template registry, template UI và `mount-templates.js`
3. `src/config/*`
4. `src/core/utils.js`, `src/core/calc.js`, `src/core/state.js`
5. Auth/biometric/cloud/backup/history
6. `src/features/*`
7. `src/ui/views/*`, `src/ui/render.js`
8. `src/services/export/*`, rồi `src/services/import/*`
9. `src/ui/events/*`
10. `src/ui/app.js`

Nếu thêm module mới, đặt file vào nhóm đúng trách nhiệm và thêm `import` trong `src/main.js` ở vị trí mà dependency của nó đã được load trước.

## Quy tắc bảo trì

- Module mới vẫn bọc trong IIFE: `(function (GL) { ... })(window.GL = window.GL || {});`
- Không đọc DOM trong `config` hoặc `core` nếu không thật cần thiết.
- Feature chỉ nên gọi API public trên `GL`, hạn chế chọc trực tiếp DOM ngoài phần màn hình/modal của nó.
- Thêm markup tĩnh vào template phù hợp, không đưa trở lại `index.html`; phần tử UI sinh theo dữ liệu tiếp tục thuộc `render.js`.
- Thư viện ngoài thêm qua npm và expose trong `src/vendor.js`, không chép file minified vào repo.
- CSS tổng quát chia theo khu vực trong `assets/css/main/` (gộp qua `main.css`); override riêng mobile ở `assets/css/mobile.css`.
- Type dùng chung khai báo JSDoc trong `src/types.js`; member mới của `GL` đã type-check thì khai báo thêm vào `src/global.d.ts` và mở rộng `include` trong `jsconfig.json`.
