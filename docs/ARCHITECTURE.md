# Kiến trúc app

App này vẫn là static web app, không cần build step. Các module dùng chung namespace `window.GL` và được load trực tiếp trong `index.html`.

## Mục tiêu cấu trúc

- `index.html` chỉ giữ shell tối thiểu, điểm mount và thứ tự load script.
- `assets/` chỉ chứa tài nguyên tĩnh: CSS, thư viện vendor, hình ảnh nếu có.
- `src/` chứa toàn bộ logic app, chia theo trách nhiệm để dễ tìm và dễ review.
- `supabase/` chứa tài nguyên phía database, không trộn vào code frontend.
- `backups/` chứa dữ liệu sao lưu thật trên máy, không commit file JSON.

## Nhóm module

`src/platform/`
: Code phải chạy rất sớm trước khi body/CSS hoàn tất, ví dụ khóa zoom mobile.

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
- `templates/modals.js`: toàn bộ modal nhập liệu.
- `templates/registry.js` và `mount-templates.js`: đăng ký, sau đó chèn template vào `#appMount` trước khi logic UI chạy.

Template là JavaScript thay vì HTML partial để app vẫn mở được bằng `file://` mà không cần web server.

## Event UI

- `events/navigation.js`: điều hướng, dashboard, lớp và mobile shell.
- `events/students.js`: nhập điểm, thông tin học viên, tìm kiếm và theo dõi.
- `events/import-export.js`: thao tác modal import/export.
- `events/operations.js`: backup, cloud sync, báo cáo, in và thư mời.
- `events/security.js`: tài khoản, PIN, sinh trắc, chuyển lớp và đăng nhập.

`ui/app.js` chỉ cung cấp helper chung, khởi tạo app và gọi các binder theo thứ tự.

## Thứ tự load bắt buộc

Giữ thứ tự trong `index.html`:

1. Template registry, template UI và `mount-templates.js`
2. `src/config/*`
3. `src/core/utils.js`, `src/core/calc.js`, `src/core/state.js`
4. Auth/biometric/cloud/backup/history
5. `src/features/*`
6. `src/ui/views.js`, `src/ui/render.js`
7. `src/services/export/*`, rồi `src/services/import/*`
8. `src/ui/events/*`
9. `src/ui/app.js`

Nếu thêm module mới, đặt file vào nhóm đúng trách nhiệm và thêm `<script>` ở vị trí mà dependency của nó đã được load trước.

## Quy tắc bảo trì

- Module mới vẫn bọc trong IIFE: `(function (GL) { ... })(window.GL = window.GL || {});`
- Không đọc DOM trong `config` hoặc `core` nếu không thật cần thiết.
- Feature chỉ nên gọi API public trên `GL`, hạn chế chọc trực tiếp DOM ngoài phần màn hình/modal của nó.
- Thêm markup tĩnh vào template phù hợp, không đưa trở lại `index.html`; phần tử UI sinh theo dữ liệu tiếp tục thuộc `render.js`.
- Vendor minified giữ trong `assets/vendor/`, không sửa tay.
- CSS tổng quát ở `assets/css/main.css`; override riêng mobile ở `assets/css/mobile.css`.
