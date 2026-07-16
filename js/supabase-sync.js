/**
 * Đồng bộ state + auth + print lên Supabase (bảng app_cloud).
 * Cần: schema.sql đã chạy + anon key + HTTPS/mạng.
 */
(function (GL) {
  "use strict";

  var pushTimer = null;
  var pushing = false;
  var pulling = false;
  var channel = null;
  var applyingRemote = false;

  function loadMeta() {
    try {
      var raw = localStorage.getItem(GL.SUPABASE_META_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch (e) {
      /* ignore */
    }
    return {};
  }

  function saveMeta(meta) {
    localStorage.setItem(GL.SUPABASE_META_KEY, JSON.stringify(meta || {}));
  }

  GL.getSyncMeta = function getSyncMeta() {
    return loadMeta();
  };

  GL.getSupabaseClient = function getSupabaseClient() {
    if (!GL.isSupabaseConfigured || !GL.isSupabaseConfigured()) return null;
    if (typeof supabase === "undefined" || !supabase.createClient) return null;
    if (GL._sbClient) return GL._sbClient;
    try {
      GL._sbClient = supabase.createClient(
        GL.SUPABASE_URL,
        GL.getSupabaseAnonKey(),
        {
          auth: { persistSession: false, autoRefreshToken: false },
        }
      );
      return GL._sbClient;
    } catch (e) {
      console.warn("Supabase client error", e);
      return null;
    }
  };

  /** Reset client khi đổi key */
  GL.resetSupabaseClient = function resetSupabaseClient() {
    if (channel && GL._sbClient) {
      try {
        GL._sbClient.removeChannel(channel);
      } catch (e) {
        /* ignore */
      }
    }
    channel = null;
    GL._sbClient = null;
  };

  function setStatus(status, message) {
    GL._syncStatus = { status: status, message: message || "", at: Date.now() };
    if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
  }

  GL.getSyncStatus = function getSyncStatus() {
    return (
      GL._syncStatus || { status: "idle", message: "", at: 0 }
    );
  };

  function buildPayload() {
    var print = {};
    try {
      if (typeof GL.getPrintSettings === "function") {
        print = GL.getPrintSettings() || {};
      }
    } catch (e) {
      /* ignore */
    }
    return {
      state: GL.state || { version: 3, activeClassId: null, classes: [] },
      auth: GL.authStore || { version: 1, users: [] },
      print: print,
      updated_by:
        (typeof GL.currentUser === "function" &&
          GL.currentUser() &&
          (GL.currentUser().username || GL.currentUser().id)) ||
        "unknown",
    };
  }

  function applyCloudRow(row, opts) {
    opts = opts || {};
    if (!row) return false;
    applyingRemote = true;
    try {
      if (row.state && typeof row.state === "object") {
        GL.state = row.state;
        if (!GL.state.classes) GL.state.classes = [];
        GL.state.classes.forEach(function (c) {
          if (!c.weights && typeof GL.defaultWeights === "function") {
            c.weights = GL.defaultWeights();
          }
          if (Array.isArray(c.students)) {
            c.students.forEach(function (st) {
              if (typeof GL.ensureNameFields === "function") {
                GL.ensureNameFields(st);
              }
              if (typeof GL.ensureStudentTerms === "function") {
                GL.ensureStudentTerms(st);
              }
              if (typeof GL.ensureLearningLog === "function") {
                GL.ensureLearningLog(st);
              }
            });
          }
        });
        localStorage.setItem(GL.STORAGE_KEY, JSON.stringify(GL.state));
        if (typeof GL.syncUndoBaseline === "function") {
          GL.syncUndoBaseline(true);
        }
      }
      if (row.auth && typeof row.auth === "object" && Array.isArray(row.auth.users)) {
        GL.authStore = row.auth;
        if (typeof GL.saveAuthStore === "function") {
          // ghi local, không trigger push lồng
          localStorage.setItem(GL.AUTH_KEY, JSON.stringify(GL.authStore));
        }
      }
      if (row.print && typeof row.print === "object") {
        if (typeof GL.savePrintSettings === "function") {
          localStorage.setItem(
            GL.PRINT_KEY,
            JSON.stringify(
              Object.assign(
                typeof GL.defaultPrintSettings === "function"
                  ? GL.defaultPrintSettings()
                  : {},
                row.print
              )
            )
          );
        }
      }
      var meta = loadMeta();
      meta.lastRev = row.rev || 0;
      meta.lastRemoteAt = row.updated_at || null;
      meta.lastPullAt = Date.now();
      saveMeta(meta);

      if (typeof GL.ensureActiveClassAccessible === "function") {
        GL.ensureActiveClassAccessible();
      }
      if (opts.render !== false && typeof GL.render === "function") {
        GL.render();
      }
      return true;
    } finally {
      applyingRemote = false;
    }
  }

  /**
   * Kéo dữ liệu từ cloud.
   * @param {{force?:boolean, silent?:boolean}} opts
   */
  GL.cloudPull = function cloudPull(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (pulling) {
        resolve({ ok: false, error: "Đang kéo dữ liệu…" });
        return;
      }
      var client = GL.getSupabaseClient();
      if (!client) {
        setStatus("off", "Chưa cấu hình Supabase");
        resolve({ ok: false, error: "Chưa cấu hình Supabase (anon key)." });
        return;
      }
      pulling = true;
      setStatus("syncing", "Đang tải từ cloud…");
      client
        .from("app_cloud")
        .select("*")
        .eq("id", GL.SUPABASE_ROW_ID || "main")
        .maybeSingle()
        .then(function (res) {
          pulling = false;
          if (res.error) {
            setStatus("err", res.error.message || "Lỗi pull");
            resolve({ ok: false, error: res.error.message || String(res.error) });
            return;
          }
          var row = res.data;
          if (!row) {
            // chưa có row — đẩy local lên
            setStatus("ok", "Cloud trống — sẽ tải lên");
            GL.cloudPush({ force: true, silent: true }).then(function (p) {
              resolve(
                p.ok
                  ? { ok: true, empty: true, pushed: true }
                  : { ok: false, error: p.error || "Không tạo được bản cloud" }
              );
            });
            return;
          }
          var meta = loadMeta();
          var remoteRev = Number(row.rev) || 0;
          var localRev = Number(meta.lastRev) || 0;
          var localHasData =
            GL.state &&
            Array.isArray(GL.state.classes) &&
            GL.state.classes.length > 0;

          // Lần đầu máy trống → luôn lấy cloud
          // Máy có data + remote mới hơn → lấy cloud
          // force → luôn lấy
          var shouldApply =
            opts.force ||
            !localHasData ||
            remoteRev > localRev ||
            !meta.lastPullAt;

          if (!shouldApply) {
            setStatus("ok", "Đã đồng bộ (rev " + remoteRev + ")");
            resolve({ ok: true, skipped: true, rev: remoteRev });
            return;
          }

          applyCloudRow(row, { render: opts.render !== false });
          setStatus("ok", "Đã tải từ cloud · rev " + remoteRev);
          if (!opts.silent && typeof GL.toast === "function") {
            GL.toast("☁️ Đã đồng bộ từ cloud");
          }
          resolve({ ok: true, applied: true, rev: remoteRev });
        })
        .catch(function (err) {
          pulling = false;
          var msg = (err && err.message) || String(err);
          setStatus("err", msg);
          resolve({ ok: false, error: msg });
        });
    });
  };

  /**
   * Đẩy local lên cloud.
   */
  GL.cloudPush = function cloudPush(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (applyingRemote && !opts.force) {
        resolve({ ok: true, skipped: true });
        return;
      }
      if (pushing) {
        resolve({ ok: false, error: "Đang đẩy…" });
        return;
      }
      var client = GL.getSupabaseClient();
      if (!client) {
        setStatus("off", "Chưa cấu hình Supabase");
        resolve({ ok: false, error: "Chưa cấu hình Supabase." });
        return;
      }
      pushing = true;
      setStatus("syncing", "Đang lưu lên cloud…");

      // Đọc rev hiện tại để tránh ghi đè mù (best-effort)
      client
        .from("app_cloud")
        .select("rev, updated_at")
        .eq("id", GL.SUPABASE_ROW_ID || "main")
        .maybeSingle()
        .then(function (cur) {
          if (cur.error && cur.error.code !== "PGRST116") {
            pushing = false;
            setStatus("err", cur.error.message);
            resolve({ ok: false, error: cur.error.message });
            return;
          }
          var remoteRev = (cur.data && Number(cur.data.rev)) || 0;
          var meta = loadMeta();
          var localRev = Number(meta.lastRev) || 0;

          // Remote mới hơn local đã biết → kéo trước (tránh đè mất data máy khác)
          if (
            !opts.force &&
            remoteRev > localRev &&
            cur.data &&
            cur.data.updated_at
          ) {
            pushing = false;
            return GL.cloudPull({ force: true, silent: true }).then(function () {
              if (!opts.silent && typeof GL.toast === "function") {
                GL.toast(
                  "☁️ Máy khác đã cập nhật — đã tải bản mới. Sửa lại nếu cần.",
                  "warn"
                );
              }
              resolve({
                ok: false,
                conflict: true,
                error: "Cloud có bản mới hơn — đã tải về.",
              });
            });
          }

          var payload = buildPayload();
          var nextRev = remoteRev + 1;
          var body = {
            id: GL.SUPABASE_ROW_ID || "main",
            state: payload.state,
            auth: payload.auth,
            print: payload.print,
            updated_at: new Date().toISOString(),
            updated_by: payload.updated_by,
            rev: nextRev,
          };

          return client
            .from("app_cloud")
            .upsert(body, { onConflict: "id" })
            .select("rev, updated_at")
            .single()
            .then(function (up) {
              pushing = false;
              if (up.error) {
                setStatus("err", up.error.message);
                resolve({ ok: false, error: up.error.message });
                return;
              }
              var m = loadMeta();
              m.lastRev = (up.data && up.data.rev) || nextRev;
              m.lastRemoteAt = (up.data && up.data.updated_at) || body.updated_at;
              m.lastPushAt = Date.now();
              saveMeta(m);
              setStatus("ok", "Đã lưu cloud · rev " + m.lastRev);
              if (!opts.silent && typeof GL.toast === "function") {
                GL.toast("☁️ Đã lưu lên cloud");
              }
              resolve({ ok: true, rev: m.lastRev });
            });
        })
        .catch(function (err) {
          pushing = false;
          var msg = (err && err.message) || String(err);
          setStatus("err", msg);
          resolve({ ok: false, error: msg });
        });
    });
  };

  /** Debounce push khi save local */
  GL.scheduleCloudPush = function scheduleCloudPush() {
    if (applyingRemote) return;
    if (!GL.isSupabaseConfigured || !GL.isSupabaseConfigured()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      GL.cloudPush({ silent: true }).then(function (r) {
        if (!r.ok && r.conflict) {
          /* đã toast trong push */
        } else if (!r.ok && r.error && typeof GL.toast === "function") {
          // chỉ báo lỗi mạng thỉnh thoảng
          if (String(r.error).indexOf("Failed to fetch") >= 0) {
            setStatus("err", "Mất mạng — chưa lưu cloud");
          }
        }
      });
    }, 1600);
  };

  GL.startCloudRealtime = function startCloudRealtime() {
    var client = GL.getSupabaseClient();
    if (!client || channel) return;
    try {
      channel = client
        .channel("app_cloud_main")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "app_cloud",
            filter: "id=eq." + (GL.SUPABASE_ROW_ID || "main"),
          },
          function (payload) {
            var row = payload.new || payload.record;
            if (!row) return;
            var meta = loadMeta();
            var remoteRev = Number(row.rev) || 0;
            var localRev = Number(meta.lastRev) || 0;
            if (remoteRev <= localRev) return;
            if (pushing) return;
            applyCloudRow(row, { render: true });
            setStatus("ok", "Máy khác cập nhật · rev " + remoteRev);
            if (typeof GL.toast === "function") {
              GL.toast("☁️ Có cập nhật từ máy khác");
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime failed", e);
    }
  };

  GL.stopCloudRealtime = function stopCloudRealtime() {
    if (channel && GL._sbClient) {
      try {
        GL._sbClient.removeChannel(channel);
      } catch (e) {
        /* ignore */
      }
    }
    channel = null;
  };

  /** Gọi sau đăng nhập / vào app */
  GL.initCloudSync = function initCloudSync() {
    if (!GL.isSupabaseConfigured || !GL.isSupabaseConfigured()) {
      setStatus("off", "Chưa cấu hình cloud");
      return Promise.resolve({ ok: false, error: "not configured" });
    }
    if (typeof supabase === "undefined") {
      setStatus("err", "Chưa tải thư viện Supabase");
      return Promise.resolve({ ok: false, error: "no sdk" });
    }
    return GL.cloudPull({ silent: true }).then(function (r) {
      GL.startCloudRealtime();
      if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
      return r;
    });
  };

  // Hook saveState
  var _saveState = null;
  GL.installCloudHooks = function installCloudHooks() {
    if (!_saveState && typeof GL.saveState === "function") {
      _saveState = GL.saveState;
      GL.saveState = function saveStateCloud(opts) {
        var r = _saveState.apply(this, arguments);
        if (!applyingRemote) GL.scheduleCloudPush();
        return r;
      };
    }
    if (typeof GL.saveAuthStore === "function" && !GL.saveAuthStore._cloud) {
      var _saveAuth = GL.saveAuthStore;
      GL.saveAuthStore = function () {
        var r = _saveAuth.apply(this, arguments);
        if (!applyingRemote) GL.scheduleCloudPush();
        return r;
      };
      GL.saveAuthStore._cloud = true;
    }
    if (
      typeof GL.savePrintSettings === "function" &&
      !GL.savePrintSettings._cloud
    ) {
      var _savePrint = GL.savePrintSettings;
      GL.savePrintSettings = function () {
        var r = _savePrint.apply(this, arguments);
        if (!applyingRemote) GL.scheduleCloudPush();
        return r;
      };
      GL.savePrintSettings._cloud = true;
    }
  };
})(window.GL = window.GL || {});
