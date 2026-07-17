/**
 * Bootstrap + gắn sự kiện UI.
 * Bootstrap UI. Load sau cùng sau config/core/services/features/ui renderers.
 */
(function (GL) {
  "use strict";

  function commitTableScore(input) {
    var cls = GL.activeClass();
    if (!cls || input.dataset.tableScore == null) return;
    var sid = input.dataset.sid;
    var col = input.dataset.col;
    var st = cls.students.find(function (s) {
      return s.id === sid;
    });
    if (!st) return;
    var raw = input.value.trim();
    var bag = GL.getScores(st);
    var before = (bag[col] || []).slice();
    if (raw === "") {
      bag[col] = [];
    } else {
      var n = GL.parseScore(raw);
      if (n == null) {
        var avg = GL.colAvg(bag[col]);
        input.value = avg == null ? "" : GL.fmt(avg, 2);
        GL.toast("Điểm phải từ 0 đến 10.", "err");
        return;
      }
      bag[col] = [n];
    }
    if (typeof GL.logScoreColumnChange === "function") {
      GL.logScoreColumnChange(st, col, before, bag[col], "set");
    }
    GL.touchClass(cls);
    if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Sửa điểm bảng");
    GL.saveState();
    GL.render();
  }

  function addScore(cls, sid, col, input) {
    if (!input) return;
    var n = GL.parseScore(input.value);
    if (n == null) {
      input.focus();
      input.select();
      return;
    }
    var st = cls.students.find(function (s) {
      return s.id === sid;
    });
    if (!st) return;
    var bag = GL.getScores(st);
    if (!bag[col]) bag[col] = [];
    var before = bag[col].slice();
    bag[col].push(n);
    if (typeof GL.logScoreColumnChange === "function") {
      GL.logScoreColumnChange(st, col, before, bag[col], "add");
    }
    GL.touchClass(cls);
    if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Thêm điểm");
    GL.saveState();
    GL.render();
    var next = document.querySelector(
      'input[data-score-input][data-sid="' + sid + '"][data-col="' + col + '"]'
    );
    if (next) next.focus();
  }

  var _focusHistory = [];
  function getFocusable(el) {
    return el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  }

  function trapTab(e, modal) {
    var focusable = getFocusable(modal);
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && e.target === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && e.target === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onModalKeydown(e) {
    var modals;
    if (e.key === "Escape") {
      modals = document.querySelectorAll(".modal-overlay:not(.hidden)");
      if (!modals.length) return;
      var top = modals[modals.length - 1];
      if (top && top.id) {
        e.preventDefault();
        closeModal(top.id);
      }
    } else if (e.key === "Tab") {
      modals = document.querySelectorAll(".modal-overlay:not(.hidden)");
      if (!modals.length) return;
      trapTab(e, modals[modals.length - 1]);
    }
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    _focusHistory.push(document.activeElement);
    el.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    // focus phần tử đầu tiên trong modal
    var focusable = getFocusable(el);
    if (focusable.length) setTimeout(function () { focusable[0].focus(); }, 30);
    if (_focusHistory.length === 1) {
      document.addEventListener("keydown", onModalKeydown);
    }
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    // chỉ mở lại scroll nếu không còn modal nào
    var anyOpen = document.querySelector(".modal-overlay:not(.hidden)");
    if (!anyOpen) document.body.style.overflow = "";
    // restore focus
    var prev = _focusHistory.pop();
    if (prev && prev !== document.body && prev.focus) {
      setTimeout(function () { prev.focus(); }, 30);
    }
    if (!_focusHistory.length) {
      document.removeEventListener("keydown", onModalKeydown);
    }
  }


  function setHelpFabVisible(on) {
    var fab = document.getElementById("openHelpModal");
    if (fab) fab.classList.toggle("hidden", !on);
  }

  function showLogin() {
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("appRoot").classList.add("hidden");
    setHelpFabVisible(false);
    if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
  }

  function showAppIfLoggedIn() {
    if (!GL.isLoggedIn()) {
      showLogin();
      return false;
    }
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("appRoot").classList.remove("hidden");
    setHelpFabVisible(true);
    if (typeof GL.ensureActiveClassAccessible === "function") {
      GL.ensureActiveClassAccessible();
    }
    GL.render();
    if (typeof GL.checkSecurityGates === "function") {
      setTimeout(function () {
        GL.checkSecurityGates();
      }, 120);
    } else if (typeof GL.updateBackupReminderUI === "function") {
      GL.updateBackupReminderUI();
    }
    // Đồng bộ Supabase sau khi vào app
    if (typeof GL.installCloudHooks === "function") GL.installCloudHooks();
    if (typeof GL.initCloudSync === "function") {
      GL.initCloudSync().then(function () {
        if (typeof GL.render === "function") GL.render();
        if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
      }).catch(function () {});
    }
    return true;
  }

  GL.commitTableScore = commitTableScore;
  GL.addScore = addScore;
  GL.openModal = openModal;
  GL.closeModal = closeModal;
  GL.showLogin = showLogin;
  GL.showAppIfLoggedIn = showAppIfLoggedIn;

  // Mobile UI class — tăng độ ưu tiên CSS trên điện thoại
  function applyMobileUiClass() {
    var isM =
      window.matchMedia &&
      window.matchMedia("(max-width: 900px)").matches;
    document.documentElement.classList.toggle("mobile-ui", !!isM);
    document.body.classList.toggle("mobile-ui", !!isM);
  }
  applyMobileUiClass();
  window.addEventListener("resize", applyMobileUiClass);
  window.addEventListener("orientationchange", applyMobileUiClass);

  function setupMobileKeyboardState() {
    if (!window.visualViewport) return;
    var viewport = window.visualViewport;
    function syncKeyboardState() {
      var isMobile =
        window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
      var keyboardHeight = window.innerHeight - viewport.height;
      document.body.classList.toggle(
        "mobile-keyboard-open",
        !!isMobile && keyboardHeight > 140
      );
    }
    viewport.addEventListener("resize", syncKeyboardState);
    viewport.addEventListener("scroll", syncKeyboardState);
    window.addEventListener("orientationchange", syncKeyboardState);
    syncKeyboardState();
  }
  setupMobileKeyboardState();

  // Init
  GL.saveState({ skipUndo: true });
  // Gợi ý năm học mặc định (mẫu in / năm mới nhất) nếu chưa chọn
  if (!GL.activeYearFilter && typeof GL.suggestDefaultYear === "function") {
    var sug = GL.suggestDefaultYear();
    // Chỉ auto-set nếu có đúng 1 năm hoặc đã có namHoc in
    var years =
      typeof GL.collectSchoolYears === "function"
        ? GL.collectSchoolYears()
        : [];
    var psNam =
      typeof GL.getPrintSettings === "function" &&
      GL.getPrintSettings().namHoc
        ? String(GL.getPrintSettings().namHoc).trim()
        : "";
    if (psNam) {
      GL.setYearFilter(psNam);
    } else if (years.length === 1) {
      GL.setYearFilter(years[0]);
    }
  }
  if (typeof GL.setupAutoSave === "function") GL.setupAutoSave();
  GL.bindNavigationEvents();
  GL.bindStudentEvents();
  GL.bindImportExportEvents();
  GL.bindOperationEvents();
  GL.bindSecurityEvents();
  // MutationObserver giám sát đóng mở modal để tự động khóa cuộn an toàn cho iOS
  if (typeof MutationObserver !== "undefined") {
    var modalObserver = new MutationObserver(function () {
      var anyOpen = document.querySelector(".modal-overlay:not(.hidden), .m-sheet-overlay:not(.hidden)");
      if (anyOpen) {
        if (!document.body.classList.contains("modal-open")) {
          GL.scrollYBeforeModal = window.scrollY || document.documentElement.scrollTop;
          document.body.style.position = "fixed";
          document.body.style.width = "100%";
          document.body.style.top = -GL.scrollYBeforeModal + "px";
          document.body.classList.add("modal-open");
        }
      } else {
        if (document.body.classList.contains("modal-open")) {
          document.body.classList.remove("modal-open");
          document.body.style.position = "";
          document.body.style.width = "";
          document.body.style.top = "";
          window.scrollTo(0, GL.scrollYBeforeModal || 0);
        }
      }
    });

    // Quan sát tất cả modal overlays
    document.querySelectorAll(".modal-overlay, .m-sheet-overlay").forEach(function (el) {
      modalObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  }

  if (typeof GL.updateUndoRedoUI === "function") GL.updateUndoRedoUI();
  if (GL.isLoggedIn()) {
    showAppIfLoggedIn();
  } else {
    showLogin();
  }
})(window.GL = window.GL || {});
