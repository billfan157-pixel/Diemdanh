-- =========================================================
-- Sổ Điểm Giáo Lý — Schema Quan Hệ Mới (Phase 2)
-- =========================================================

-- 1. Bảng parish_members (Thành viên liên kết auth.users)
CREATE TABLE IF NOT EXISTS public.parish_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ban_gl', 'glv', 'viewer')),
  class_ids TEXT[] DEFAULT '{}',
  pin_hash TEXT,
  pin_salt TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Bảng classes (Lớp học)
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year TEXT NOT NULL,
  weights JSONB NOT NULL DEFAULT '{"khaoKinh":1,"thuocBai":1,"chuyenCan":1,"baiTap":1,"thaiDo":1,"kiemTra":1}',
  rev BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bảng students (Học viên)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE,
  ten_thanh TEXT DEFAULT '',
  ho_dem TEXT DEFAULT '',
  ten TEXT DEFAULT '',
  name TEXT DEFAULT '',
  ma_hv TEXT DEFAULT '',
  ngay_sinh TEXT DEFAULT '',
  gioi_tinh TEXT DEFAULT '',
  ten_phu_huynh TEXT DEFAULT '',
  sd_phu_huynh TEXT DEFAULT '',
  dia_chi TEXT DEFAULT '',
  email TEXT DEFAULT '',
  ghi_chu TEXT DEFAULT '',
  rev BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Bảng scores (Điểm số - 1 dòng mỗi học viên + học kỳ + cột điểm)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  term TEXT NOT NULL CHECK (term IN ('hk1', 'hk2')),
  col_key TEXT NOT NULL CHECK (col_key IN ('khaoKinh', 'thuocBai', 'chuyenCan', 'baiTap', 'thaiDo', 'kiemTra')),
  values NUMERIC[] DEFAULT '{}',
  rev BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, term, col_key)
);

-- 5. Bảng learning_logs (Nhật ký học tập)
CREATE TABLE IF NOT EXISTS public.learning_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  level TEXT NOT NULL,
  text TEXT NOT NULL,
  by_user_id TEXT NOT NULL,
  by_name TEXT NOT NULL,
  at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON public.scores(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_student_id ON public.learning_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_parish_members_user_id ON public.parish_members(user_id);

-- Kích hoạt Realtime cho các bảng cần thiết
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_logs;
