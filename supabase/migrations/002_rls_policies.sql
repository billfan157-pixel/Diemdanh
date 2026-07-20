-- =========================================================
-- Sổ Điểm Giáo Lý — RLS Policies (Phase 2)
-- =========================================================

-- Kích hoạt RLS trên tất cả các bảng
ALTER TABLE public.parish_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;

-- Hàm lấy vai trò (role) của user hiện tại
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.parish_members
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$;

-- Hàm lấy danh sách class_ids mà user được gán
CREATE OR REPLACE FUNCTION public.user_class_ids()
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT class_ids FROM public.parish_members
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$;

-- Grant execute trên các helper functions cho mọi role
REVOKE ALL ON FUNCTION public.user_role() FROM public;
REVOKE ALL ON FUNCTION public.user_class_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_class_ids() TO authenticated;

-- === 1. Policies cho parish_members ===
DROP POLICY IF EXISTS "member_select_all" ON public.parish_members;
CREATE POLICY "member_select_all" ON public.parish_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "member_modify_admin" ON public.parish_members;
CREATE POLICY "member_modify_admin" ON public.parish_members
  FOR ALL TO authenticated USING (public.user_role() = 'ban_gl');

-- === 2. Policies cho classes ===
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated USING (
    public.user_role() = 'ban_gl' OR id = ANY(public.user_class_ids())
  );

DROP POLICY IF EXISTS "classes_modify_admin" ON public.classes;
CREATE POLICY "classes_modify_admin" ON public.classes
  FOR ALL TO authenticated USING (public.user_role() = 'ban_gl');

-- === 3. Policies cho students ===
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students
  FOR SELECT TO authenticated USING (
    public.user_role() = 'ban_gl' OR class_id = ANY(public.user_class_ids())
  );

DROP POLICY IF EXISTS "students_modify" ON public.students;
CREATE POLICY "students_modify" ON public.students
  FOR ALL TO authenticated USING (
    public.user_role() = 'ban_gl' OR class_id = ANY(public.user_class_ids())
  );

-- === 4. Policies cho scores ===
DROP POLICY IF EXISTS "scores_select" ON public.scores;
CREATE POLICY "scores_select" ON public.scores
  FOR SELECT TO authenticated USING (
    public.user_role() = 'ban_gl' OR 
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE public.students.id = student_id 
      AND public.students.class_id = ANY(public.user_class_ids())
    )
  );

DROP POLICY IF EXISTS "scores_modify" ON public.scores;
CREATE POLICY "scores_modify" ON public.scores
  FOR ALL TO authenticated USING (
    public.user_role() = 'ban_gl' OR 
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE public.students.id = student_id 
      AND public.students.class_id = ANY(public.user_class_ids())
    )
  );

-- === 5. Policies cho learning_logs ===
DROP POLICY IF EXISTS "logs_select" ON public.learning_logs;
CREATE POLICY "logs_select" ON public.learning_logs
  FOR SELECT TO authenticated USING (
    public.user_role() = 'ban_gl' OR 
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE public.students.id = student_id 
      AND public.students.class_id = ANY(public.user_class_ids())
    )
  );

DROP POLICY IF EXISTS "logs_modify" ON public.learning_logs;
CREATE POLICY "logs_modify" ON public.learning_logs
  FOR ALL TO authenticated USING (
    public.user_role() = 'ban_gl' OR 
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE public.students.id = student_id 
      AND public.students.class_id = ANY(public.user_class_ids())
    )
  );
