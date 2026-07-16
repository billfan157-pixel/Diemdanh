/**
 * Cấu hình Supabase — project vugoskzssqhusnzcbfhmn
 * Anon key: dán trong app (menu Đồng bộ) hoặc set GL.SUPABASE_ANON_KEY_DEFAULT bên dưới.
 */
(function (GL) {
  "use strict";

  GL.SUPABASE_URL = "https://vugoskzssqhusnzcbfhmn.supabase.co";
  GL.SUPABASE_ANON_KEY_STORAGE = "giao-ly-supabase-anon-v1";
  GL.SUPABASE_META_KEY = "giao-ly-supabase-meta-v1";
  /** Snapshot id trên bảng app_cloud */
  GL.SUPABASE_ROW_ID = "main";

  /**
   * Tuỳ chọn: dán anon key vào đây (Settings → API → anon public)
   * để khỏi cấu hình trên từng máy. Key này public trên frontend là bình thường.
   */
  GL.SUPABASE_ANON_KEY_DEFAULT = "";

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
