-- =========================================================
-- Sổ Điểm Giáo Lý — schema Supabase (Relational Model)
-- Project: gqmbhvgyoenweiepvrvk
-- Chạy toàn bộ file này trong: SQL Editor → New query → Run
-- =========================================================

-- =========================================================
-- Classes table
-- =========================================================
create table if not exists public.classes (
  id text primary key,
  name text not null,
  year text not null,
  columns jsonb not null default '[]'::jsonb,
  weights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rev bigint not null default 1
);

-- =========================================================
-- Students table
-- =========================================================
create table if not exists public.students (
  id text primary key,
  class_id text not null references public.classes(id) on delete cascade,
  ten_thanh text default '',
  ho_dem text default '',
  ten text default '',
  name text default '',
  ma_hv text default '',
  ngay_sinh text default '',
  gioi_tinh text default '',
  ten_phu_huynh text default '',
  sd_phu_huynh text default '',
  dia_chi text default '',
  email text default '',
  ghi_chu text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rev bigint not null default 1
);

-- Index for faster student lookup by class
create index if not exists idx_students_class_id on public.students(class_id);

-- =========================================================
-- Scores table
-- =========================================================
create table if not exists public.scores (
  id text primary key default gen_random_uuid(),
  student_id text not null references public.students(id) on delete cascade,
  term text not null check (term in ('hk1', 'hk2')),
  col_key text not null,
  values jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Index for faster score lookup by student
create index if not exists idx_scores_student_id on public.scores(student_id);
-- Unique constraint to prevent duplicate scores per student/term/column
create unique index if not exists idx_scores_unique on public.scores(student_id, term, col_key);

-- =========================================================
-- Learning Logs table
-- =========================================================
create table if not exists public.learning_logs (
  id text primary key default gen_random_uuid(),
  student_id text not null references public.students(id) on delete cascade,
  date text not null,
  type text not null,
  level text not null,
  text text not null,
  by_user_id text,
  by_name text,
  at bigint not null,
  created_at timestamptz not null default now()
);

-- Index for faster log lookup by student
create index if not exists idx_learning_logs_student_id on public.learning_logs(student_id);

-- =========================================================
-- Legacy app_cloud table (keep for backward compatibility)
-- =========================================================
create table if not exists public.app_cloud (
  id text primary key default 'main',
  state jsonb not null default '{"version":3,"activeClassId":null,"classes":[]}'::jsonb,
  auth jsonb not null default '{"version":1,"users":[]}'::jsonb,
  print jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  rev bigint not null default 1
);

-- Dòng mặc định cho app_cloud
insert into public.app_cloud (id, state, auth, print)
values (
  'main',
  '{"version":3,"activeClassId":null,"classes":[]}'::jsonb,
  '{"version":1,"users":[]}'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================

-- Enable RLS on all tables
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.scores enable row level security;
alter table public.learning_logs enable row level security;
alter table public.app_cloud enable row level security;

-- Drop existing policies if any
drop policy if exists "classes_select_anon" on public.classes;
drop policy if exists "classes_insert_anon" on public.classes;
drop policy if exists "classes_update_anon" on public.classes;
drop policy if exists "classes_delete_anon" on public.classes;

drop policy if exists "students_select_anon" on public.students;
drop policy if exists "students_insert_anon" on public.students;
drop policy if exists "students_update_anon" on public.students;
drop policy if exists "students_delete_anon" on public.students;

drop policy if exists "scores_select_anon" on public.scores;
drop policy if exists "scores_insert_anon" on public.scores;
drop policy if exists "scores_update_anon" on public.scores;
drop policy if exists "scores_delete_anon" on public.scores;

drop policy if exists "learning_logs_select_anon" on public.learning_logs;
drop policy if exists "learning_logs_insert_anon" on public.learning_logs;
drop policy if exists "learning_logs_update_anon" on public.learning_logs;
drop policy if exists "learning_logs_delete_anon" on public.learning_logs;

drop policy if exists "app_cloud_select_anon" on public.app_cloud;
drop policy if exists "app_cloud_insert_anon" on public.app_cloud;
drop policy if exists "app_cloud_update_anon" on public.app_cloud;

-- Create policies for classes (anon key - trusted parish use)
create policy "classes_select_anon"
  on public.classes for select to anon using (true);
create policy "classes_insert_anon"
  on public.classes for insert to anon with check (true);
create policy "classes_update_anon"
  on public.classes for update to anon using (true) with check (true);
create policy "classes_delete_anon"
  on public.classes for delete to anon using (true);

-- Create policies for students
create policy "students_select_anon"
  on public.students for select to anon using (true);
create policy "students_insert_anon"
  on public.students for insert to anon with check (true);
create policy "students_update_anon"
  on public.students for update to anon using (true) with check (true);
create policy "students_delete_anon"
  on public.students for delete to anon using (true);

-- Create policies for scores
create policy "scores_select_anon"
  on public.scores for select to anon using (true);
create policy "scores_insert_anon"
  on public.scores for insert to anon with check (true);
create policy "scores_update_anon"
  on public.scores for update to anon using (true) with check (true);
create policy "scores_delete_anon"
  on public.scores for delete to anon using (true);

-- Create policies for learning_logs
create policy "learning_logs_select_anon"
  on public.learning_logs for select to anon using (true);
create policy "learning_logs_insert_anon"
  on public.learning_logs for insert to anon with check (true);
create policy "learning_logs_update_anon"
  on public.learning_logs for update to anon using (true) with check (true);
create policy "learning_logs_delete_anon"
  on public.learning_logs for delete to anon using (true);

-- Create policies for app_cloud (legacy)
create policy "app_cloud_select_anon"
  on public.app_cloud for select to anon using (true);
create policy "app_cloud_insert_anon"
  on public.app_cloud for insert to anon with check (true);
create policy "app_cloud_update_anon"
  on public.app_cloud for update to anon using (true) with check (true);

-- =========================================================
-- Realtime Subscriptions
-- =========================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.classes;
  exception
    when duplicate_object then null;
    when others then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.students;
  exception
    when duplicate_object then null;
    when others then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.scores;
  exception
    when duplicate_object then null;
    when others then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.learning_logs;
  exception
    when duplicate_object then null;
    when others then null;
  end;
end $$;

-- =========================================================
-- Functions to auto-update updated_at and rev
-- =========================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function increment_rev()
returns trigger as $$
begin
  new.rev = coalesce(old.rev, 0) + 1;
  return new;
end;
$$ language plpgsql;

-- Create triggers for classes
drop trigger if exists update_classes_updated_at on public.classes;
create trigger update_classes_updated_at
  before update on public.classes
  for each row execute function update_updated_at_column();

drop trigger if exists increment_classes_rev on public.classes;
create trigger increment_classes_rev
  before update on public.classes
  for each row execute function increment_rev();

-- Create triggers for students
drop trigger if exists update_students_updated_at on public.students;
create trigger update_students_updated_at
  before update on public.students
  for each row execute function update_updated_at_column();

drop trigger if exists increment_students_rev on public.students;
create trigger increment_students_rev
  before update on public.students
  for each row execute function increment_rev();

-- =========================================================
-- Comments
-- =========================================================
comment on table public.classes is 'Lớp giáo lý';
comment on table public.students is 'Học viên';
comment on table public.scores is 'Điểm theo cột';
comment on table public.learning_logs is 'Nhật ký học tập';
comment on table public.app_cloud is 'Legacy snapshot - backward compatibility';
