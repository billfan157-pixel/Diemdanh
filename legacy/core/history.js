/**
 * Lịch sử sửa điểm + tự lưu khi thoát.
 */
(function (GL) {
  "use strict";

  var MAX_LOG = 800;
  var HISTORY_KEY = "giao-ly-score-history-v1";

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {
      /* ignore */
    }
    return [];
  }

  function persistHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) {
      // storage full — cắt bớt
      try {
        list = list.slice(0, Math.floor(MAX_LOG / 2));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
      } catch (e2) {
        console.warn("history persist failed", e2);
      }
    }
  }

  GL.scoreHistory = loadHistory();

  GL.saveScoreHistory = function saveScoreHistory() {
    persistHistory(GL.scoreHistory);
  };

  GL.formatScoresList = function formatScoresList(arr) {
    if (!arr || !arr.length) return "(trống)";
    return arr
      .map(function (n) {
        return typeof GL.fmt === "function" ? GL.fmt(n) : String(n);
      })
      .join("; ");
  };

  GL.colLabel = function colLabel(key) {
    var c = (GL.COLS || []).find(function (x) {
      return x.key === key;
    });
    return c ? c.label : key;
  };

  /**
   * Ghi log sửa điểm.
   * @param {object} opts
   */
  GL.logScoreChange = function logScoreChange(opts) {
    opts = opts || {};
    var user =
      typeof GL.currentUser === "function" ? GL.currentUser() : null;
    var cls = opts.cls || (typeof GL.activeClass === "function" ? GL.activeClass() : null);
    var st = opts.student;
    if (!st && opts.studentId && cls) {
      st = (cls.students || []).find(function (s) {
        return s.id === opts.studentId;
      });
    }

    var entry = {
      id:
        (typeof GL.uid === "function" ? GL.uid() : "") +
        "-" +
        Date.now().toString(36),
      at: new Date().toISOString(),
      byUserId: user ? user.id : "",
      byName: user
        ? user.displayName || user.username
        : "Không rõ (chưa đăng nhập)",
      byUsername: user ? user.username : "",
      classId: (cls && cls.id) || opts.classId || "",
      className: (cls && cls.name) || opts.className || "",
      studentId: (st && st.id) || opts.studentId || "",
      studentName: st
        ? typeof GL.displayName === "function"
          ? GL.displayName(st)
          : st.name || ""
        : opts.studentName || "",
      term: opts.term || GL.activeTerm || "hk1",
      colKey: opts.colKey || "",
      colLabel: opts.colLabel || GL.colLabel(opts.colKey),
      action: opts.action || "set", // add | set | delete
      before: opts.before != null ? String(opts.before) : "",
      after: opts.after != null ? String(opts.after) : "",
    };

    GL.scoreHistory.unshift(entry);
    if (GL.scoreHistory.length > MAX_LOG) {
      GL.scoreHistory = GL.scoreHistory.slice(0, MAX_LOG);
    }
    GL.saveScoreHistory();
    return entry;
  };

  /** Gọi trước/sau khi đổi mảng điểm 1 cột */
  GL.logScoreColumnChange = function logScoreColumnChange(
    student,
    colKey,
    beforeArr,
    afterArr,
    action
  ) {
    var before = GL.formatScoresList(beforeArr);
    var after = GL.formatScoresList(afterArr);
    if (before === after) return null;
    return GL.logScoreChange({
      student: student,
      colKey: colKey,
      action: action || "set",
      before: before,
      after: after,
      term: GL.activeTerm === "year" ? "hk1" : GL.activeTerm || "hk1",
    });
  };

  GL.clearScoreHistory = function clearScoreHistory() {
    GL.scoreHistory = [];
    GL.saveScoreHistory();
  };

  GL.getScoreHistoryFiltered = function getScoreHistoryFiltered(filter) {
    filter = filter || {};
    var list = GL.scoreHistory.slice();
    if (filter.classId) {
      list = list.filter(function (e) {
        return e.classId === filter.classId;
      });
    }
    if (filter.studentId) {
      list = list.filter(function (e) {
        return e.studentId === filter.studentId;
      });
    }
    if (filter.q) {
      var q = String(filter.q).toLowerCase();
      list = list.filter(function (e) {
        var blob = [
          e.byName,
          e.byUsername,
          e.className,
          e.studentName,
          e.colLabel,
          e.before,
          e.after,
          e.action,
        ]
          .join(" ")
          .toLowerCase();
        return blob.indexOf(q) >= 0;
      });
    }
    return list;
  };

  function actionLabel(a) {
    if (a === "add") return "Thêm điểm";
    if (a === "delete") return "Xóa điểm";
    if (a === "set") return "Sửa / gán điểm";
    if (a === "import") return "Nhập file";
    return a || "Sửa";
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString("vi-VN");
    } catch (e) {
      return iso;
    }
  }

  GL.renderHistoryListHtml = function renderHistoryListHtml(filter) {
    var list = GL.getScoreHistoryFiltered(filter);
    if (!list.length) {
      return '<p class="hint" style="padding:16px;text-align:center">Chưa có lịch sử sửa điểm.</p>';
    }
    return (
      '<div class="history-list">' +
      list
        .map(function (e) {
          var term =
            e.term === "hk2" ? "HK2" : e.term === "year" ? "Cả năm" : "HK1";
          return (
            '<div class="history-item">' +
            '<div class="history-item-top">' +
            '<span class="history-time">' +
            GL.escapeHtml(formatTime(e.at)) +
            "</span>" +
            '<span class="history-action">' +
            GL.escapeHtml(actionLabel(e.action)) +
            "</span>" +
            "</div>" +
            '<div class="history-main">' +
            "<strong>" +
            GL.escapeHtml(e.byName || "—") +
            "</strong>" +
            (e.byUsername
              ? ' <span class="hint">@' +
                GL.escapeHtml(e.byUsername) +
                "</span>"
              : "") +
            " sửa điểm <strong>" +
            GL.escapeHtml(e.colLabel || e.colKey) +
            "</strong> (" +
            term +
            ") của em <strong>" +
            GL.escapeHtml(e.studentName || "—") +
            "</strong>" +
            (e.className
              ? ' · lớp <em>' + GL.escapeHtml(e.className) + "</em>"
              : "") +
            "</div>" +
            '<div class="history-diff">' +
            '<span class="hist-before" title="Trước">' +
            GL.escapeHtml(e.before || "—") +
            "</span>" +
            " → " +
            '<span class="hist-after" title="Sau">' +
            GL.escapeHtml(e.after || "—") +
            "</span>" +
            "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  };

  GL.showHistoryModal = function showHistoryModal() {
    if (typeof GL.requireBanGL === "function" && !GL.requireBanGL()) return;
    var cls = typeof GL.activeClass === "function" ? GL.activeClass() : null;
    var filterClass = document.getElementById("historyFilterClass");
    var filterQ = document.getElementById("historyFilterQ");
    if (filterClass) {
      var opts =
        '<option value="">Tất cả lớp</option>' +
        ((GL.state && GL.state.classes) || [])
          .map(function (c) {
            return (
              '<option value="' +
              c.id +
              '"' +
              (cls && cls.id === c.id ? " selected" : "") +
              ">" +
              GL.escapeHtml(c.name) +
              "</option>"
            );
          })
          .join("");
      filterClass.innerHTML = opts;
    }
    var filter = {
      classId: filterClass ? filterClass.value : cls ? cls.id : "",
      q: filterQ ? filterQ.value.trim() : "",
    };
    var body = document.getElementById("historyBody");
    if (body) body.innerHTML = GL.renderHistoryListHtml(filter);
    var meta = document.getElementById("historyMeta");
    if (meta) {
      meta.textContent =
        "Tổng " +
        GL.scoreHistory.length +
        " bản ghi (giữ tối đa " +
        MAX_LOG +
        ")";
    }
    var modal = document.getElementById("historyModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  GL.refreshHistoryModal = function refreshHistoryModal() {
    var filterClass = document.getElementById("historyFilterClass");
    var filterQ = document.getElementById("historyFilterQ");
    var filter = {
      classId: filterClass ? filterClass.value : "",
      q: filterQ ? filterQ.value.trim() : "",
    };
    var body = document.getElementById("historyBody");
    if (body) body.innerHTML = GL.renderHistoryListHtml(filter);
  };

  /** Tự lưu state + history khi rời trang / ẩn tab */
  GL.setupAutoSave = function setupAutoSave() {
    if (GL._autoSaveBound) return;
    GL._autoSaveBound = true;

    function flush(reason) {
      try {
        if (typeof GL.saveState === "function") GL.saveState();
        GL.saveScoreHistory();
        if (typeof GL.saveAuthStore === "function") GL.saveAuthStore();
        if (reason && console && console.debug) {
          console.debug("[auto-save]", reason, new Date().toISOString());
        }
      } catch (e) {
        console.warn("auto-save failed", e);
      }
    }

    window.addEventListener("beforeunload", function () {
      flush("beforeunload");
    });
    window.addEventListener("pagehide", function () {
      flush("pagehide");
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush("hidden");
    });
    // định kỳ mỗi 30s khi tab đang mở
    setInterval(function () {
      if (document.visibilityState === "visible") flush("interval");
    }, 30000);
  };

  // gắn history vào backup nếu có
  var _build = GL.buildFullBackup;
  if (typeof _build === "function") {
    GL.buildFullBackup = function () {
      var data = _build();
      data.scoreHistory = GL.scoreHistory;
      return data;
    };
  }
  var _restore = GL.restoreBackupFromObject;
  if (typeof _restore === "function") {
    GL.restoreBackupFromObject = function (data, mode) {
      _restore(data, mode);
      if (data && Array.isArray(data.scoreHistory)) {
        if (mode === "replace") {
          GL.scoreHistory = data.scoreHistory.slice(0, MAX_LOG);
        } else {
          GL.scoreHistory = data.scoreHistory
            .concat(GL.scoreHistory)
            .slice(0, MAX_LOG);
        }
        GL.saveScoreHistory();
      }
    };
  }
})(window.GL = window.GL || {});
