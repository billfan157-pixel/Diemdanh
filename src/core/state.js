/**
 * State & localStorage: lớp, học viên, chế độ xem.
 */
(function (GL) {
  "use strict";

  GL.searchQuery = "";

  var savedView = localStorage.getItem(GL.VIEW_KEY) || "";
  // gộp tab cũ «missing» → «journal» (theo dõi = thiếu điểm + nhật ký)
  if (savedView === "missing") savedView = "journal";
  GL.viewMode = GL.VIEW_MODES.indexOf(savedView) >= 0 ? savedView : "cards";

  var savedTerm = localStorage.getItem(GL.TERM_KEY) || "hk1";
  GL.activeTerm =
    savedTerm === "hk2" ? "hk2" : savedTerm === "year" ? "year" : "hk1";

  // Lọc năm học: "" = tất cả; giá trị = năm học lớp (vd 2025-2026)
  GL.activeYearFilter = localStorage.getItem(GL.YEAR_FILTER_KEY) || "";
  // Màn: dashboard | classes | class | me
  var HOME_VIEWS = ["dashboard", "classes", "class", "me"];
  var savedHome = localStorage.getItem(GL.HOME_VIEW_KEY) || "dashboard";
  // migrate giá trị cũ
  if (savedHome === "home") savedHome = "dashboard";
  GL.homeView =
    HOME_VIEWS.indexOf(savedHome) >= 0 ? savedHome : "dashboard";

  GL.createClass = function createClass(name, year, classCount) {
    if (classCount == null) {
      classCount = (GL.state && GL.state.classes && GL.state.classes.length) || 0;
    }
    return {
      id: GL.uid(),
      name: String(name || "").trim(),
      year: String(year || "").trim(),
      color: GL.CLASS_COLORS[classCount % GL.CLASS_COLORS.length],
      weights: GL.defaultWeights(),
      students: [],
      updatedAt: Date.now(),
    };
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(GL.STORAGE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && Array.isArray(p.classes)) {
          return {
            version: 3,
            activeClassId:
              p.activeClassId || (p.classes[0] && p.classes[0].id) || null,
            classes: p.classes,
          };
        }
      }
    } catch (e) {
      /* ignore */
    }

    // migrate v2 → v3
    try {
      var old = localStorage.getItem(GL.OLD_KEY);
      if (old) {
        var prev = JSON.parse(old);
        var cls = GL.createClass("Lớp của tôi", "", 0);
        if (prev.weights) {
          cls.weights = Object.assign(GL.defaultWeights(), prev.weights);
          if (cls.weights.khaoKinh === 2) cls.weights.khaoKinh = 1;
        }
        if (Array.isArray(prev.students)) cls.students = prev.students;
        return { version: 3, activeClassId: cls.id, classes: [cls] };
      }
    } catch (e2) {
      /* ignore */
    }

    return { version: 3, activeClassId: null, classes: [] };
  }

  GL.state = loadState();

  // Khảo kinh ×1 nếu còn ×2 + migrate tên + điểm theo HK
  GL.state.classes.forEach(function (c) {
    if (!c.weights) c.weights = GL.defaultWeights();
    if (c.weights.khaoKinh === 2) c.weights.khaoKinh = 1;
    if (Array.isArray(c.students)) {
      c.students.forEach(function (st) {
        GL.ensureNameFields(st);
        if (typeof GL.ensureStudentTerms === "function") {
          GL.ensureStudentTerms(st);
        }
        if (typeof GL.ensureLearningLog === "function") {
          GL.ensureLearningLog(st);
        } else if (!Array.isArray(st.learningLog)) {
          st.learningLog = [];
        }
      });
    }
  });

  /* ─── Undo / Redo (snapshot state trước mỗi lần save) ─── */
  var MAX_UNDO = 50;
  var lastSavedJson = JSON.stringify(GL.state);
  GL._undoStack = [];
  GL._redoStack = [];
  GL._undoApplying = false;
  GL._pendingUndoLabel = null;

  GL.setUndoLabel = function setUndoLabel(label) {
    GL._pendingUndoLabel = label || null;
  };

  GL.canUndo = function canUndo() {
    return GL._undoStack.length > 0;
  };

  GL.canRedo = function canRedo() {
    return GL._redoStack.length > 0;
  };

  GL.clearUndoStacks = function clearUndoStacks() {
    GL._undoStack = [];
    GL._redoStack = [];
    lastSavedJson = JSON.stringify(GL.state);
    GL._pendingUndoLabel = null;
    if (typeof GL.updateUndoRedoUI === "function") GL.updateUndoRedoUI();
  };

  /** Đồng bộ baseline sau khi thay state từ ngoài (backup, v.v.) — không đẩy undo */
  GL.syncUndoBaseline = function syncUndoBaseline(clearStacks) {
    lastSavedJson = JSON.stringify(GL.state);
    if (clearStacks) {
      GL._undoStack = [];
      GL._redoStack = [];
    }
    GL._pendingUndoLabel = null;
    if (typeof GL.updateUndoRedoUI === "function") GL.updateUndoRedoUI();
  };

  function rehydrateState(parsed) {
    GL.state = parsed;
    // đảm bảo cấu trúc sau restore snapshot
    if (!GL.state.classes) GL.state.classes = [];
    GL.state.classes.forEach(function (c) {
      if (!c.weights && typeof GL.defaultWeights === "function") {
        c.weights = GL.defaultWeights();
      }
      if (c.weights && c.weights.khaoKinh === 2) c.weights.khaoKinh = 1;
      if (Array.isArray(c.students)) {
        c.students.forEach(function (st) {
          if (typeof GL.ensureNameFields === "function") GL.ensureNameFields(st);
          if (typeof GL.ensureStudentTerms === "function") {
            GL.ensureStudentTerms(st);
          }
          if (typeof GL.ensureLearningLog === "function") {
            GL.ensureLearningLog(st);
          }
        });
      }
    });
  }

  /**
   * Lưu state. Tự đẩy undo trừ khi skipUndo / đang apply undo-redo.
   * @param {{ skipUndo?: boolean }} [opts]
   */
  GL.saveState = function saveState(opts) {
    opts = opts || {};
    var nextJson = JSON.stringify(GL.state);
    var skipUndo = !!opts.skipUndo || GL._undoApplying;

    // Ghi nhận bước undo: trạng thái *trước* thay đổi (lastSavedJson)
    if (!skipUndo && nextJson !== lastSavedJson) {
      GL._undoStack.push({
        label: GL._pendingUndoLabel || "Thay đổi",
        at: Date.now(),
        stateJson: lastSavedJson,
      });
      if (GL._undoStack.length > MAX_UNDO) {
        GL._undoStack.shift();
      }
      // thao tác mới → xóa nhánh redo
      GL._redoStack = [];
    }

    lastSavedJson = nextJson;
    GL._pendingUndoLabel = null;
    try {
      localStorage.setItem(GL.STORAGE_KEY, nextJson);
    } catch (e) {
      if (typeof GL.toast === "function") GL.toast("Không thể lưu: bộ nhớ đầy.", "err");
    }

    if (typeof GL.updateUndoRedoUI === "function") GL.updateUndoRedoUI();
  };

  GL.undo = function undo() {
    if (!GL._undoStack.length) {
      if (typeof GL.toast === "function") {
        GL.toast("Không còn thao tác để hoàn tác.", "err");
      }
      return false;
    }
    var entry = GL._undoStack.pop();
    GL._redoStack.push({
      label: entry.label || "Thay đổi",
      at: Date.now(),
      stateJson: lastSavedJson,
    });
    if (GL._redoStack.length > MAX_UNDO) GL._redoStack.shift();

    try {
      GL._undoApplying = true;
      rehydrateState(JSON.parse(entry.stateJson));
      lastSavedJson = entry.stateJson;
      localStorage.setItem(GL.STORAGE_KEY, entry.stateJson);
    } finally {
      GL._undoApplying = false;
    }

    if (typeof GL.ensureActiveClassAccessible === "function") {
      GL.ensureActiveClassAccessible();
    }
    if (typeof GL.render === "function") GL.render();
    if (typeof GL.updateUndoRedoUI === "function") GL.updateUndoRedoUI();
    if (typeof GL.toast === "function") {
      GL.toast("↶ Hoàn tác: " + (entry.label || "thay đổi"));
    }
    return true;
  };

  GL.redo = function redo() {
    if (!GL._redoStack.length) {
      if (typeof GL.toast === "function") {
        GL.toast("Không còn thao tác để làm lại.", "err");
      }
      return false;
    }
    var entry = GL._redoStack.pop();
    GL._undoStack.push({
      label: entry.label || "Thay đổi",
      at: Date.now(),
      stateJson: lastSavedJson,
    });
    if (GL._undoStack.length > MAX_UNDO) GL._undoStack.shift();

    try {
      GL._undoApplying = true;
      rehydrateState(JSON.parse(entry.stateJson));
      lastSavedJson = entry.stateJson;
      localStorage.setItem(GL.STORAGE_KEY, entry.stateJson);
    } finally {
      GL._undoApplying = false;
    }

    if (typeof GL.ensureActiveClassAccessible === "function") {
      GL.ensureActiveClassAccessible();
    }
    if (typeof GL.render === "function") GL.render();
    if (typeof GL.updateUndoRedoUI === "function") GL.updateUndoRedoUI();
    if (typeof GL.toast === "function") {
      GL.toast("↷ Làm lại: " + (entry.label || "thay đổi"));
    }
    return true;
  };

  GL.updateUndoRedoUI = function updateUndoRedoUI() {
    var undoBtn = document.getElementById("undoBtn");
    var redoBtn = document.getElementById("redoBtn");
    var undoBtn2 = document.getElementById("undoBtnSidebar");
    var redoBtn2 = document.getElementById("redoBtnSidebar");
    var canU = GL.canUndo();
    var canR = GL.canRedo();
    var uTitle =
      "Hoàn tác (Ctrl+Z)" +
      (canU
        ? " — " + (GL._undoStack[GL._undoStack.length - 1].label || "")
        : "");
    var rTitle =
      "Làm lại (Ctrl+Y)" +
      (canR
        ? " — " + (GL._redoStack[GL._redoStack.length - 1].label || "")
        : "");

    [undoBtn, undoBtn2].forEach(function (btn) {
      if (!btn) return;
      btn.disabled = !canU;
      btn.title = uTitle;
      btn.setAttribute("aria-disabled", canU ? "false" : "true");
    });
    [redoBtn, redoBtn2].forEach(function (btn) {
      if (!btn) return;
      btn.disabled = !canR;
      btn.title = rTitle;
      btn.setAttribute("aria-disabled", canR ? "false" : "true");
    });
  };

  GL.activeClass = function activeClass() {
    return (
      GL.state.classes.find(function (c) {
        return c.id === GL.state.activeClassId;
      }) || null
    );
  };

  GL.touchClass = function touchClass(cls) {
    if (cls) cls.updatedAt = Date.now();
  };

  GL.setViewMode = function setViewMode(mode) {
    if (mode === "missing") mode = "journal";
    if (GL.VIEW_MODES.indexOf(mode) < 0) return;
    GL.viewMode = mode;
    localStorage.setItem(GL.VIEW_KEY, mode);
  };

  GL.setActiveTerm = function setActiveTerm(term) {
    if (term !== "hk1" && term !== "hk2" && term !== "year") return;
    GL.activeTerm = term;
    localStorage.setItem(GL.TERM_KEY, term);
  };

  GL.setYearFilter = function setYearFilter(year) {
    GL.activeYearFilter = String(year || "").trim();
    try {
      localStorage.setItem(GL.YEAR_FILTER_KEY, GL.activeYearFilter);
    } catch (e) {
      /* ignore */
    }
  };

  GL.setHomeView = function setHomeView(view) {
    var allowed = ["dashboard", "classes", "class", "me"];
    GL.homeView = allowed.indexOf(view) >= 0 ? view : "dashboard";
    try {
      localStorage.setItem(GL.HOME_VIEW_KEY, GL.homeView);
    } catch (e) {
      /* ignore */
    }
  };

  /**
   * Chuyển học viên sang lớp khác (giữ nguyên điểm + nhật ký).
   * @returns {{ ok: boolean, error?: string, student?: object, from?: object, to?: object }}
   */
  GL.transferStudent = function transferStudent(studentId, fromClassId, toClassId) {
    if (!studentId || !toClassId) {
      return { ok: false, error: "Thiếu thông tin chuyển lớp." };
    }
    if (fromClassId === toClassId) {
      return { ok: false, error: "Học viên đã ở lớp này." };
    }
    var from =
      (GL.state.classes || []).find(function (c) {
        return c.id === fromClassId;
      }) || null;
    var to =
      (GL.state.classes || []).find(function (c) {
        return c.id === toClassId;
      }) || null;
    if (!from || !to) return { ok: false, error: "Không tìm thấy lớp." };

    if (typeof GL.canAccessClass === "function") {
      if (!GL.canAccessClass(from.id) || !GL.canAccessClass(to.id)) {
        return { ok: false, error: "Bạn không có quyền với một trong hai lớp." };
      }
    }

    var idx = -1;
    var st = null;
    for (var i = 0; i < (from.students || []).length; i++) {
      if (from.students[i].id === studentId) {
        idx = i;
        st = from.students[i];
        break;
      }
    }
    if (!st) return { ok: false, error: "Không tìm thấy học viên trong lớp nguồn." };

    // Trùng tên ở lớp đích?
    var dup = (to.students || []).some(function (s) {
      return (
        typeof GL.normStudent === "function" &&
        GL.normStudent(s) === GL.normStudent(st)
      );
    });
    if (dup) {
      return {
        ok: false,
        error:
          'Lớp "' +
          to.name +
          '" đã có học viên trùng tên. Đổi tên hoặc gộp tay trước.',
      };
    }

    from.students.splice(idx, 1);
    to.students = to.students || [];
    to.students.unshift(st);
    if (typeof GL.touchClass === "function") {
      GL.touchClass(from);
      GL.touchClass(to);
    }
    return { ok: true, student: st, from: from, to: to };
  };
})(window.GL = window.GL || {});
