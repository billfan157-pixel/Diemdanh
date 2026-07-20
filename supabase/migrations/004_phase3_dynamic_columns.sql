-- =========================================================
-- Phase 3: Dynamic score columns + parent tokens
-- =========================================================

-- Allow any col_key (drop hardcoded CHECK)
ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_col_key_check;

-- Store per-class column definitions
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS columns JSONB NOT NULL DEFAULT '[
    {"key":"khaoKinh","short":"KK","label":"Khảo kinh","defaultWeight":1},
    {"key":"thuocBai","short":"TB","label":"Thuộc bài","defaultWeight":1},
    {"key":"chuyenCan","short":"CC","label":"Chuyên cần","defaultWeight":1},
    {"key":"baiTap","short":"BT","label":"Bài tập","defaultWeight":1},
    {"key":"thaiDo","short":"TĐ","label":"Thái độ","defaultWeight":1},
    {"key":"kiemTra","short":"KT","label":"Kiểm tra","defaultWeight":1}
  ]'::jsonb;

-- Parent read-only report tokens
CREATE TABLE IF NOT EXISTS public.parent_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT NOT NULL,
  label TEXT,
  revoked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_parent_tokens_token ON public.parent_tokens(token);
CREATE INDEX IF NOT EXISTS idx_parent_tokens_student ON public.parent_tokens(student_id);

ALTER TABLE public.parent_tokens ENABLE ROW LEVEL SECURITY;

-- Ban GL / GLV can manage tokens for their classes; anon can read valid token by exact match via RPC if needed.
DROP POLICY IF EXISTS parent_tokens_member_all ON public.parent_tokens;
CREATE POLICY parent_tokens_member_all ON public.parent_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.parish_members m
      WHERE m.user_id = auth.uid()
        AND m.active = true
        AND (
          m.role = 'ban_gl'
          OR class_id = ANY (m.class_ids)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parish_members m
      WHERE m.user_id = auth.uid()
        AND m.active = true
        AND (
          m.role = 'ban_gl'
          OR class_id = ANY (m.class_ids)
        )
    )
  );

-- Public read of a single non-expired, non-revoked token (for PH link)
DROP POLICY IF EXISTS parent_tokens_public_read ON public.parent_tokens;
CREATE POLICY parent_tokens_public_read ON public.parent_tokens
  FOR SELECT
  USING (revoked = false AND expires_at > now());
