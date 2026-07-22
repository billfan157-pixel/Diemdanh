/**
 * Cấu hình Supabase — project gqmbhvgyoenweiepvrvk
 * Anon key mặc định đã gắn (public trên frontend là bình thường với Supabase).
 */
(function (GL) {
  "use strict";

  GL.SUPABASE_URL = "https://vugoskzssqhusnzcbfhm.supabase.co";
  GL.SUPABASE_ANON_KEY_STORAGE = "giao-ly-supabase-anon-v2";
  GL.SUPABASE_META_KEY = "giao-ly-supabase-meta-v2";
  /** Snapshot id trên bảng app_cloud */
  GL.SUPABASE_ROW_ID = "main";

  /**
   * anon public key — không gắn sẵn để tránh lộ key.
   * Người dùng tự cấu hình qua menu «Đồng bộ cloud».
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
