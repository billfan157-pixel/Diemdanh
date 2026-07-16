/**
 * Cấu hình Supabase — project gqmbhvgyoenweiepvrvk
 * Anon key mặc định đã gắn (public trên frontend là bình thường với Supabase).
 */
(function (GL) {
  "use strict";

  GL.SUPABASE_URL = "https://gqmbhvgyoenweiepvrvk.supabase.co";
  GL.SUPABASE_ANON_KEY_STORAGE = "giao-ly-supabase-anon-v2";
  GL.SUPABASE_META_KEY = "giao-ly-supabase-meta-v2";
  /** Snapshot id trên bảng app_cloud */
  GL.SUPABASE_ROW_ID = "main";

  /**
   * anon public key — gắn sẵn để mọi máy dùng chung cloud.
   * Vẫn có thể ghi đè bằng menu «Đồng bộ cloud».
   */
  GL.SUPABASE_ANON_KEY_DEFAULT =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbWJodmd5b2Vud2VpZXB2cnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxOTE0MDIsImV4cCI6MjA5OTc2NzQwMn0._jPtAkpaepFHzGVqpUZEA5wW8B3dJmrzkymlL_CtiE8";

  GL.getSupabaseAnonKey = function getSupabaseAnonKey() {
    try {
      var k = localStorage.getItem(GL.SUPABASE_ANON_KEY_STORAGE);
      if (k && String(k).trim()) return String(k).trim();
    } catch (e) {
      /* ignore */
    }
    return String(GL.SUPABASE_ANON_KEY_DEFAULT || "").trim();
  };

  GL.setSupabaseAnonKey = function setSupabaseAnonKey(key) {
    key = String(key || "").trim();
    if (key) localStorage.setItem(GL.SUPABASE_ANON_KEY_STORAGE, key);
    else localStorage.removeItem(GL.SUPABASE_ANON_KEY_STORAGE);
  };

  GL.isSupabaseConfigured = function isSupabaseConfigured() {
    return !!(GL.SUPABASE_URL && GL.getSupabaseAnonKey());
  };
})(window.GL = window.GL || {});
