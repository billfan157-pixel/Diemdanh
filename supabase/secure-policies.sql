-- =========================================================
-- Sổ Điểm Giáo Lý — SIẾT BẢO MẬT (tùy chọn, khuyến nghị mạnh)
--
-- Vấn đề: schema.sql gốc cho role anon đọc/ghi tự do →
-- bất kỳ ai có anon key (nằm public trên frontend) đều
-- đọc/ghi được toàn bộ dữ liệu.
--
-- Cách hoạt động: RLS chỉ cho đọc/ghi khi request gửi kèm
-- header `x-parish-key` khớp mã bí mật lưu trong bảng riêng.
--
-- CÁCH BẬT:
-- 1. Sửa 'DAT-MA-BI-MAT-O-DAY' bên dưới thành mã bí mật dài,
--    khó đoán (vd: chuỗi ngẫu nhiên 24+ ký tự).
-- 2. Chạy toàn bộ file này trong SQL Editor.
-- 3. Trong app: ☁️ Đồng bộ cloud → nhập «Mã bảo vệ giáo xứ»
--    → Lưu key. Làm trên MỌI máy đang dùng app.
-- 4. (Khuyến nghị) Rotate anon key cũ: Settings → API → JWT.
--
-- TẮT (quay về như cũ): chạy lại supabase/schema.sql.
--
-- Lưu ý: sau khi bật, kênh Realtime (tự thấy thay đổi tức thì)
-- có thể không nhận event vì RLS không đọc được header trên
-- websocket — app vẫn đồng bộ khi đăng nhập / bấm Tải-Đẩy.
-- =========================================================

-- Bảng chứa mã bí mật (không cho anon đọc)
create table if not exists public.app_secret (
  id text primary key default 'parish',
  key text not null
);
alter table public.app_secret enable row level security;
-- Không tạo policy nào cho app_secret → anon/authenticated không đọc được.

insert into public.app_secret (id, key)
values ('parish', 'DAT-MA-BI-MAT-O-DAY')
on conflict (id) do update set key = excluded.key;

-- Hàm kiểm tra header (security definer để đọc được app_secret)
create or replace function public.parish_key_ok()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (current_setting('request.headers', true)::json ->> 'x-parish-key'),
    ''
  ) = (select key from public.app_secret where id = 'parish');
$$;

revoke all on function public.parish_key_ok() from public;
grant execute on function public.parish_key_ok() to anon, authenticated;

-- Thay policy mở bằng policy yêu cầu mã
drop policy if exists "app_cloud_select_anon" on public.app_cloud;
drop policy if exists "app_cloud_insert_anon" on public.app_cloud;
drop policy if exists "app_cloud_update_anon" on public.app_cloud;
drop policy if exists "app_cloud_select_auth" on public.app_cloud;
drop policy if exists "app_cloud_insert_auth" on public.app_cloud;
drop policy if exists "app_cloud_update_auth" on public.app_cloud;

create policy "app_cloud_select_key"
  on public.app_cloud for select to anon, authenticated
  using (public.parish_key_ok());
create policy "app_cloud_insert_key"
  on public.app_cloud for insert to anon, authenticated
  with check (public.parish_key_ok());
create policy "app_cloud_update_key"
  on public.app_cloud for update to anon, authenticated
  using (public.parish_key_ok())
  with check (public.parish_key_ok());

comment on function public.parish_key_ok() is
  'RLS Sổ Điểm Giáo Lý: request phải gửi header x-parish-key khớp app_secret';
