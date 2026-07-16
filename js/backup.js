/**
 * Sao lưu / khôi phục toàn bộ dữ liệu (JSON).
 */
(function (GL) {
  "use strict";

  GL.buildFullBackup = function buildFullBackup() {
    return {
      app: "so-diem-giao-ly",
      version: 4,
      exportedAt: new Date().toISOString(),
      exportedBy: GL.currentUser
        ? (GL.currentUser() && GL.currentUser().displayName) || ""
        : "",
      state: GL.state,
      auth: GL.authStore
        ? {
            // không export PIN hash? export để restore multi-user — include
            version: GL.authStore.version,
            users: GL.authStore.users,
          }
        : null,
      print: typeof GL.getPrintSettings === "function" ? GL.getPrintSettings() : null,
      meta: {
        classCount: (GL.state && GL.state.classes && GL.state.classes.length) || 0,
        studentCount: ((GL.state && GL.state.classes) || []).reduce(function (n, c) {
          return n + (c.students ? c.students.length : 0);
        }, 0),
      },
    };
  };

  GL.getBackupMeta = function getBackupMeta() {
    try {
      var raw = localStorage.getItem(GL.BACKUP_META_KEY || "giao-ly-backup-meta-v1");
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === "object") return p;
      }
    } catch (e) {
      /* ignore */
    }
    return { lastAt: null, lastFile: "", count: 0 };
  };

  GL.saveBackupMeta = function saveBackupMeta(meta) {
    try {
      localStorage.setItem(
        GL.BACKUP_META_KEY || "giao-ly-backup-meta-v1",
        JSON.stringify(meta || {})
      );
    } catch (e) {
      console.warn("saveBackupMeta failed", e);
    }
  };

  GL.markBackupDone = function markBackupDone(filename, extra) {
    var meta = GL.getBackupMeta();
    meta.lastAt = new Date().toISOString();
    meta.lastFile = filename || meta.lastFile || "";
    meta.count = (meta.count || 0) + 1;
    if (extra && extra.folderName) meta.folderName = extra.folderName;
    if (extra && extra.mode) meta.lastMode = extra.mode; // folder | download
    GL.saveBackupMeta(meta);
    if (typeof GL.updateBackupReminderUI === "function") {
      GL.updateBackupReminderUI();
    }
    if (typeof GL.updateBackupFolderUI === "function") {
      GL.updateBackupFolderUI();
    }
    return meta;
  };

  /* ─── Thư mục sao lưu (File System Access API — Chrome/Edge) ─── */
  var BACKUP_DIR_DB = "giao-ly-backup-dir";
  var BACKUP_DIR_STORE = "handles";
  var BACKUP_DIR_KEY = "backupFolder";
  var _dirHandleCache = null;

  GL.canUseBackupFolder = function canUseBackupFolder() {
    return (
      typeof window !== "undefined" &&
      typeof window.showDirectoryPicker === "function" &&
      typeof indexedDB !== "undefined"
    );
  };

  function openHandleDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(BACKUP_DIR_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(BACKUP_DIR_STORE)) {
          db.createObjectStore(BACKUP_DIR_STORE);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("IndexedDB lỗi"));
      };
    });
  }

  GL.saveBackupDirHandle = async function saveBackupDirHandle(handle) {
    _dirHandleCache = handle || null;
    var db = await openHandleDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(BACKUP_DIR_STORE, "readwrite");
      var store = tx.objectStore(BACKUP_DIR_STORE);
      if (handle) store.put(handle, BACKUP_DIR_KEY);
      else store.delete(BACKUP_DIR_KEY);
      tx.oncomplete = function () {
        db.close();
        var meta = GL.getBackupMeta();
        meta.folderName = handle ? handle.name : "";
        meta.hasFolder = !!handle;
        GL.saveBackupMeta(meta);
        if (typeof GL.updateBackupFolderUI === "function") {
          GL.updateBackupFolderUI();
        }
        resolve(handle);
      };
      tx.onerror = function () {
        db.close();
        reject(tx.error);
      };
    });
  };

  GL.loadBackupDirHandle = async function loadBackupDirHandle() {
    if (_dirHandleCache) return _dirHandleCache;
    try {
      var db = await openHandleDb();
      var handle = await new Promise(function (resolve, reject) {
        var tx = db.transaction(BACKUP_DIR_STORE, "readonly");
        var store = tx.objectStore(BACKUP_DIR_STORE);
        var req = store.get(BACKUP_DIR_KEY);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          reject(req.error);
        };
        tx.oncomplete = function () {
          db.close();
        };
      });
      _dirHandleCache = handle;
      return handle;
    } catch (e) {
      console.warn("loadBackupDirHandle", e);
      return null;
    }
  };

  GL.clearBackupDirHandle = async function clearBackupDirHandle() {
    _dirHandleCache = null;
    try {
      await GL.saveBackupDirHandle(null);
    } catch (e) {
      /* ignore */
    }
    var meta = GL.getBackupMeta();
    meta.folderName = "";
    meta.hasFolder = false;
    GL.saveBackupMeta(meta);
    if (typeof GL.updateBackupFolderUI === "function") GL.updateBackupFolderUI();
  };

  /** Xin quyền ghi lại (sau khi mở lại trình duyệt) */
  GL.ensureBackupDirPermission = async function ensureBackupDirPermission(
    handle
  ) {
    if (!handle) return false;
    try {
      var q = await handle.queryPermission({ mode: "readwrite" });
      if (q === "granted") return true;
      var r = await handle.requestPermission({ mode: "readwrite" });
      return r === "granted";
    } catch (e) {
      console.warn(e);
      return false;
    }
  };

  /**
   * Chọn / tạo thư mục sao lưu (nên chọn thư mục backups trong project).
   * Chrome: có thể bấm "New folder" trong hộp thoại.
   */
  GL.pickBackupFolder = async function pickBackupFolder() {
    if (!GL.canUseBackupFolder()) {
      GL.toast(
        "Trình duyệt không hỗ trợ chọn thư mục (dùng Chrome/Edge). Sẽ tải file như Downloads.",
        "warn"
      );
      return null;
    }
    try {
      var handle = await window.showDirectoryPicker({
        id: "so-diem-giao-ly-backups",
        mode: "readwrite",
        startIn: "documents",
      });
      // Thử tạo subfolder "backups" bên trong nếu user chọn thư mục cha
      // Không tự ép — lưu đúng folder user chọn
      await GL.saveBackupDirHandle(handle);
      GL.toast(
        'Đã gắn thư mục sao lưu: «' +
          handle.name +
          '». Lần sau bấm Sao lưu sẽ ghi vào đây.'
      );
      return handle;
    } catch (e) {
      if (e && e.name === "AbortError") return null;
      console.error(e);
      GL.toast("Không chọn được thư mục: " + (e.message || e), "err");
      return null;
    }
  };

  /** Ghi blob vào thư mục đã chọn */
  GL.writeBackupToFolder = async function writeBackupToFolder(blob, filename) {
    var handle = await GL.loadBackupDirHandle();
    if (!handle) return { ok: false, reason: "no-folder" };
    var okPerm = await GL.ensureBackupDirPermission(handle);
    if (!okPerm) return { ok: false, reason: "no-permission" };
    try {
      var fileHandle = await handle.getFileHandle(filename, { create: true });
      var writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, folderName: handle.name, filename: filename };
    } catch (e) {
      console.error(e);
      return { ok: false, reason: "write-error", error: e };
    }
  };

  GL.updateBackupFolderUI = function updateBackupFolderUI() {
    var el = document.getElementById("backupFolderStatus");
    var meta = GL.getBackupMeta();
    var support = GL.canUseBackupFolder();
    if (!el) return;
    if (!support) {
      el.innerHTML =
        'Trình duyệt này <strong>không hỗ trợ</strong> ghi thẳng vào thư mục (dùng Chrome/Edge). Sao lưu sẽ tải về thư mục Tải xuống.';
      el.className = "hint app-notice-warn";
      return;
    }
    if (meta.hasFolder && meta.folderName) {
      el.innerHTML =
        '📁 Thư mục: <strong>' +
        GL.escapeHtml(meta.folderName) +
        '</strong> — file sẽ lưu vào đây khi sao lưu.' +
        ' <button type="button" class="btn btn-ghost" id="backupFolderChangeBtn" style="padding:2px 8px;font-size:0.78rem;margin-left:4px">Đổi…</button>' +
        ' <button type="button" class="btn btn-ghost" id="backupFolderClearBtn" style="padding:2px 8px;font-size:0.78rem">Bỏ gắn</button>';
      el.className = "hint app-notice-ok";
    } else {
      el.innerHTML =
        'Chưa gắn thư mục. Nên tạo/chọn thư mục <strong>backups</strong> trong project (vd. <code>tinh-diem/backups</code>).' +
        ' <button type="button" class="btn btn-primary" id="backupFolderPickBtn" style="padding:4px 10px;font-size:0.8rem;margin-left:6px">Chọn thư mục backups</button>';
      el.className = "hint app-notice-info";
    }
  };

  /**
   * Trạng thái sao lưu cho UI.
   * @returns {{ lastAt: string|null, daysAgo: number|null, needsRemind: boolean, label: string, never: boolean }}
   */
  GL.getBackupStatus = function getBackupStatus() {
    var meta = GL.getBackupMeta();
    var lastAt = meta.lastAt || null;
    var days = GL.BACKUP_REMIND_DAYS != null ? GL.BACKUP_REMIND_DAYS : 7;
    var snoozed = false;
    try {
      var sn = Number(localStorage.getItem("giao-ly-backup-snooze") || 0);
      snoozed = Date.now() < sn;
    } catch (e) {
      /* ignore */
    }
    if (!lastAt) {
      return {
        lastAt: null,
        daysAgo: null,
        needsRemind: !snoozed,
        never: true,
        label: "Chưa từng sao lưu trên máy này",
        level: "danger",
      };
    }
    var t = Date.parse(lastAt);
    var daysAgo = Math.floor((Date.now() - t) / (24 * 3600 * 1000));
    if (daysAgo < 0) daysAgo = 0;
    var needs = daysAgo >= days && !snoozed;
    var label;
    if (daysAgo === 0) label = "Đã sao lưu hôm nay";
    else if (daysAgo === 1) label = "Sao lưu lần cuối: hôm qua";
    else label = "Sao lưu lần cuối: " + daysAgo + " ngày trước";
    return {
      lastAt: lastAt,
      daysAgo: daysAgo,
      needsRemind: needs,
      never: false,
      label: label,
      level: needs ? (daysAgo >= days * 2 ? "danger" : "warn") : "ok",
      lastFile: meta.lastFile || "",
      count: meta.count || 0,
    };
  };

  function fallbackDownload(blob, name) {
    if (typeof GL.downloadBlob === "function") {
      GL.downloadBlob(blob, name);
      return;
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  }

  /**
   * Sao lưu. Ưu tiên ghi vào thư mục đã gắn; không có thì tải về Downloads.
   * @returns {Promise<object|null>}
   */
  GL.exportBackup = async function exportBackup() {
    if (typeof GL.requireBanGL === "function" && !GL.requireBanGL()) return null;
    try {
      var data = GL.buildFullBackup();
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: "application/json;charset=utf-8" });
      var now = new Date();
      var date = now.toISOString().slice(0, 10);
      var hh = now.getHours();
      var mm = now.getMinutes();
      var time =
        (hh < 10 ? "0" : "") + hh + (mm < 10 ? "0" : "") + mm;
      var name = "backup-so-diem-giao-ly-" + date + "-" + time + ".json";

      // Có thư mục gắn → ghi thẳng
      var folderWrite = await GL.writeBackupToFolder(blob, name);
      if (folderWrite && folderWrite.ok) {
        GL.markBackupDone(name, {
          folderName: folderWrite.folderName,
          mode: "folder",
        });
        GL.toast(
          "Đã lưu vào thư mục «" +
            folderWrite.folderName +
            "» · " +
            data.meta.classCount +
            " lớp · " +
            data.meta.studentCount +
            " HV · " +
            name
        );
        return {
          ok: true,
          filename: name,
          mode: "folder",
          folderName: folderWrite.folderName,
          data: data,
        };
      }

      // Chưa có folder: nếu hỗ trợ API → hỏi chọn (một lần)
      if (
        folderWrite &&
        folderWrite.reason === "no-folder" &&
        GL.canUseBackupFolder()
      ) {
        var pick = await GL.confirm({
          title: "Chọn thư mục sao lưu?",
          message:
            "Lần đầu: chọn (hoặc tạo) thư mục backups trong project.\n\nVí dụ: tinh-diem/backups\n\nLần sau sẽ tự lưu vào đó. Hủy = tải về thư mục Tải xuống như cũ.",
          type: "info",
          okText: "Chọn thư mục",
          cancelText: "Tải về Downloads",
        });
        if (pick) {
          var dir = await GL.pickBackupFolder();
          if (dir) {
            var w2 = await GL.writeBackupToFolder(blob, name);
            if (w2 && w2.ok) {
              GL.markBackupDone(name, {
                folderName: w2.folderName,
                mode: "folder",
              });
              GL.toast(
                "Đã lưu vào «" +
                  w2.folderName +
                  "» · " +
                  name
              );
              return {
                ok: true,
                filename: name,
                mode: "folder",
                folderName: w2.folderName,
                data: data,
              };
            }
          }
        }
      } else if (folderWrite && folderWrite.reason === "no-permission") {
        GL.toast(
          "Cần cho phép ghi lại thư mục sao lưu. Bấm «Đổi…» trong mục Sao lưu để chọn lại.",
          "warn"
        );
        var dir2 = await GL.pickBackupFolder();
        if (dir2) {
          var w3 = await GL.writeBackupToFolder(blob, name);
          if (w3 && w3.ok) {
            GL.markBackupDone(name, {
              folderName: w3.folderName,
              mode: "folder",
            });
            GL.toast("Đã lưu vào «" + w3.folderName + "» · " + name);
            return {
              ok: true,
              filename: name,
              mode: "folder",
              folderName: w3.folderName,
              data: data,
            };
          }
        }
      }

      // Fallback download
      fallbackDownload(blob, name);
      GL.markBackupDone(name, { mode: "download" });
      GL.toast(
        "Đã tải backup " +
          data.meta.classCount +
          " lớp · " +
          data.meta.studentCount +
          " HV → " +
          name +
          " (thư mục Tải xuống)"
      );
      return { ok: true, filename: name, mode: "download", data: data };
    } catch (err) {
      console.error(err);
      GL.toast("Lỗi sao lưu: " + (err.message || err), "err");
      return null;
    }
  };

  /** Banner / sidebar trạng thái backup (admin) */
  GL.updateBackupReminderUI = function updateBackupReminderUI() {
    var banner = document.getElementById("backupReminderBanner");
    var side = document.getElementById("backupStatusSide");
    var isAdmin = typeof GL.isBanGL === "function" && GL.isBanGL();
    var st =
      typeof GL.getBackupStatus === "function"
        ? GL.getBackupStatus()
        : { needsRemind: false, label: "", level: "ok" };

    if (banner) {
      if (!isAdmin) {
        banner.classList.add("hidden");
      } else if (st.needsRemind) {
        banner.classList.remove("hidden");
        banner.className =
          "backup-reminder-banner " +
          (st.level === "danger"
            ? "backup-reminder-danger"
            : "backup-reminder-warn");
        var msg = document.getElementById("backupReminderMsg");
        if (msg) {
          msg.innerHTML = st.never
            ? "⚠️ <strong>Chưa có bản sao lưu</strong> trên máy này. Nên tải file JSON ngay để tránh mất dữ liệu."
            : "⚠️ <strong>" +
              GL.escapeHtml(st.label) +
              "</strong>. Nên sao lưu định kỳ (gợi ý mỗi " +
              (GL.BACKUP_REMIND_DAYS || 7) +
              " ngày).";
        }
      } else {
        banner.classList.add("hidden");
      }
    }

    if (side) {
      if (!isAdmin) {
        side.classList.add("hidden");
      } else {
        side.classList.remove("hidden");
        side.className =
          "backup-status-side backup-status-" + (st.level || "ok");
        var meta = GL.getBackupMeta();
        var folderLine = meta.hasFolder && meta.folderName
          ? '<div class="bss-folder">📁 ' +
            GL.escapeHtml(meta.folderName) +
            "</div>"
          : '<div class="bss-folder muted">📁 Chưa gắn thư mục</div>';
        side.innerHTML =
          '<div class="bss-label">💾 ' +
          GL.escapeHtml(st.label) +
          "</div>" +
          folderLine +
          '<button type="button" class="btn btn-success btn-block" id="quickBackupBtn" style="margin-top:8px;font-size:0.82rem">Sao lưu ngay</button>';
      }
    }
    if (typeof GL.updateBackupFolderUI === "function") {
      GL.updateBackupFolderUI();
    }
  };

  GL.restoreBackupFromObject = function restoreBackupFromObject(data, mode) {
    mode = mode || "replace";
    if (!data || !data.state || !Array.isArray(data.state.classes)) {
      throw new Error("File backup không hợp lệ (thiếu state.classes).");
    }

    if (mode === "replace") {
      GL.state = {
        version: data.state.version || 3,
        activeClassId: data.state.activeClassId || null,
        classes: data.state.classes,
      };
    } else {
      // merge classes by id or name
      var map = {};
      GL.state.classes.forEach(function (c) {
        map[c.id] = c;
      });
      data.state.classes.forEach(function (c) {
        if (map[c.id]) {
          // gộp học viên theo tên
          var existing = map[c.id];
          (c.students || []).forEach(function (st) {
            var found = (existing.students || []).find(function (s) {
              return GL.normStudent(s) === GL.normStudent(st);
            });
            if (!found) {
              existing.students = existing.students || [];
              existing.students.push(st);
            }
          });
          existing.updatedAt = Date.now();
        } else {
          GL.state.classes.push(c);
          map[c.id] = c;
        }
      });
    }

    // migrate students
    GL.state.classes.forEach(function (c) {
      if (!c.weights) c.weights = GL.defaultWeights();
      (c.students || []).forEach(function (st) {
        GL.ensureNameFields(st);
        if (typeof GL.ensureStudentTerms === "function") GL.ensureStudentTerms(st);
      });
    });

    if (data.auth && Array.isArray(data.auth.users) && data.auth.users.length) {
      if (mode === "replace" || !GL.authStore.users.length) {
        GL.authStore = {
          version: data.auth.version || 1,
          users: data.auth.users,
        };
        GL.saveAuthStore();
      }
    }

    if (data.print && typeof GL.savePrintSettings === "function") {
      GL.savePrintSettings(
        Object.assign(GL.defaultPrintSettings(), data.print)
      );
    }

    if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Khôi phục backup");
    GL.saveState();
    // Backup = mốc mới — xóa stack undo/redo cũ
    if (typeof GL.clearUndoStacks === "function") GL.clearUndoStacks();
    if (typeof GL.ensureActiveClassAccessible === "function") {
      GL.ensureActiveClassAccessible();
    }
  };

  GL.importBackupFile = async function importBackupFile(file, mode) {
    if (typeof GL.requireBanGL === "function" && !GL.requireBanGL()) return;
    if (!file) return;
    var text = await file.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("File không phải JSON hợp lệ.");
    }
    if (data.app && data.app !== "so-diem-giao-ly") {
      // still try if has state
      if (!data.state) throw new Error("Không phải backup Sổ Điểm Giáo Lý.");
    }
    GL.restoreBackupFromObject(data, mode);
    var n = data.meta && data.meta.classCount != null
      ? data.meta.classCount
      : data.state.classes.length;
    GL.toast("Đã khôi phục backup (" + n + " lớp).");
    if (typeof GL.render === "function") GL.render();
  };
})(window.GL = window.GL || {});
