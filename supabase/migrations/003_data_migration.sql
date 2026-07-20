-- =========================================================
-- Sổ Điểm Giáo Lý — Script Chuyển Đổi Dữ Liệu (Phase 2)
-- Chạy một lần duy nhất để giải nén JSON blob thành quan hệ.
-- =========================================================

CREATE OR REPLACE FUNCTION public.migrate_legacy_data()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  main_state JSONB;
  main_auth JSONB;
  class_record JSONB;
  student_record JSONB;
  score_col TEXT;
  score_values NUMERIC[];
  log_entry JSONB;
  user_entry JSONB;
  dummy_user_id UUID;
BEGIN
  -- 1. Lấy dữ liệu legacy từ app_cloud
  SELECT state, auth INTO main_state, main_auth
  FROM public.app_cloud
  WHERE id = 'main'
  LIMIT 1;

  IF main_state IS NULL THEN
    RAISE NOTICE 'Không tìm thấy dữ liệu legacy trong app_cloud với id="main"';
    RETURN;
  END IF;

  RAISE NOTICE 'Đang thực hiện migration...';

  -- 2. Migrate Classes
  FOR class_record IN SELECT * FROM jsonb_array_elements(main_state -> 'classes')
  LOOP
    INSERT INTO public.classes (id, name, year, weights, rev, created_at, updated_at)
    VALUES (
      class_record ->> 'id',
      class_record ->> 'name',
      class_record ->> 'year',
      COALESCE(class_record -> 'weights', '{"khaoKinh":1,"thuocBai":1,"chuyenCan":1,"baiTap":1,"thaiDo":1,"kiemTra":1}'::jsonb),
      COALESCE((class_record ->> 'rev')::bigint, 1),
      TO_TIMESTAMP((COALESCE(class_record ->> 'createdAt', '0')::bigint) / 1000.0),
      TO_TIMESTAMP((COALESCE(class_record ->> 'updatedAt', '0')::bigint) / 1000.0)
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. Migrate Students cho mỗi Class
    FOR student_record IN SELECT * FROM jsonb_array_elements(class_record -> 'students')
    LOOP
      INSERT INTO public.students (
        id, class_id, ten_thanh, ho_dem, ten, name, ma_hv, ngay_sinh, 
        gioi_tinh, ten_phu_huynh, sd_phu_huynh, dia_chi, email, ghi_chu, rev, created_at, updated_at
      )
      VALUES (
        student_record ->> 'id',
        class_record ->> 'id',
        COALESCE(student_record ->> 'tenThanh', ''),
        COALESCE(student_record ->> 'hoDem', ''),
        COALESCE(student_record ->> 'ten', ''),
        COALESCE(student_record ->> 'name', ''),
        COALESCE(student_record ->> 'maHV', ''),
        COALESCE(student_record ->> 'ngaySinh', ''),
        COALESCE(student_record ->> 'gioiTinh', ''),
        COALESCE(student_record ->> 'tenPhuHuynh', ''),
        COALESCE(student_record ->> 'sdPhuHuynh', ''),
        COALESCE(student_record ->> 'diaChi', ''),
        COALESCE(student_record ->> 'email', ''),
        COALESCE(student_record ->> 'ghiChu', ''),
        COALESCE((student_record ->> 'rev')::bigint, 1),
        TO_TIMESTAMP((COALESCE(student_record ->> 'createdAt', '0')::bigint) / 1000.0),
        TO_TIMESTAMP((COALESCE(student_record ->> 'updatedAt', '0')::bigint) / 1000.0)
      )
      ON CONFLICT (id) DO NOTHING;

      -- 4. Migrate Scores (hk1 và hk2)
      FOR score_col IN VALUES ('khaoKinh'), ('thuocBai'), ('chuyenCan'), ('baiTap'), ('thaiDo'), ('kiemTra')
      LOOP
        -- HK1
        IF student_record -> 'scoresByTerm' -> 'hk1' -> score_col IS NOT NULL THEN
          SELECT ARRAY(SELECT value::numeric FROM jsonb_array_elements(student_record -> 'scoresByTerm' -> 'hk1' -> score_col)) INTO score_values;
          IF ARRAY_LENGTH(score_values, 1) > 0 THEN
            INSERT INTO public.scores (student_id, term, col_key, values, rev)
            VALUES (student_record ->> 'id', 'hk1', score_col, score_values, 1)
            ON CONFLICT (student_id, term, col_key) DO UPDATE SET values = excluded.values;
          END IF;
        END IF;

        -- HK2
        IF student_record -> 'scoresByTerm' -> 'hk2' -> score_col IS NOT NULL THEN
          SELECT ARRAY(SELECT value::numeric FROM jsonb_array_elements(student_record -> 'scoresByTerm' -> 'hk2' -> score_col)) INTO score_values;
          IF ARRAY_LENGTH(score_values, 1) > 0 THEN
            INSERT INTO public.scores (student_id, term, col_key, values, rev)
            VALUES (student_record ->> 'id', 'hk2', score_col, score_values, 1)
            ON CONFLICT (student_id, term, col_key) DO UPDATE SET values = excluded.values;
          END IF;
        END IF;
      END LOOP;

      -- 5. Migrate Learning Logs
      IF student_record -> 'learningLog' IS NOT NULL THEN
        FOR log_entry IN SELECT * FROM jsonb_array_elements(student_record -> 'learningLog')
        LOOP
          INSERT INTO public.learning_logs (id, student_id, date, type, level, text, by_user_id, by_name, at)
          VALUES (
            log_entry ->> 'id',
            student_record ->> 'id',
            COALESCE(log_entry ->> 'date', ''),
            COALESCE(log_entry ->> 'type', ''),
            COALESCE(log_entry ->> 'level', ''),
            COALESCE(log_entry ->> 'text', ''),
            COALESCE(log_entry ->> 'byUserId', ''),
            COALESCE(log_entry ->> 'byName', ''),
            COALESCE((log_entry ->> 'at')::bigint, 0)
          )
          ON CONFLICT (id) DO NOTHING;
        END LOOP;
      END IF;

    END LOOP;
  END LOOP;

  -- 6. Di chuyển bảng app_cloud cũ thành app_cloud_legacy để backup
  ALTER TABLE IF EXISTS public.app_cloud RENAME TO app_cloud_legacy;

  RAISE NOTICE 'Migration hoàn tất thành công!';
END;
$$;

-- Thực thi migration
SELECT public.migrate_legacy_data();
DROP FUNCTION IF EXISTS public.migrate_legacy_data();
