# Thư mục sao lưu (backups)

Đây là chỗ **nên** lưu file backup JSON của Sổ Điểm Giáo Lý.

## Cách gắn thư mục (Chrome / Edge)

1. Mở app → đăng nhập **Ban Giáo lý (admin)**  
2. **Sao lưu** (chip 💾 hoặc banner nhắc)  
3. Bấm **Chọn thư mục backups**  
4. Trong hộp thoại Windows:  
   - Vào thư mục project `tinh-diem`  
   - Chọn thư mục **`backups`** này (hoặc **New folder** nếu chưa có)  
   - Bấm **Select Folder** và cho phép quyền ghi  

Lần sau bấm **Sao lưu ngay** → file sẽ tự ghi vào đây, ví dụ:

`backup-so-diem-giao-ly-2026-04-15-1430.json`

## Lưu ý

- Trình duyệt **không** tự ghi ra ổ đĩa nếu chưa chọn thư mục (bảo mật web).  
- Firefox / một số trình duyệt: chỉ tải về **Downloads**.  
- Nên copy thêm bản backup ra USB / Google Drive.  
- **Không** commit file `*.json` backup lên git nếu có dữ liệu thật (đã có `.gitignore` gợi ý).
