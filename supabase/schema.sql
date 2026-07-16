-- =========================================================
-- Sổ Điểm Giáo Lý — schema Supabase
-- Project: gqmbhvgyoenweiepvrvk
-- Chạy toàn bộ file này trong: SQL Editor → New query → Run
-- =========================================================

-- Bảng đồng bộ toàn bộ app (điểm + tài khoản + mẫu in)
create table if not exists public.app_cloud (
  id text primary key default 'main',
  state jsonb not null default '{"version":3,"activeClassId":null,"classes":[]}'::jsonb,
  auth jsonb not null default '{"version":1,"users":[]}'::jsonb,
  print jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  rev bigint not null default 1
);

-- Dòng mặc định
insert into public.app_cloud (id, state, auth, print)
values (
  'main',
  '{"version":3,"activeClassId":null,"classes":[]}'::jsonb,
  '{"version":1,"users":[]}'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

-- RLS: app web dùng anon key (giáo xứ tin cậy / PIN trong app)
alter table public.app_cloud enable row level security;

drop policy if exists "app_cloud_select_anon" on public.app_cloud;
drop policy if exists "app_cloud_insert_anon" on public.app_cloud;
drop policy if exists "app_cloud_update_anon" on public.app_cloud;
drop policy if exists "app_cloud_select_auth" on public.app_cloud;
drop policy if exists "app_cloud_insert_auth" on public.app_cloud;
drop policy if exists "app_cloud_update_auth" on public.app_cloud;

create policy "app_cloud_select_anon"
  on public.app_cloud for select to anon using (true);
create policy "app_cloud_insert_anon"
  on public.app_cloud for insert to anon with check (true);
create policy "app_cloud_update_anon"
  on public.app_cloud for update to anon using (true) with check (true);

-- authenticated (nếu sau này dùng Supabase Auth)
create policy "app_cloud_select_auth"
  on public.app_cloud for select to authenticated using (true);
create policy "app_cloud_insert_auth"
  on public.app_cloud for insert to authenticated with check (true);
create policy "app_cloud_update_auth"
  on public.app_cloud for update to authenticated using (true) with check (true);

-- Realtime (đồng bộ khi máy khác ghi)
do $$
begin
  begin
    alter publication supabase_realtime add table public.app_cloud;
  exception
    when duplicate_object then null;
    when others then null;
  end;
end $$;

comment on table public.app_cloud is 'Snapshot Sổ Điểm Giáo Lý — sync multi-device';
