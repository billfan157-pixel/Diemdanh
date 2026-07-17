/**
 * Tự động sao lưu state vào IndexedDB — nhiều bản, xoay vòng.
 * Phao cứu sinh khi localStorage bị xóa / ghi đè nhầm từ cloud.
 */
(function (GL) {
  "use strict";

  var DB_NAME = "giao-ly-auto-backup";
  var DB_VERSION = 1;
  var STORE = "snapshots";
  var MAX_SNAPSHOTS = 12;
  var MIN_INTERVAL_MS = 10 * 60 * 1000; // tối đa 1 bản / 10 phút
  var saveTimer = null;

  function idbAvailable() {
    return typeof indexedDB !== "undefined";
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!idbAvailable()) {
        reject(new Error("IndexedDB không khả dụng."));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "at" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("Không mở được IndexedDB."));
      };
    });
  }

  /** Checksum đơn giản (FNV-1a 32-bit) để phát hiện snapshot hỏng */
  function checksum(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16);
  }

  GL.autoBackupChecksum = checksum;

  function buildSnapshot() {
    var stateJson = JSON.stringify(GL.state || {});
    return {
      at: Date.now(),
      state: stateJson,
      checksum: checksum(stateJson),
      classes: ((GL.state && GL.state.classes) || []).length,
      students: ((GL.state && GL.state.classes) || []).reduce(function (n, c) {
        return n + ((c.students && c.students.length) || 0);
      }, 0),
    };
  }

  function listAll(db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).getAll();
      req.onsuccess = function () {
        resolve(req.result || []);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  /** Ghi 1 snapshot + xoay vòng (giữ tối đa MAX_SNAPSHOTS bản) */
  GL.autoBackupNow = function autoBackupNow() {
    return openDb()
      .then(function (db) {
        return listAll(db).then(function (all) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction(STORE, "readwrite");
            var store = tx.objectStore(STORE);
            store.put(buildSnapshot());
            // xoay vòng: xóa bản cũ nhất khi vượt hạn mức
            all.sort(function (a, b) {
              return a.at - b.at;
            });
            var excess = all.length + 1 - MAX_SNAPSHOTS;
            for (var i = 0; i < excess; i++) store.delete(all[i].at);
            tx.oncomplete = function () {
              resolve({ ok: true });
            };
            tx.onerror = function () {
              reject(tx.error);
            };
          });
        });
      })
      .catch(function (e) {
        return { ok: false, error: (e && e.message) || String(e) };
      });
  };

  /** Danh sách snapshot (mới nhất trước) */
  GL.autoBackupList = function autoBackupList() {
    return openDb()
      .then(listAll)
      .then(function (all) {
        return all
          .sort(function (a, b) {
            return b.at - a.at;
          })
          .map(function (s) {
            return {
              at: s.at,
              classes: s.classes,
              students: s.students,
              valid: checksum(s.state) === s.checksum,
            };
          });
      })
      .catch(function () {
        return [];
      });
  };

  /**
   * Khôi phục snapshot theo mốc thời gian.
   * Kiểm tra checksum trước khi ghi đè state.
   */
  GL.autoBackupRestore = function autoBackupRestore(at) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(STORE, "readonly").objectStore(STORE).get(at);
        req.onsuccess = function () {
          var snap = req.result;
          if (!snap) {
            resolve({ ok: false, error: "Không tìm thấy bản sao lưu." });
            return;
          }
          if (checksum(snap.state) !== snap.checksum) {
            resolve({ ok: false, error: "Bản sao lưu bị hỏng (checksum lệch)." });
            return;
          }
          var parsed;
          try {
            parsed = JSON.parse(snap.state);
          } catch (e) {
            resolve({ ok: false, error: "Bản sao lưu không đọc được." });
            return;
          }
          if (!parsed || !Array.isArray(parsed.classes)) {
            resolve({ ok: false, error: "Bản sao lưu sai cấu trúc." });
            return;
          }
          GL.state = parsed;
          if (typeof GL.saveState === "function") {
            GL.saveState({ skipUndo: true });
          }
          if (typeof GL.render === "function") GL.render();
          resolve({ ok: true, at: snap.at });
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  };

  function scheduleAutoBackup() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      GL.autoBackupNow();
    }, 4000); // gộp nhiều lần lưu liên tiếp
  }

  /** Gắn hook: mỗi lần saveState → auto backup (tối đa 1 bản / 10 phút) */
  var lastBackupAt = 0;
  function installHook() {
    if (typeof GL.saveState !== "function" || GL._autoBackupHooked) return;
    var origSave = GL.saveState;
    GL.saveState = function (opts) {
      var r = origSave.apply(this, arguments);
      var now = Date.now();
      if (now - lastBackupAt >= MIN_INTERVAL_MS) {
        lastBackupAt = now;
        scheduleAutoBackup();
      }
      return r;
    };
    GL._autoBackupHooked = true;
  }

  installHook();
  // Backup 1 bản lúc mở app (nếu đã có dữ liệu)
  if (idbAvailable() && GL.state && (GL.state.classes || []).length) {
    lastBackupAt = Date.now();
    setTimeout(function () {
      GL.autoBackupNow();
    }, 8000);
  }
})(window.GL = window.GL || {});
