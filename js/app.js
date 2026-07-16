/**
 * Bootstrap + gắn sự kiện UI.
 * Load sau cùng (sau config, utils, calc, state, views, render, import-export).
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

  function openModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    // chỉ mở lại scroll nếu không còn modal nào
    var anyOpen = document.querySelector(".modal-overlay:not(.hidden)");
    if (!anyOpen) document.body.style.overflow = "";
  }

  function bindEvents() {
    // Undo / Redo
    function doUndo() {
      if (typeof GL.undo === "function") GL.undo();
    }
    function doRedo() {
      if (typeof GL.redo === "function") GL.redo();
    }
    ["undoBtn", "undoBtnSidebar"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", doUndo);
    });
    ["redoBtn", "redoBtnSidebar"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", doRedo);
    });
    document.addEventListener("keydown", function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      // Không chặn khi đang gõ trong input (trừ khi muốn Ctrl+Z vẫn undo app)
      // Cho phép undo/redo app kể cả trong input điểm — UX sổ điểm
      var key = (e.key || "").toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        doUndo();
        return;
      }
      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        doRedo();
      }
    });

    // Chuyển Học kỳ 1 / 2 / Cả năm
    document.getElementById("termSwitcher").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-term]");
      if (!btn) return;
      var term = btn.getAttribute("data-term");
      if (term !== "hk1" && term !== "hk2" && term !== "year") return;
      var prev = GL.activeTerm;
      GL.setActiveTerm(term);
      if (term === "year") {
        // vào cả năm → bảng tổng kết
        if (
          GL.viewMode === "cards" ||
          GL.viewMode === "table" ||
          GL.viewMode === "missing" ||
          GL.viewMode === "journal" ||
          GL.viewMode === "year"
        ) {
          GL.setViewMode("year");
        }
      } else if (prev === "year") {
        // rời cả năm → về nhập điểm
        if (GL.viewMode === "year" || GL.viewMode === "print") {
          GL.setViewMode("cards");
        }
      }
      GL.render();
      GL.toast(
        term === "year"
          ? "Đang xem tổng điểm cả năm"
          : "Đang xem " + GL.termLabel(term)
      );
    });

    // Mở cửa sổ Thêm HV / Xuất-Nhập / Hệ số
    document.getElementById("openAddStudentModal").addEventListener("click", function () {
      if (typeof GL.renderAddInfoGrid === "function") GL.renderAddInfoGrid();
      openModal("addStudentModal");
      setTimeout(function () {
        var el = document.getElementById("inputTenThanh");
        if (el) el.focus();
      }, 50);
    });
    function openIoFeature() {
      // GLV: xuất; Admin: xuất + nhập + xuất nhiều lớp
      if (typeof GL.canExport === "function" && !GL.canExport()) {
        GL.toast("Cần đăng nhập.", "err");
        return;
      }
      if (typeof GL.openIoModal === "function") GL.openIoModal();
      else openModal("ioModal");
    }
    var openIoBtn = document.getElementById("openIoModal");
    if (openIoBtn) openIoBtn.addEventListener("click", openIoFeature);
    var openIoEmpty = document.getElementById("openIoFromEmpty");
    if (openIoEmpty) openIoEmpty.addEventListener("click", openIoFeature);

    // Tổng hợp toàn giáo xứ (admin)
    document.getElementById("openParishModal").addEventListener("click", function () {
      if (!GL.requireBanGL("Chỉ admin được xem Tổng hợp giáo xứ.")) return;
      if (typeof GL.showParishModal === "function") GL.showParishModal();
    });
    ["parishModalClose", "parishModalDone"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", function () {
          if (typeof GL.closeParishModal === "function") GL.closeParishModal();
          else closeModal("parishModal");
        });
      }
    });
    var parishModal = document.getElementById("parishModal");
    if (parishModal) {
      parishModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) {
          if (typeof GL.closeParishModal === "function") GL.closeParishModal();
          else closeModal("parishModal");
        }
      });
    }
    function onParishFilterChange() {
      if (typeof GL.refreshParishOverview === "function") GL.refreshParishOverview();
    }
    ["parishTerm", "parishFilterClass", "parishFilterRank", "parishSort"].forEach(
      function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener("change", onParishFilterChange);
      }
    );
    var parishName = document.getElementById("parishFilterName");
    if (parishName) {
      parishName.addEventListener("input", onParishFilterChange);
    }
    var parishRefresh = document.getElementById("parishRefreshBtn");
    if (parishRefresh) {
      parishRefresh.addEventListener("click", onParishFilterChange);
    }
    var parishExport = document.getElementById("parishExportBtn");
    if (parishExport) {
      parishExport.addEventListener("click", function () {
        if (typeof GL.exportParishExcel === "function") GL.exportParishExcel();
      });
    }
    var parishTabStudents = document.getElementById("parishTabStudents");
    var parishTabClasses = document.getElementById("parishTabClasses");
    if (parishTabStudents) {
      parishTabStudents.addEventListener("click", function () {
        GL.setParishTab("students");
      });
    }
    if (parishTabClasses) {
      parishTabClasses.addEventListener("click", function () {
        GL.setParishTab("classes");
      });
    }
    var parishStBody = document.getElementById("parishStudentTbody");
    if (parishStBody) {
      parishStBody.addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-class-id]");
        if (!tr) return;
        GL.openClassFromParish(tr.getAttribute("data-class-id"));
      });
    }
    var parishClBody = document.getElementById("parishClassTbody");
    if (parishClBody) {
      parishClBody.addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-class-id]");
        if (!tr) return;
        GL.openClassFromParish(tr.getAttribute("data-class-id"));
      });
    }
    document.getElementById("openWeightsModal").addEventListener("click", function () {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được chỉnh hệ số.")) return;
      var cls = GL.activeClass();
      if (cls) GL.renderWeights(cls);
      openModal("weightsModal");
    });

    ["addStudentModalClose", "addStudentModalCancel"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("addStudentModal");
      });
    });
    ["ioModalClose", "ioModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("ioModal");
      });
    });
    ["weightsModalClose", "weightsModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("weightsModal");
        GL.render(); // cập nhật TB sau khi đổi hệ số
      });
    });

    // Chặn đổi hệ số nếu không phải admin (phòng mở modal lạ)
    document.getElementById("weights").addEventListener(
      "change",
      function (e) {
        if (!GL.isBanGL || !GL.isBanGL()) {
          e.stopImmediatePropagation();
          GL.toast("Chỉ admin được chỉnh hệ số.", "err");
          GL.render();
        }
      },
      true
    );

    document.getElementById("addStudentModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("addStudentModal");
    });
    document.getElementById("ioModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("ioModal");
    });
    document.getElementById("weightsModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("weightsModal");
    });

    document.getElementById("addClassBtn").addEventListener("click", function () {
      if (typeof GL.canCreateClass === "function" && !GL.canCreateClass()) {
        GL.toast("Không có quyền tạo lớp.", "err");
        return;
      }
      var nameEl = document.getElementById("newClassName");
      var yearEl = document.getElementById("newClassYear");
      // Mặc định năm học = filter đang chọn
      if (yearEl && !yearEl.value.trim() && GL.activeYearFilter) {
        yearEl.value = GL.activeYearFilter;
      }
      var name = nameEl.value.trim();
      if (!name) {
        nameEl.focus();
        GL.toast("Nhập tên lớp.", "err");
        return;
      }
      function doCreateClass() {
        var cls = GL.createClass(name, yearEl.value);
        GL.state.classes.push(cls);
        GL.state.activeClassId = cls.id;
        var u = GL.currentUser && GL.currentUser();
        if (u && u.role === "glv") {
          u.classIds = u.classIds || [];
          if (u.classIds.indexOf(cls.id) < 0) {
            u.classIds.push(cls.id);
            GL.saveAuthStore();
          }
        }
        if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Tạo lớp");
        GL.saveState();
        if (typeof GL.setHomeView === "function") GL.setHomeView("class");
        nameEl.value = "";
        yearEl.value = GL.activeYearFilter || "";
        GL.render();
        GL.toast('Đã tạo lớp "' + cls.name + '"');
        document.getElementById("sidebar").classList.remove("open");
      }
      var dup = GL.state.classes.some(function (c) {
        return (
          GL.normName(c.name) === GL.normName(name) &&
          c.year === yearEl.value.trim()
        );
      });
      if (dup) {
        GL.confirm({
          title: "Lớp trùng tên",
          message: 'Đã có lớp "' + name + '". Vẫn tạo thêm lớp mới?',
          type: "warn",
          okText: "Vẫn tạo",
        }).then(function (ok) {
          if (ok) doCreateClass();
        });
        return;
      }
      doCreateClass();
    });

    document.getElementById("newClassName").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("addClassBtn").click();
      }
    });

    document.getElementById("focusNewClass").addEventListener("click", function () {
      document.getElementById("sidebar").classList.add("open");
      document.getElementById("newClassName").focus();
    });

    document.getElementById("sidebarToggle").addEventListener("click", function () {
      if (typeof GL.toggleMobileDrawer === "function") {
        GL.toggleMobileDrawer();
      } else {
        document.getElementById("sidebar").classList.toggle("open");
      }
    });

    // ─── Mobile app shell: drawer · bottom nav · sheet · FAB ───
    (function setupMobileShell() {
      var sidebar = document.getElementById("sidebar");
      var scrim = document.getElementById("sidebarScrim");

      function setDrawerOpen(open) {
        if (!sidebar) return;
        sidebar.classList.toggle("open", !!open);
        if (scrim) {
          scrim.classList.toggle("is-open", !!open);
          if (open) scrim.removeAttribute("hidden");
          else scrim.setAttribute("hidden", "");
        }
        document.body.classList.toggle("m-drawer-open", !!open);
      }
      function closeDrawer() {
        setDrawerOpen(false);
      }
      function openDrawer() {
        setDrawerOpen(true);
      }
      function toggleDrawer() {
        setDrawerOpen(!sidebar.classList.contains("open"));
      }
      GL.openMobileDrawer = openDrawer;
      GL.closeMobileDrawer = closeDrawer;
      GL.toggleMobileDrawer = toggleDrawer;

      var openBtn = document.getElementById("mOpenDrawer");
      var closeBtn = document.getElementById("mCloseDrawer");
      if (openBtn) openBtn.addEventListener("click", openDrawer);
      if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
      if (scrim) scrim.addEventListener("click", closeDrawer);

      // Close drawer when picking a class (event already removes .open — sync scrim)
      var origObs = null;
      if (sidebar && typeof MutationObserver !== "undefined") {
        origObs = new MutationObserver(function () {
          var open = sidebar.classList.contains("open");
          if (scrim) {
            scrim.classList.toggle("is-open", open);
            if (open) scrim.removeAttribute("hidden");
            else scrim.setAttribute("hidden", "");
          }
          document.body.classList.toggle("m-drawer-open", open);
        });
        origObs.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
      }

      function openMoreSheet() {
        var sheet = document.getElementById("mMoreSheet");
        if (sheet) sheet.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      }
      function closeMoreSheet() {
        var sheet = document.getElementById("mMoreSheet");
        if (sheet) sheet.classList.add("hidden");
        if (!document.querySelector(".modal-overlay:not(.hidden)")) {
          document.body.style.overflow = "";
        }
      }
      GL.openMoreSheet = openMoreSheet;
      GL.closeMoreSheet = closeMoreSheet;

      var moreClose = document.getElementById("mMoreClose");
      var moreSheet = document.getElementById("mMoreSheet");
      if (moreClose) moreClose.addEventListener("click", closeMoreSheet);
      if (moreSheet) {
        moreSheet.addEventListener("click", function (e) {
          if (e.target === moreSheet) closeMoreSheet();
        });
      }

      var topHelp = document.getElementById("mTopHelp");
      if (topHelp) {
        topHelp.addEventListener("click", function () {
          var h = document.getElementById("openHelpModal");
          if (h) h.click();
          else if (typeof openHelpModal === "function") openHelpModal();
        });
      }

      var fab = document.getElementById("mFabAdd");
      if (fab) {
        fab.addEventListener("click", function () {
          var b = document.getElementById("openAddStudentModal");
          if (b) b.click();
        });
      }

      var nav = document.getElementById("mBottomNav");
      if (nav) {
        nav.addEventListener("click", function (e) {
          var btn = e.target.closest("[data-m-nav]");
          if (!btn) return;
          var key = btn.getAttribute("data-m-nav");
          if (key === "home") {
            closeDrawer();
            closeMoreSheet();
            if (typeof GL.setHomeView === "function") GL.setHomeView("dashboard");
            GL.render();
          } else if (key === "classes") {
            closeMoreSheet();
            toggleDrawer();
          } else if (key === "scores") {
            closeDrawer();
            closeMoreSheet();
            var cls = typeof GL.activeClass === "function" ? GL.activeClass() : null;
            if (!cls) {
              openDrawer();
              GL.toast("Chọn lớp để nhập điểm.", "info");
              return;
            }
            if (typeof GL.setHomeView === "function") GL.setHomeView("class");
            if (typeof GL.setViewMode === "function") GL.setViewMode("cards");
            GL.render();
          } else if (key === "more") {
            closeDrawer();
            openMoreSheet();
          }
        });
      }

      var sheetGrid = document.querySelector(".m-sheet-grid");
      if (sheetGrid) {
        sheetGrid.addEventListener("click", function (e) {
          var b = e.target.closest("[data-m-action]");
          if (!b) return;
          var act = b.getAttribute("data-m-action");
          closeMoreSheet();
          var map = {
            io: "openIoModal",
            reports: "openReportsModal",
            backup: "openBackupModal",
            invite: "openInviteModal",
            parish: "openParishModal",
            history: "openHistoryModal",
            users: "openUsersModal",
            weights: "openWeightsModal",
            help: "openHelpModal",
          };
          if (act === "pin") {
            var pinBtn = document.getElementById("openChangePinBtn");
            if (pinBtn) pinBtn.click();
            else if (typeof openChangePinModal === "function") openChangePinModal();
            return;
          }
          if (act === "bio") {
            var bioBtn = document.getElementById("bioToggleBtn");
            if (bioBtn) bioBtn.click();
            else GL.toast("Mở menu sidebar để bật Face ID / vân tay.", "info");
            return;
          }
          if (act === "sync") {
            var syncOpen = document.getElementById("openSyncModal");
            if (syncOpen) syncOpen.click();
            return;
          }
          var id = map[act];
          if (id) {
            var el = document.getElementById(id);
            if (el) el.click();
          }
        });
      }
    })();

    // Năm học filter
    function onYearFilterChange(val) {
      if (typeof GL.setYearFilter === "function") GL.setYearFilter(val);
      // Nếu lớp active không thuộc năm → vẫn giữ, user có thể mở dashboard
      GL.render();
      if (GL.homeView === "dashboard" && typeof GL.renderDashboard === "function") {
        GL.renderDashboard();
      }
    }
    ["yearFilterSelect", "dashYearFilter"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        onYearFilterChange(el.value);
        // sync other select
        document
          .querySelectorAll("#yearFilterSelect, #dashYearFilter")
          .forEach(function (s) {
            if (s !== el) s.value = el.value;
          });
      });
    });

    // Dashboard
    var dashBtn = document.getElementById("openDashboardBtn");
    if (dashBtn) {
      dashBtn.addEventListener("click", function () {
        if (typeof GL.showDashboard === "function") GL.showDashboard();
        document.getElementById("sidebar").classList.remove("open");
      });
    }

    var dashTerm = document.getElementById("dashTerm");
    if (dashTerm) {
      dashTerm.value =
        GL.activeTerm === "hk2" || GL.activeTerm === "year"
          ? GL.activeTerm
          : "hk1";
      dashTerm.addEventListener("change", function () {
        if (typeof GL.renderDashboard === "function") GL.renderDashboard();
      });
    }
    function bindDashOpenClass(root) {
      if (!root) return;
      root.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof HTMLElement)) return;
        var btn = t.closest("[data-open-class]");
        if (!btn) return;
        var id = btn.getAttribute("data-open-class");
        if (typeof GL.openClassFromDashboard === "function") {
          GL.openClassFromDashboard(id);
        }
      });
    }
    bindDashOpenClass(document.getElementById("dashboardView"));
    bindDashOpenClass(document.getElementById("missingBody"));

    var dashMissingBtn = document.getElementById("dashMissingBtn");
    if (dashMissingBtn) {
      dashMissingBtn.addEventListener("click", function () {
        if (!GL.requireBanGL("Chỉ admin được xem nhắc thiếu điểm.")) return;
        if (typeof GL.showMissingModal === "function") GL.showMissingModal();
      });
    }
    var openMissingBtn = document.getElementById("openMissingBtn");
    if (openMissingBtn) {
      openMissingBtn.addEventListener("click", function () {
        if (!GL.requireBanGL("Chỉ admin được xem nhắc thiếu điểm.")) return;
        if (typeof GL.showMissingModal === "function") GL.showMissingModal();
      });
    }
    ["missingModalClose", "missingModalDone"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", function () {
          GL.closeMissingModal();
        });
      }
    });
    var missingModal = document.getElementById("missingModal");
    if (missingModal) {
      missingModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) GL.closeMissingModal();
      });
    }
    ["missingTerm", "missingColFilter"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", function () {
          GL.renderMissingModal();
        });
      }
    });
    var missRef = document.getElementById("missingRefreshBtn");
    if (missRef) {
      missRef.addEventListener("click", function () {
        GL.renderMissingModal();
      });
    }

    // Xuất nhiều lớp (chỉ admin — tích hợp trong Xuất/Nhập)
    function doMultiExport() {
      if (
        typeof GL.canExportMultiClass === "function" &&
        !GL.canExportMultiClass()
      ) {
        GL.toast("Chỉ Ban Giáo lý (admin) được xuất nhiều lớp.", "err");
        return;
      }
      var termEl =
        document.getElementById("ioMultiExportTerm") ||
        document.getElementById("dashTerm");
      var mode = termEl ? termEl.value : "hk1";
      if (typeof GL.exportScopedClassesExcel === "function") {
        GL.exportScopedClassesExcel(mode);
      }
    }
    var exportMulti = document.getElementById("exportMultiClassBtn");
    if (exportMulti) {
      exportMulti.addEventListener("click", doMultiExport);
    }
    var dashExport = document.getElementById("dashExportMultiBtn");
    if (dashExport) {
      dashExport.addEventListener("click", doMultiExport);
    }

    // Chip cột thiếu trên dashboard (delegate)
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      var chip = t.closest("[data-miss-col]");
      if (chip) {
        var col = chip.getAttribute("data-miss-col");
        if (typeof GL.showMissingModal === "function") GL.showMissingModal(col);
        return;
      }
      if (t.id === "dashOpenMissingFull" || t.closest("#dashOpenMissingFull")) {
        if (typeof GL.showMissingModal === "function") GL.showMissingModal();
      }
    });

    // Toggle mục «Các lớp của bạn»
    (function bindClassesAccordion() {
      var KEY = "giao-ly-classes-accordion-open";
      var acc = document.getElementById("classesAccordion");
      var btn = document.getElementById("classesToggle");
      if (!acc || !btn) return;

      function setOpen(open) {
        acc.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        try {
          localStorage.setItem(KEY, open ? "1" : "0");
        } catch (e) {
          /* ignore */
        }
      }

      // mặc định mở; nhớ trạng thái lần trước
      var saved = null;
      try {
        saved = localStorage.getItem(KEY);
      } catch (e2) {
        /* ignore */
      }
      if (saved === "0") setOpen(false);
      else setOpen(true);

      btn.addEventListener("click", function () {
        setOpen(!acc.classList.contains("open"));
      });
    })();

    document.getElementById("classList").addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;

      var del = t.closest("[data-del-class]");
      if (del) {
        e.stopPropagation();
        if (typeof GL.canDeleteClass === "function" && !GL.canDeleteClass()) {
          GL.toast("Chỉ Ban Giáo lý được xóa lớp.", "err");
          return;
        }
        var id = del.getAttribute("data-del-class");
        var cls = GL.state.classes.find(function (c) {
          return c.id === id;
        });
        if (!cls) return;
        GL.confirm({
          title: "Xóa lớp?",
          message:
            'Xóa lớp "' +
            cls.name +
            '" và toàn bộ điểm học viên?\n\nCó thể Hoàn tác (Ctrl+Z) trong phiên này.',
          danger: true,
          okText: "Xóa lớp",
          cancelText: "Giữ lại",
        }).then(function (ok) {
          if (!ok) return;
          GL.state.classes = GL.state.classes.filter(function (c) {
            return c.id !== id;
          });
          if (GL.state.activeClassId === id) {
            GL.state.activeClassId = GL.state.classes[0]
              ? GL.state.classes[0].id
              : null;
          }
          if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Xóa lớp");
          GL.saveState();
          GL.render();
          GL.toast("Đã xóa lớp.");
        });
        return;
      }

      var ren = t.closest("[data-rename-class]");
      if (ren) {
        e.stopPropagation();
        var rid = ren.getAttribute("data-rename-class");
        var rcls = GL.state.classes.find(function (c) {
          return c.id === rid;
        });
        if (!rcls) return;
        var newName = prompt("Tên lớp mới:", rcls.name);
        if (newName == null) return;
        var n = newName.trim();
        if (!n) return;
        var year = prompt("Năm học (để trống nếu giữ nguyên):", rcls.year || "");
        if (year != null) rcls.year = year.trim();
        rcls.name = n;
        GL.touchClass(rcls);
        if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Đổi tên lớp");
        GL.saveState();
        GL.render();
        GL.toast("Đã đổi tên lớp.");
        return;
      }

      var sel = t.closest("[data-select-class]");
      if (sel) {
        GL.state.activeClassId = sel.getAttribute("data-select-class");
        GL.saveState({ skipUndo: true });
        if (typeof GL.setHomeView === "function") GL.setHomeView("class");
        GL.render();
        document.getElementById("sidebar").classList.remove("open");
      }
    });

    document.getElementById("classList").addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var sel = e.target.closest && e.target.closest("[data-select-class]");
      if (sel) {
        e.preventDefault();
        GL.state.activeClassId = sel.getAttribute("data-select-class");
        GL.saveState({ skipUndo: true });
        if (typeof GL.setHomeView === "function") GL.setHomeView("class");
        GL.render();
      }
    });

    document.getElementById("addForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var cls = GL.activeClass();
      if (!cls) return;
      var tenThanh = document.getElementById("inputTenThanh").value.trim();
      var hoDem = document.getElementById("inputHoDem").value.trim();
      var ten = document.getElementById("inputTen").value.trim();
      if (!tenThanh && !hoDem && !ten) {
        GL.toast("Nhập ít nhất Tên (hoặc Họ đệm / Tên thánh).", "err");
        document.getElementById("inputTen").focus();
        return;
      }
      var info = {};
      (GL.INFO_FIELDS || []).forEach(function (f) {
        var el = document.getElementById("addInfo_" + f.key);
        if (el) info[f.key] = el.value.trim();
      });
      cls.students.unshift(
        GL.createStudent(
          Object.assign(
            {
              tenThanh: tenThanh,
              hoDem: hoDem,
              ten: ten,
              scores: GL.emptyScores(),
            },
            info
          )
        )
      );
      GL.touchClass(cls);
      if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Thêm học viên");
      GL.saveState();
      document.getElementById("inputTenThanh").value = "";
      document.getElementById("inputHoDem").value = "";
      document.getElementById("inputTen").value = "";
      (GL.INFO_FIELDS || []).forEach(function (f) {
        var el = document.getElementById("addInfo_" + f.key);
        if (el) el.value = "";
      });
      GL.searchQuery = "";
      document.getElementById("searchInput").value = "";
      GL.render();
      GL.toast("Đã thêm: " + [tenThanh, hoDem, ten].filter(Boolean).join(" "));
      // Giữ modal mở để thêm tiếp
      setTimeout(function () {
        var el = document.getElementById("inputTenThanh");
        if (el) el.focus();
      }, 50);
    });

    document.getElementById("weights").addEventListener("change", function (e) {
      if (!GL.requireBanGL("Chỉ admin được chỉnh hệ số.")) return;
      var cls = GL.activeClass();
      if (!cls) return;
      var t = e.target;
      if (!(t instanceof HTMLInputElement) || !t.dataset.weight) return;
      var w = parseFloat(t.value);
      if (Number.isNaN(w) || w < 0) w = 0;
      cls.weights[t.dataset.weight] = w;
      GL.touchClass(cls);
      if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Đổi hệ số");
      GL.saveState();
      GL.render();
    });

    var studentsEl = document.getElementById("students");

    studentsEl.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;

      if (
        t.id === "printBtn" ||
        t.closest("#printBtn") ||
        t.id === "printYearBtn" ||
        t.closest("#printYearBtn")
      ) {
        window.print();
        return;
      }
      if (
        t.id === "openPrintSettingsBtn" ||
        t.closest("#openPrintSettingsBtn")
      ) {
        if (typeof openPrintSettingsModal === "function") {
          openPrintSettingsModal();
        }
        return;
      }
      if (t.id === "exportYearBtn" || t.closest("#exportYearBtn")) {
        if (typeof GL.showExportPreview === "function") GL.showExportPreview();
        else if (typeof GL.exportExcel === "function") GL.exportExcel();
        return;
      }
      if (t.id === "goCardsFromPrint" || t.closest("#goCardsFromPrint")) {
        GL.setViewMode("cards");
        var c = GL.activeClass();
        if (c) GL.renderStudents(c);
        return;
      }

      var cls = GL.activeClass();
      if (!cls) return;

      var moveSt = t.closest("[data-move-student]");
      if (moveSt) {
        openTransferModal(moveSt.getAttribute("data-move-student"));
        return;
      }

      var delSt = t.closest("[data-del-student]");
      if (delSt) {
        var id = delSt.getAttribute("data-del-student");
        GL.confirm({
          title: "Xóa học viên?",
          message: "Xóa học viên này khỏi lớp? Có thể hoàn tác bằng Ctrl+Z.",
          danger: true,
          okText: "Xóa",
          cancelText: "Hủy",
        }).then(function (ok) {
          if (!ok) return;
          var c = GL.activeClass();
          if (!c) return;
          c.students = c.students.filter(function (s) {
            return s.id !== id;
          });
          GL.touchClass(c);
          if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Xóa học viên");
          GL.saveState();
          GL.render();
          GL.toast("Đã xóa học viên.");
        });
        return;
      }

      var delSc = t.closest("[data-del-score]");
      if (delSc) {
        var sid = delSc.getAttribute("data-sid");
        var col = delSc.getAttribute("data-col");
        var idx = Number(delSc.getAttribute("data-idx"));
        var st = cls.students.find(function (s) {
          return s.id === sid;
        });
        if (!st) return;
        var bagDel = GL.getScores(st);
        if (!bagDel[col]) bagDel[col] = [];
        var beforeDel = bagDel[col].slice();
        bagDel[col].splice(idx, 1);
        if (typeof GL.logScoreColumnChange === "function") {
          GL.logScoreColumnChange(st, col, beforeDel, bagDel[col], "delete");
        }
        GL.touchClass(cls);
        if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Xóa điểm");
        GL.saveState();
        GL.render();
        return;
      }

      var addBtn = t.closest("[data-add-score]");
      if (addBtn) {
        var asid = addBtn.getAttribute("data-sid");
        var acol = addBtn.getAttribute("data-col");
        var wrap = addBtn.closest(".add-score");
        var ain = wrap && wrap.querySelector("input");
        addScore(cls, asid, acol, ain);
        return;
      }

    });

    studentsEl.addEventListener("keydown", function (e) {
      var t = e.target;
      if (
        e.key === "Enter" &&
        t instanceof HTMLInputElement &&
        t.dataset.tableScore != null
      ) {
        e.preventDefault();
        t.blur();
        return;
      }
      if (e.key !== "Enter") return;
      var cls = GL.activeClass();
      if (!cls) return;
      if (!(t instanceof HTMLInputElement) || !t.dataset.scoreInput) return;
      e.preventDefault();
      addScore(cls, t.dataset.sid, t.dataset.col, t);
    });

    function saveStudentNote(el) {
      var cls = GL.activeClass();
      if (!cls || !el.dataset.sid) return;
      var st = cls.students.find(function (s) {
        return s.id === el.dataset.sid;
      });
      if (!st) return;
      st.ghiChu = el.value; // giữ xuống dòng nếu textarea
      GL.ensureNameFields(st);
      // ensureNameFields trim ghiChu - for textarea we want preserve internal newlines but trim ends
      st.ghiChu = String(el.value || "").replace(/^\s+|\s+$/g, "");
      GL.touchClass(cls);
      if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Sửa ghi chú");
      GL.saveState();
    }

    studentsEl.addEventListener("change", function (e) {
      var t = e.target;
      if (
        !(
          t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement
        )
      ) {
        return;
      }
      if (t instanceof HTMLInputElement && t.dataset.tableScore != null) {
        commitTableScore(t);
        return;
      }
      // Ghi chú
      if (t.dataset.note != null && t.dataset.sid) {
        saveStudentNote(t);
        return;
      }
      var cls = GL.activeClass();
      if (!cls) return;

      // Thông tin học viên (mã, NS, SĐT…)
      if (t.dataset.infoField && t.dataset.sid) {
        var sti = cls.students.find(function (s) {
          return s.id === t.dataset.sid;
        });
        if (!sti) return;
        var ikey = t.dataset.infoField;
        var allowed = (GL.INFO_FIELDS || []).map(function (f) {
          return f.key;
        });
        if (allowed.indexOf(ikey) < 0) return;
        sti[ikey] = t.value.trim();
        GL.ensureNameFields(sti);
        GL.touchClass(cls);
        if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Sửa thông tin HV");
        GL.saveState();
        // cập nhật dòng tóm tắt nếu có (không re-render full để giữ focus)
        var art = t.closest(".student");
        if (art) {
          var line = art.querySelector(".info-summary-line");
          var sum = GL.infoSummary(sti);
          if (sum) {
            if (!line) {
              line = document.createElement("div");
              line.className = "info-summary-line";
              var cols = art.querySelector(".cols");
              if (cols) art.insertBefore(line, cols);
            }
            line.title = sum;
            line.textContent = "ℹ️ " + sum;
          } else if (line) {
            line.remove();
          }
        }
        return;
      }

      // Sửa Tên thánh / Họ đệm / Tên
      if (t.dataset.nameField && t.dataset.sid) {
        var stn = cls.students.find(function (s) {
          return s.id === t.dataset.sid;
        });
        if (!stn) return;
        var field = t.dataset.nameField;
        if (["tenThanh", "hoDem", "ten"].indexOf(field) < 0) return;
        stn[field] = t.value.trim();
        // đã tách 3 cột → bỏ name legacy để displayName dùng 3 cột
        if (stn.tenThanh || stn.hoDem || stn.ten) stn.name = "";
        GL.ensureNameFields(stn);
        GL.touchClass(cls);
        if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Sửa tên HV");
        GL.saveState();
        // cập nhật TB/stats không cần full re-render (tránh mất focus)
        GL.renderStats(cls);
        return;
      }

      if (!t.dataset.rename) return;
      // legacy single rename (không còn dùng)
      var st = cls.students.find(function (s) {
        return s.id === t.dataset.rename;
      });
      if (!st) return;
      st.name = t.value.trim();
      GL.touchClass(cls);
      if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Sửa tên HV");
      GL.saveState();
    });

    // Lưu ghi chú khi gõ xong (blur) — textarea
    studentsEl.addEventListener(
      "blur",
      function (e) {
        var t = e.target;
        if (!(t instanceof HTMLTextAreaElement)) return;
        if (t.dataset.note == null) return;
        saveStudentNote(t);
      },
      true
    );

    document.getElementById("sortBtn").addEventListener("click", function () {
      var cls = GL.activeClass();
      if (!cls) return;
      var term = GL.activeTerm || "hk1";
      cls.students.sort(function (a, b) {
        var ta = GL.studentTBContext(a, cls.weights, term);
        var tb = GL.studentTBContext(b, cls.weights, term);
        if (ta == null && tb == null) return 0;
        if (ta == null) return 1;
        if (tb == null) return -1;
        return tb - ta;
      });
      GL.touchClass(cls);
      if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Sắp xếp HV");
      GL.saveState();
      GL.render();
    });

    document.getElementById("clearBtn").addEventListener("click", function () {
      var cls = GL.activeClass();
      if (!cls || !cls.students.length) return;
      GL.confirm({
        title: "Xóa hết học viên?",
        message:
          "Xóa hết " +
          cls.students.length +
          ' học viên của lớp "' +
          cls.name +
          '"?\n\nCó thể Hoàn tác bằng Ctrl+Z.',
        danger: true,
        okText: "Xóa hết",
        cancelText: "Hủy",
      }).then(function (ok) {
        if (!ok) return;
        var c = GL.activeClass();
        if (!c) return;
        c.students = [];
        GL.touchClass(c);
        if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Xóa hết HV lớp");
        GL.saveState();
        GL.render();
        GL.toast("Đã xóa hết học viên lớp này.");
      });
    });

    document.getElementById("searchInput").addEventListener("input", function (e) {
      GL.searchQuery = e.target.value;
      var cls = GL.activeClass();
      if (cls) GL.renderStudents(cls);
    });

    document.getElementById("viewSwitcher").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-view]");
      if (!btn) return;
      GL.setViewMode(btn.getAttribute("data-view"));
      var cls = GL.activeClass();
      if (cls) GL.renderStudents(cls);
    });

    // Theo dõi = thiếu điểm + nhật ký
    GL._journalOnlyAttention = false;
    GL._journalOnlyMissing = false;
    var studentsRoot = document.getElementById("students");
    if (studentsRoot) {
      studentsRoot.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof HTMLElement)) return;

        var addLog = t.closest("[data-add-log]");
        if (addLog) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof GL.openJournalLogModal === "function") {
            GL.openJournalLogModal(addLog.getAttribute("data-sid"));
          }
          return;
        }
        var delLog = t.closest("[data-del-log]");
        if (delLog) {
          e.preventDefault();
          e.stopPropagation();
          var sid = delLog.getAttribute("data-sid");
          var lid = delLog.getAttribute("data-log-id");
          var cls2 = GL.activeClass();
          if (!cls2) return;
          var st = cls2.students.find(function (s) {
            return s.id === sid;
          });
          if (!st) return;
          GL.confirm({
            title: "Xóa ghi chú?",
            message: "Xóa mục nhật ký này?",
            danger: true,
            okText: "Xóa",
          }).then(function (ok) {
            if (!ok) return;
            if (typeof GL.setUndoLabel === "function") {
              GL.setUndoLabel("Xóa nhật ký");
            }
            GL.deleteLearningLog(st, lid);
            GL.touchClass(cls2);
            GL.saveState();
            GL.renderStudents(cls2);
            GL.toast("Đã xóa ghi chú.");
          });
        }
      });
      studentsRoot.addEventListener("change", function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === "journalOnlyAttention") {
          GL._journalOnlyAttention = t.checked;
          var c = GL.activeClass();
          if (c) GL.renderStudents(c);
        }
        if (t.id === "journalOnlyMissing") {
          GL._journalOnlyMissing = t.checked;
          var c2 = GL.activeClass();
          if (c2) GL.renderStudents(c2);
        }
      });
    }

    ["journalLogClose", "journalLogCancel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", function () {
          GL.closeJournalLogModal();
        });
      }
    });
    var journalModal = document.getElementById("journalLogModal");
    if (journalModal) {
      journalModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) GL.closeJournalLogModal();
      });
    }
    var journalSave = document.getElementById("journalLogSave");
    if (journalSave) {
      journalSave.addEventListener("click", function () {
        GL.saveJournalLogFromModal();
      });
    }
    var journalType = document.getElementById("journalType");
    if (journalType) {
      journalType.addEventListener("change", function () {
        var levelEl = document.getElementById("journalLevel");
        if (!levelEl) return;
        var def = GL.logTypeMeta(journalType.value).defaultLevel;
        if (def) levelEl.value = def;
      });
    }

    function safeExportExcel(e) {
      if (e) e.preventDefault();
      if (typeof GL.canExport === "function" && !GL.canExport()) {
        GL.toast("Cần đăng nhập để xuất.", "err");
        return;
      }
      try {
        // Mở xem trước — chỉ tải file khi bấm Xác nhận trong modal
        if (typeof GL.showExportPreview === "function") GL.showExportPreview();
        else if (typeof GL.exportExcel === "function") GL.exportExcel();
        else GL.toast("Chức năng xuất Excel chưa sẵn sàng.", "err");
      } catch (err) {
        console.error(err);
        GL.toast("Lỗi xuất Excel: " + (err.message || err), "err");
      }
    }
    document.getElementById("exportXlsxBtn").addEventListener("click", safeExportExcel);

    // Modal xem trước xuất Excel
    function closeExportPreviewUI() {
      if (typeof GL.closeExportPreview === "function") GL.closeExportPreview();
    }
    document
      .getElementById("exportPreviewClose")
      .addEventListener("click", closeExportPreviewUI);
    document
      .getElementById("exportPreviewCancel")
      .addEventListener("click", closeExportPreviewUI);
    document
      .getElementById("exportPreviewConfirm")
      .addEventListener("click", function () {
        if (typeof GL.confirmExportExcel === "function") GL.confirmExportExcel();
      });
    document
      .getElementById("exportPreviewModal")
      .addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeExportPreviewUI();
      });
    document
      .getElementById("exportSheetTabs")
      .addEventListener("click", function (e) {
        var cb = e.target.closest(".export-sheet-cb");
        if (cb) {
          // không đổi tab khi chỉ tick checkbox
          e.stopPropagation();
          var key = cb.getAttribute("data-sheet");
          var pending = GL._pendingExport;
          if (pending) {
            var sheet = pending.sheets.find(function (s) {
              return s.key === key;
            });
            if (sheet) sheet.include = cb.checked;
          }
          return;
        }
        var tab = e.target.closest(".export-sheet-tab");
        if (!tab) return;
        var sk = tab.getAttribute("data-sheet");
        if (sk && typeof GL.renderExportPreviewSheet === "function") {
          GL.renderExportPreviewSheet(sk);
        }
      });

    // Đổi loại xuất → build lại preview + tên file
    document.getElementById("exportModeList").addEventListener("change", function (e) {
      if (!e.target || e.target.name !== "exportMode") return;
      if (typeof GL.refreshExportPreviewUI === "function") {
        GL.refreshExportPreviewUI();
      }
    });
    document.getElementById("exportCsvBtn").addEventListener("click", function () {
      if (typeof GL.canExport === "function" && !GL.canExport()) {
        GL.toast("Cần đăng nhập để xuất.", "err");
        return;
      }
      try {
        GL.exportCsv();
      } catch (err) {
        GL.toast("Lỗi xuất CSV: " + (err.message || err), "err");
      }
    });
    document.getElementById("templateBtn").addEventListener("click", function () {
      if (typeof GL.canImport === "function" && !GL.canImport()) {
        GL.toast("Chỉ admin được tải mẫu nhập.", "err");
        return;
      }
      try {
        GL.downloadTemplate();
      } catch (err) {
        GL.toast("Lỗi tải mẫu: " + (err.message || err), "err");
      }
    });

    // --- Import preview modal ---
    function closePreview() {
      GL.closeImportPreview();
    }

    document
      .getElementById("importPreviewClose")
      .addEventListener("click", closePreview);
    document
      .getElementById("importPreviewCancel")
      .addEventListener("click", closePreview);
    document
      .getElementById("importPreviewConfirm")
      .addEventListener("click", function () {
        GL.confirmImportPreview();
      });

    document
      .getElementById("importPreviewMode")
      .addEventListener("change", function () {
        GL.refreshImportPreviewActions();
      });

    document
      .getElementById("importPreviewTerm")
      .addEventListener("change", function (e) {
        var pending = GL._pendingImport;
        if (!pending) return;
        var term = e.target.value === "hk2" ? "hk2" : "hk1";
        pending.importTerm = term;
        // chuyển điểm pending sang kỳ mới nếu chỉ có 1 kỳ
        pending.students.forEach(function (st) {
          GL.ensureStudentTerms(st);
          var a = GL.getScores(st, "hk1");
          var b = GL.getScores(st, "hk2");
          var has1 = GL.COLS.some(function (c) {
            return a[c.key] && a[c.key].length;
          });
          var has2 = GL.COLS.some(function (c) {
            return b[c.key] && b[c.key].length;
          });
          if (term === "hk2" && has1 && !has2) {
            st.scoresByTerm.hk2 = GL.cloneScores(a);
            st.scoresByTerm.hk1 = GL.emptyScores();
          } else if (term === "hk1" && has2 && !has1) {
            st.scoresByTerm.hk1 = GL.cloneScores(b);
            st.scoresByTerm.hk2 = GL.emptyScores();
          }
        });
        var sub = document.getElementById("importPreviewSub");
        var cls = GL.activeClass();
        if (sub && cls) {
          sub.textContent =
            "Nhập vào " +
            GL.termLabel(term) +
            ' · lớp "' +
            cls.name +
            '"';
        }
        GL.refreshImportPreviewActions();
      });

    document
      .getElementById("importSelectAll")
      .addEventListener("change", function (e) {
        var pending = GL._pendingImport;
        if (!pending) return;
        var on = e.target.checked;
        // Chỉ áp cho dòng đang hiện (theo filter)
        var visible = GL.getVisibleImportIndices();
        visible.forEach(function (i) {
          pending.selected[i] = on;
        });
        var tbody = document.getElementById("importPreviewTbody");
        if (tbody) {
          Array.prototype.forEach.call(
            tbody.querySelectorAll(".import-row-cb"),
            function (cb) {
              var idx = Number(cb.getAttribute("data-idx"));
              if (visible.indexOf(idx) >= 0) cb.checked = on;
            }
          );
        }
        GL.applyImportPreviewFilter();
      });

    document
      .getElementById("importPreviewTbody")
      .addEventListener("change", function (e) {
        var t = e.target;
        if (!(t instanceof HTMLInputElement) || !t.classList.contains("import-row-cb")) {
          return;
        }
        var pending = GL._pendingImport;
        if (!pending) return;
        var idx = Number(t.getAttribute("data-idx"));
        if (Number.isNaN(idx)) return;
        pending.selected[idx] = t.checked;
        GL.applyImportPreviewFilter();
      });

    // Filter lớp / tên trong preview
    document
      .getElementById("importFilterLop")
      .addEventListener("change", function () {
        // Đổi lớp → tự chỉ chọn dòng thuộc lớp đó + hiện nút tạo lớp nếu chưa có
        GL.selectVisibleImportRows();
      });

    document
      .getElementById("importFilterName")
      .addEventListener("input", function () {
        GL.applyImportPreviewFilter();
      });

    document
      .getElementById("importFilterSelectVisible")
      .addEventListener("click", function () {
        GL.selectVisibleImportRows();
        var n = GL.getSelectedImportStudents().length;
        GL.toast("Đã chọn " + n + " học viên theo bộ lọc.");
      });

    // Tạo lớp mới đúng tên filter (khi lớp trong file chưa có trong app)
    var createClsBtn = document.getElementById("importCreateClassBtn");
    if (createClsBtn) {
      createClsBtn.addEventListener("click", function () {
        GL.createImportClassFromFilter();
      });
    }

    // Đóng modal khi bấm nền hoặc Esc
    document
      .getElementById("importPreviewModal")
      .addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closePreview();
      });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      // Dialog xác nhận tự xử lý Escape
      var appDlg = document.getElementById("appDialog");
      if (appDlg && !appDlg.classList.contains("hidden")) return;
      var jlog = document.getElementById("journalLogModal");
      if (jlog && !jlog.classList.contains("hidden")) {
        GL.closeJournalLogModal();
        return;
      }
      var trM = document.getElementById("transferModal");
      if (trM && !trM.classList.contains("hidden")) {
        closeModal("transferModal");
        return;
      }
      var helpM = document.getElementById("helpModal");
      if (helpM && !helpM.classList.contains("hidden")) {
        closeModal("helpModal");
        return;
      }
      var missM = document.getElementById("missingModal");
      if (missM && !missM.classList.contains("hidden")) {
        GL.closeMissingModal();
        return;
      }
      var parish = document.getElementById("parishModal");
      if (parish && !parish.classList.contains("hidden")) {
        if (typeof GL.closeParishModal === "function") GL.closeParishModal();
        else closeModal("parishModal");
        return;
      }
      var exportPrev = document.getElementById("exportPreviewModal");
      if (exportPrev && !exportPrev.classList.contains("hidden")) {
        closeExportPreviewUI();
        return;
      }
      var histM = document.getElementById("historyModal");
      if (histM && !histM.classList.contains("hidden")) {
        closeModal("historyModal");
        return;
      }
      var inviteM = document.getElementById("inviteModal");
      if (inviteM && !inviteM.classList.contains("hidden")) {
        closeModal("inviteModal");
        return;
      }
      var preview = document.getElementById("importPreviewModal");
      if (preview && !preview.classList.contains("hidden")) {
        closePreview();
        return;
      }
      var addSt = document.getElementById("addStudentModal");
      if (addSt && !addSt.classList.contains("hidden")) {
        closeModal("addStudentModal");
        return;
      }
      var weights = document.getElementById("weightsModal");
      if (weights && !weights.classList.contains("hidden")) {
        closeModal("weightsModal");
        GL.render();
        return;
      }
      var io = document.getElementById("ioModal");
      if (io && !io.classList.contains("hidden")) {
        closeModal("ioModal");
      }
    });

    // Khi mở xem trước import → đóng modal xuất/nhập cho gọn
    var _showPreview = GL.showImportPreview;
    if (typeof _showPreview === "function") {
      GL.showImportPreview = function (students, fileName) {
        closeModal("ioModal");
        return _showPreview.call(GL, students, fileName);
      };
    }

    var dropzone = document.getElementById("dropzone");
    var importFile = document.getElementById("importFile");

    dropzone.addEventListener("click", function () {
      if (typeof GL.canImport === "function" && !GL.canImport()) {
        GL.toast("Chỉ admin được nhập file.", "err");
        return;
      }
      importFile.click();
    });
    dropzone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (typeof GL.canImport === "function" && !GL.canImport()) {
          GL.toast("Chỉ admin được nhập file.", "err");
          return;
        }
        importFile.click();
      }
    });
    importFile.addEventListener("change", function () {
      var f = importFile.files && importFile.files[0];
      if (f) GL.handleImportFile(f);
      importFile.value = "";
    });

    ["dragenter", "dragover"].forEach(function (ev) {
      dropzone.addEventListener(ev, function (e) {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dropzone.addEventListener(ev, function (e) {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      });
    });
    dropzone.addEventListener("drop", function (e) {
      if (typeof GL.canImport === "function" && !GL.canImport()) {
        GL.toast("Chỉ admin được nhập file.", "err");
        return;
      }
      var f =
        e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) GL.handleImportFile(f);
    });

    // ——— Phase 1–4: Backup, báo cáo, mẫu in, tài khoản ———
    function openBackupModalSafe() {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được sao lưu / khôi phục.")) return;
      var st =
        typeof GL.getBackupStatus === "function" ? GL.getBackupStatus() : null;
      var sub = document.getElementById("backupModalSub");
      var statusEl = document.getElementById("backupModalStatus");
      if (sub && st) sub.textContent = st.label;
      if (statusEl && st) {
        statusEl.className =
          "hint app-notice-" +
          (st.level === "ok" ? "ok" : st.level === "danger" ? "err" : "warn");
        var meta = GL.getBackupMeta ? GL.getBackupMeta() : {};
        statusEl.textContent =
          st.label +
          (st.lastFile ? " · file: " + st.lastFile : "") +
          (st.count ? " · " + st.count + " lần trên máy này" : "") +
          (meta.folderName ? " · thư mục: " + meta.folderName : "");
      }
      openModal("backupModal");
      if (typeof GL.updateBackupFolderUI === "function") {
        GL.updateBackupFolderUI();
      }
    }
    document.getElementById("openBackupModal").addEventListener("click", openBackupModalSafe);
    ["backupModalClose", "backupModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("backupModal");
      });
    });
    document.getElementById("backupModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("backupModal");
    });
    document.getElementById("backupExportBtn").addEventListener("click", function () {
      Promise.resolve(GL.exportBackup()).then(function () {
        openBackupModalSafe();
      });
    });

    // ─── Supabase sync UI ───
    GL.updateSyncUI = function updateSyncUI() {
      var box = document.getElementById("syncStatusBox");
      var text = document.getElementById("syncText");
      var st =
        typeof GL.getSyncStatus === "function"
          ? GL.getSyncStatus()
          : { status: "off", message: "" };
      var configured =
        typeof GL.isSupabaseConfigured === "function" &&
        GL.isSupabaseConfigured();
      if (box) {
        box.classList.remove("is-ok", "is-err", "is-syncing", "is-off");
        var cls = "is-off";
        if (!configured) cls = "is-off";
        else if (st.status === "ok") cls = "is-ok";
        else if (st.status === "err") cls = "is-err";
        else if (st.status === "syncing") cls = "is-syncing";
        else cls = "is-off";
        box.classList.add(cls);
      }
      if (text) {
        if (!configured) text.textContent = "Cloud: chưa cấu hình";
        else if (st.message) text.textContent = st.message;
        else text.textContent = "Cloud: sẵn sàng";
      }
      var modalSt = document.getElementById("syncModalStatus");
      if (modalSt) {
        var meta =
          typeof GL.getSyncMeta === "function" ? GL.getSyncMeta() : {};
        var parts = [];
        if (configured) parts.push("Key: đã lưu");
        else parts.push("Key: chưa có");
        if (meta.lastRev != null) parts.push("rev " + meta.lastRev);
        if (meta.lastPushAt)
          parts.push(
            "đẩy " + new Date(meta.lastPushAt).toLocaleString("vi-VN")
          );
        if (meta.lastPullAt)
          parts.push(
            "kéo " + new Date(meta.lastPullAt).toLocaleString("vi-VN")
          );
        modalSt.textContent = parts.join(" · ");
      }
    };

    function openSyncModal() {
      var ta = document.getElementById("syncAnonKey");
      if (ta && typeof GL.getSupabaseAnonKey === "function") {
        ta.value = GL.getSupabaseAnonKey() || "";
      }
      var err = document.getElementById("syncModalError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
      openModal("syncModal");
    }
    var openSyncBtn = document.getElementById("openSyncModal");
    if (openSyncBtn) openSyncBtn.addEventListener("click", openSyncModal);
    ["syncModalClose", "syncModalDone"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el)
        el.addEventListener("click", function () {
          closeModal("syncModal");
        });
    });
    var syncModal = document.getElementById("syncModal");
    if (syncModal) {
      syncModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeModal("syncModal");
      });
    }
    var syncSaveKey = document.getElementById("syncSaveKeyBtn");
    if (syncSaveKey) {
      syncSaveKey.addEventListener("click", function () {
        var ta = document.getElementById("syncAnonKey");
        var key = ta ? ta.value.trim() : "";
        var err = document.getElementById("syncModalError");
        if (!key) {
          if (err) {
            err.textContent = "Dán anon public key từ Supabase.";
            err.classList.remove("hidden");
          }
          return;
        }
        if (typeof GL.setSupabaseAnonKey === "function") {
          GL.setSupabaseAnonKey(key);
        }
        if (typeof GL.resetSupabaseClient === "function") {
          GL.resetSupabaseClient();
        }
        if (typeof GL.installCloudHooks === "function") GL.installCloudHooks();
        if (err) err.classList.add("hidden");
        GL.toast("Đã lưu key — đang đồng bộ…");
        if (typeof GL.initCloudSync === "function") {
          GL.initCloudSync().then(function (r) {
            if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
            if (r && r.ok) {
              GL.toast("☁️ Cloud sẵn sàng");
              if (typeof GL.render === "function") GL.render();
            } else if (r && r.error) {
              if (err) {
                err.textContent = r.error;
                err.classList.remove("hidden");
              }
              GL.toast(r.error, "err");
            }
          });
        }
      });
    }
    var syncPullBtn = document.getElementById("syncPullBtn");
    if (syncPullBtn) {
      syncPullBtn.addEventListener("click", function () {
        if (!GL.isSupabaseConfigured || !GL.isSupabaseConfigured()) {
          GL.toast("Lưu anon key trước.", "err");
          return;
        }
        GL.cloudPull({ force: true, silent: false }).then(function (r) {
          if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
          if (!r.ok) GL.toast(r.error || "Không tải được.", "err");
          else if (r.empty) {
            /* toast đã có trong pull */
          } else if (typeof GL.render === "function") GL.render();
        });
      });
    }
    var syncPushBtn = document.getElementById("syncPushBtn");
    if (syncPushBtn) {
      syncPushBtn.addEventListener("click", function () {
        if (!GL.isSupabaseConfigured || !GL.isSupabaseConfigured()) {
          GL.toast("Lưu anon key trước.", "err");
          return;
        }
        var n =
          GL.state && GL.state.classes ? GL.state.classes.length : 0;
        if (!n) {
          GL.toast(
            "Máy này chưa có lớp để đẩy. Hãy mở app trên máy đã có điểm rồi Đẩy lên cloud.",
            "err"
          );
          return;
        }
        GL.cloudPush({ force: true, silent: false }).then(function (r) {
          if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
          if (!r.ok) GL.toast(r.error || "Không đẩy được.", "err");
        });
      });
    }
    if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();

    // Banner + sidebar quick backup + chọn thư mục
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.id === "backupReminderExport" || t.id === "quickBackupBtn") {
        e.preventDefault();
        if (!GL.requireBanGL("Chỉ admin được sao lưu.")) return;
        Promise.resolve(GL.exportBackup());
        return;
      }
      if (t.id === "backupFolderPickBtn" || t.id === "backupFolderChangeBtn") {
        e.preventDefault();
        if (!GL.requireBanGL("Chỉ admin được gắn thư mục sao lưu.")) return;
        Promise.resolve(GL.pickBackupFolder()).then(function () {
          if (typeof GL.updateBackupFolderUI === "function") {
            GL.updateBackupFolderUI();
          }
        });
        return;
      }
      if (t.id === "backupFolderClearBtn") {
        e.preventDefault();
        if (!GL.requireBanGL()) return;
        Promise.resolve(GL.clearBackupDirHandle()).then(function () {
          GL.toast("Đã bỏ gắn thư mục. Sao lưu sẽ tải về Downloads.");
          if (typeof GL.updateBackupFolderUI === "function") {
            GL.updateBackupFolderUI();
          }
        });
        return;
      }
      if (t.id === "backupReminderLater") {
        e.preventDefault();
        var b = document.getElementById("backupReminderBanner");
        if (b) b.classList.add("hidden");
        try {
          localStorage.setItem(
            "giao-ly-backup-snooze",
            String(Date.now() + 24 * 3600 * 1000)
          );
        } catch (err) {
          /* ignore */
        }
        GL.toast("Sẽ nhắc lại sau 1 ngày. Nên backup sớm.", "warn");
      }
    });
    document.getElementById("backupImportBtn").addEventListener("click", function () {
      document.getElementById("backupImportFile").click();
    });
    document.getElementById("backupImportFile").addEventListener("change", function () {
      var f = this.files && this.files[0];
      this.value = "";
      if (!f) return;
      var mode = document.getElementById("backupRestoreMode").value;
      function doRestore() {
        GL.importBackupFile(f, mode)
          .then(function () {
            closeModal("backupModal");
            showAppIfLoggedIn();
          })
          .catch(function (err) {
            GL.toast(err.message || "Khôi phục thất bại.", "err");
          });
      }
      if (mode === "replace") {
        GL.confirm({
          title: "Khôi phục backup?",
          message:
            "Thay thế TOÀN BỘ dữ liệu hiện tại bằng file backup.\n\nNên xuất backup trước khi tiếp tục.",
          danger: true,
          okText: "Khôi phục",
          cancelText: "Hủy",
        }).then(function (ok) {
          if (ok) doRestore();
        });
        return;
      }
      doRestore();
    });

    document.getElementById("openReportsModal").addEventListener("click", function () {
      var rt = document.getElementById("reportTerm");
      if (rt) {
        rt.value =
          GL.activeTerm === "hk2" || GL.activeTerm === "year"
            ? GL.activeTerm
            : "hk1";
      }
      GL.showReportsModal();
    });

    // Thư mời họp PH (+ mẫu in nằm trong modal này)
    document.getElementById("openInviteModal").addEventListener("click", function () {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được soạn thư mời họp PH.")) return;
      // reset touched flags khi mở
      var subj = document.getElementById("inviteSubject");
      var reason = document.getElementById("inviteReason");
      if (subj) delete subj.dataset.touched;
      if (reason) delete reason.dataset.touched;
      GL.showInviteModal();
      fillPrintSettingsFields();
    });

    // Lịch sử sửa điểm
    document.getElementById("openHistoryModal").addEventListener("click", function () {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được xem lịch sử sửa điểm.")) return;
      GL.showHistoryModal();
    });
    ["historyModalClose", "historyModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("historyModal");
      });
    });
    document.getElementById("historyModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("historyModal");
    });
    document.getElementById("historyFilterClass").addEventListener("change", function () {
      GL.refreshHistoryModal();
    });
    document.getElementById("historyFilterQ").addEventListener("input", function () {
      GL.refreshHistoryModal();
    });
    document.getElementById("historyRefreshBtn").addEventListener("click", function () {
      GL.refreshHistoryModal();
    });
    document.getElementById("historyClearBtn").addEventListener("click", function () {
      if (!GL.requireBanGL()) return;
      GL.confirm({
        title: "Xóa lịch sử?",
        message: "Xóa toàn bộ lịch sử sửa điểm? Hành động này không hoàn tác được.",
        danger: true,
        okText: "Xóa lịch sử",
      }).then(function (ok) {
        if (!ok) return;
        GL.clearScoreHistory();
        GL.refreshHistoryModal();
        GL.toast("Đã xóa lịch sử.");
      });
    });
    ["inviteModalClose", "inviteModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("inviteModal");
      });
    });
    document.getElementById("inviteModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("inviteModal");
    });
    document.getElementById("inviteTypeList").addEventListener("change", function (e) {
      if (!e.target || e.target.name !== "inviteType") return;
      var subj = document.getElementById("inviteSubject");
      var reason = document.getElementById("inviteReason");
      if (subj) delete subj.dataset.touched;
      if (reason) delete reason.dataset.touched;
      var type = GL.getInviteType(e.target.value);
      if (subj) subj.value = type.defaultSubject;
      if (reason) reason.value = type.defaultReason;
      var cls = GL.activeClass();
      var termEl = document.getElementById("inviteTerm");
      if (cls) {
        GL.renderInviteStudentChecks(
          cls,
          e.target.value,
          termEl ? termEl.value : "hk1"
        );
      }
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteTerm").addEventListener("change", function () {
      var typeKey =
        (document.querySelector('input[name="inviteType"]:checked') || {})
          .value || "dauNam";
      var cls = GL.activeClass();
      if (cls) GL.renderInviteStudentChecks(cls, typeKey, this.value);
      GL.refreshInvitePreview();
    });
    ["inviteSubject", "inviteReason"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () {
        this.dataset.touched = "1";
        GL.refreshInvitePreview();
      });
    });
    [
      "invitePlace",
      "inviteDatetime",
      "inviteTimeText",
      "inviteExtra",
      "inviteShowTb",
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", function () {
        GL.refreshInvitePreview();
      });
      el.addEventListener("change", function () {
        GL.refreshInvitePreview();
      });
    });
    document.getElementById("inviteStudentList").addEventListener("change", function () {
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteSelectAll").addEventListener("click", function () {
      document.querySelectorAll(".invite-st-cb").forEach(function (cb) {
        cb.checked = true;
      });
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteSelectNone").addEventListener("click", function () {
      document.querySelectorAll(".invite-st-cb").forEach(function (cb) {
        cb.checked = false;
      });
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteSelectSuggest").addEventListener("click", function () {
      var typeKey =
        (document.querySelector('input[name="inviteType"]:checked') || {})
          .value || "dauNam";
      var cls = GL.activeClass();
      var termEl = document.getElementById("inviteTerm");
      if (cls) {
        GL.renderInviteStudentChecks(
          cls,
          typeKey,
          termEl ? termEl.value : "hk1"
        );
      }
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteRefreshPreview").addEventListener("click", function () {
      GL.refreshInvitePreview();
    });
    document.getElementById("invitePrintBtn").addEventListener("click", function () {
      GL.printInvites();
    });
    ["reportsModalClose", "reportsModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("reportsModal");
      });
    });
    document.getElementById("reportsModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("reportsModal");
    });
    document.getElementById("reportTerm").addEventListener("change", function () {
      GL.showReportsModal();
    });
    document.getElementById("reportRefreshBtn").addEventListener("click", function () {
      GL.showReportsModal();
    });
    document.getElementById("reportPrintBtn").addEventListener("click", function () {
      var body = document.getElementById("reportBody");
      if (!body) return;
      var reportCss =
        "body{font-family:Segoe UI,sans-serif;padding:8mm;color:#1a2332;box-sizing:border-box}" +
        "h3,h4{margin:0 0 8px}ol{padding-left:20px;line-height:1.6}" +
        ".hint{color:#64748b;font-size:12px}" +
        ".report-section{margin-bottom:16px;break-inside:avoid;page-break-inside:avoid}" +
        "@media print{body{padding:0}}";
      if (typeof GL.openPrintWindow === "function") {
        GL.openPrintWindow("Bao cao", body.innerHTML, reportCss);
      } else {
        var w = window.open("", "_blank");
        if (!w) {
          GL.toast("Trình duyệt chặn popup in.", "err");
          return;
        }
        w.document.write(
          "<html><head><title>Bao cao</title><style>" +
            (GL.A4_PAGE_CSS || "@page{size:A4 portrait;margin:12mm 10mm}") +
            reportCss +
            "</style></head><body>" +
            body.innerHTML +
            "</body></html>"
        );
        w.document.close();
        w.focus();
        w.print();
      }
    });

    function fillPrintSettingsFields() {
      var ps =
        typeof GL.getPrintSettings === "function"
          ? GL.getPrintSettings()
          : {};
      var map = {
        psGiaoHat: ps.giaoHat || "",
        psGiaoXu: ps.giaoXu || "",
        psTieuDe: ps.tieuDe || "",
        psNamHoc: ps.namHoc || "",
        psGlv: ps.glvName || "",
        psBanGL: ps.banGLName || "",
        psFooter: ps.footerNote || "",
      };
      Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = map[id];
      });
    }

    /** Mở / bung khối mẫu in (nằm trong Mời họp PH) */
    function openPrintSettingsModal() {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được chỉnh mẫu in.")) return;
      fillPrintSettingsFields();
      var invite = document.getElementById("inviteModal");
      if (invite && invite.classList.contains("hidden")) {
        var subj = document.getElementById("inviteSubject");
        var reason = document.getElementById("inviteReason");
        if (subj) delete subj.dataset.touched;
        if (reason) delete reason.dataset.touched;
        if (typeof GL.showInviteModal === "function") GL.showInviteModal();
      }
      var panel = document.getElementById("invitePrintSettingsPanel");
      if (panel) {
        panel.open = true;
        try {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (e) {
          /* ignore */
        }
      }
    }
    window.openPrintSettingsModal = openPrintSettingsModal;

    var printSaveBtn = document.getElementById("printSettingsSave");
    if (printSaveBtn) {
      printSaveBtn.addEventListener("click", function () {
        if (!GL.requireBanGL("Chỉ admin được lưu mẫu in.")) return;
        GL.savePrintSettings({
          giaoHat: document.getElementById("psGiaoHat").value.trim(),
          giaoXu: document.getElementById("psGiaoXu").value.trim(),
          tieuDe: document.getElementById("psTieuDe").value.trim(),
          namHoc: document.getElementById("psNamHoc").value.trim(),
          glvName: document.getElementById("psGlv").value.trim(),
          banGLName: document.getElementById("psBanGL").value.trim(),
          footerNote: document.getElementById("psFooter").value.trim(),
        });
        GL.toast("Đã lưu mẫu in.");
        if (typeof GL.refreshInvitePreview === "function") {
          GL.refreshInvitePreview();
        } else if (typeof GL.showInviteModal === "function") {
          // preview có thể tự cập nhật khi in
        }
        if (GL.viewMode === "print" || GL.activeTerm === "year") GL.render();
      });
    }

    // Users admin
    function renderUsersModal() {
      var list = document.getElementById("usersList");
      var checks = document.getElementById("newUserClasses");
      if (checks) {
        checks.innerHTML = (GL.state.classes || [])
          .map(function (c) {
            return (
              '<label class="check-all"><input type="checkbox" class="new-user-class" value="' +
              c.id +
              '" /> ' +
              GL.escapeHtml(c.name) +
              (c.year ? " (" + GL.escapeHtml(c.year) + ")" : "") +
              "</label>"
            );
          })
          .join("") || '<p class="hint">Chưa có lớp nào.</p>';
      }
      if (list) {
        var me = GL.currentUser && GL.currentUser();
        list.innerHTML = GL.authStore.users
          .map(function (u) {
            var classes = (u.classIds || [])
              .map(function (id) {
                var c = GL.state.classes.find(function (x) {
                  return x.id === id;
                });
                return c ? c.name : id;
              })
              .join(", ");
            var pinShow =
              u.pinPlain != null && String(u.pinPlain).length
                ? String(u.pinPlain)
                : null;
            return (
              '<div class="user-row">' +
              "<div><strong>" +
              GL.escapeHtml(u.displayName) +
              '</strong> <span class="hint">@' +
              GL.escapeHtml(u.username) +
              "</span><br><span class=\"hint\">" +
              (u.role === "ban_gl" ? "Ban GL" : "GLV") +
              (classes ? " · " + GL.escapeHtml(classes) : "") +
              (u.active === false ? " · <em>đã khóa</em>" : "") +
              (me && me.id === u.id ? " · <em>đang đăng nhập</em>" : "") +
              "</span>" +
              (pinShow
                ? '<div class="user-pin-badge" title="PIN (admin xem)">PIN: ' +
                  GL.escapeHtml(pinShow) +
                  "</div>"
                : '<div class="hint" style="margin-top:4px">PIN: <em>chưa lưu dạng xem — đặt lại PIN để hiện</em></div>') +
              "</div>" +
              '<div class="user-row-actions">' +
              '<button type="button" class="btn btn-ghost" data-toggle-user="' +
              u.id +
              '">' +
              (u.active === false ? "Mở khóa" : "Khóa") +
              "</button>" +
              '<button type="button" class="btn btn-ghost" data-edit-user="' +
              u.id +
              '">Sửa</button>' +
              (me && me.id === u.id
                ? ""
                : '<button type="button" class="btn btn-danger-soft" data-del-user="' +
                  u.id +
                  '">Xóa</button>') +
              "</div></div>"
            );
          })
          .join("");
      }
    }

    document.getElementById("openUsersModal").addEventListener("click", function () {
      if (!GL.canManageUsers()) {
        GL.toast("Chỉ Ban Giáo lý.", "err");
        return;
      }
      renderUsersModal();
      openModal("usersModal");
    });
    ["usersModalClose", "usersModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("usersModal");
      });
    });
    document.getElementById("usersModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("usersModal");
    });
    document.getElementById("createUserBtn").addEventListener("click", function () {
      var classIds = [];
      document.querySelectorAll(".new-user-class:checked").forEach(function (cb) {
        classIds.push(cb.value);
      });
      var res = GL.createUser({
        username: document.getElementById("newUserName").value,
        displayName: document.getElementById("newUserDisplay").value,
        pin: document.getElementById("newUserPin").value,
        role: document.getElementById("newUserRole").value,
        classIds: classIds,
      });
      if (!res.ok) {
        GL.toast(res.error, "err");
        return;
      }
      document.getElementById("newUserName").value = "";
      document.getElementById("newUserDisplay").value = "";
      document.getElementById("newUserPin").value = "";
      GL.toast("Đã tạo tài khoản " + res.user.username);
      renderUsersModal();
    });
    document.getElementById("usersList").addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      var tog = t.closest("[data-toggle-user]");
      if (tog) {
        var uid = tog.getAttribute("data-toggle-user");
        var user = GL.authStore.users.find(function (u) {
          return u.id === uid;
        });
        if (!user) return;
        var resT = GL.updateUser(uid, { active: user.active === false });
        if (!resT.ok) {
          GL.toast(resT.error || "Không cập nhật được.", "err");
          return;
        }
        renderUsersModal();
        GL.toast(
          user.active === false
            ? "Đã mở khóa tài khoản."
            : "Đã khóa tài khoản."
        );
        return;
      }
      var ed = t.closest("[data-edit-user]");
      if (ed) {
        openEditUserModal(ed.getAttribute("data-edit-user"));
        return;
      }
      var del = t.closest("[data-del-user]");
      if (del) {
        confirmDeleteUser(del.getAttribute("data-del-user"));
      }
    });

    function fillEditUserPinView(u) {
      var view = document.getElementById("editUserPinView");
      var hint = document.getElementById("editUserPinHint");
      if (!view) return;
      var plain =
        u.pinPlain != null && String(u.pinPlain).length
          ? String(u.pinPlain)
          : "";
      view.dataset.plain = plain;
      view.dataset.hidden = "1";
      if (plain) {
        view.value = "••••••••";
        if (hint) {
          hint.textContent =
            "Bấm 👁 để hiện PIN · 📋 để sao chép. Đặt PIN mới bên dưới nếu cần đổi.";
        }
      } else {
        view.value = "(chưa có — hãy đặt PIN mới bên dưới)";
        if (hint) {
          hint.textContent =
            "Tài khoản cũ chưa lưu PIN dạng xem được. Đặt PIN mới để admin xem được sau này.";
        }
      }
    }

    function openEditUserModal(userId) {
      if (!GL.canManageUsers()) {
        GL.toast("Chỉ Ban Giáo lý.", "err");
        return;
      }
      var u = GL.authStore.users.find(function (x) {
        return x.id === userId;
      });
      if (!u) return;
      document.getElementById("editUserId").value = u.id;
      document.getElementById("editUserUsername").value = u.username || "";
      document.getElementById("editUserDisplay").value = u.displayName || "";
      document.getElementById("editUserPin").value = "";
      document.getElementById("editUserPin2").value = "";
      fillEditUserPinView(u);
      var errEl = document.getElementById("editUserError");
      if (errEl) {
        errEl.classList.add("hidden");
        errEl.textContent = "";
      }
      document.getElementById("editUserSub").textContent =
        (u.role === "ban_gl" ? "Ban Giáo lý" : "Giáo lý viên") +
        " · sửa tên đăng nhập / PIN / lớp";
      var wrap = document.getElementById("editUserClassesWrap");
      var box = document.getElementById("editUserClasses");
      if (u.role === "glv") {
        if (wrap) wrap.classList.remove("hidden");
        if (box) {
          var assigned = u.classIds || [];
          box.innerHTML = (GL.state.classes || [])
            .map(function (c) {
              var on = assigned.indexOf(c.id) >= 0;
              return (
                '<label class="check-all"><input type="checkbox" class="edit-user-class" value="' +
                GL.escapeHtml(c.id) +
                '"' +
                (on ? " checked" : "") +
                " /> " +
                GL.escapeHtml(c.name) +
                (c.year ? " · " + GL.escapeHtml(c.year) : "") +
                "</label>"
              );
            })
            .join("") || '<p class="hint">Chưa có lớp nào.</p>';
        }
      } else {
        if (wrap) wrap.classList.add("hidden");
        if (box) box.innerHTML = "";
      }
      // Không cho xóa chính mình
      var delBtn = document.getElementById("editUserDelete");
      var me = GL.currentUser && GL.currentUser();
      if (delBtn) {
        delBtn.disabled = !!(me && me.id === u.id);
        delBtn.title =
          me && me.id === u.id
            ? "Không xóa tài khoản đang đăng nhập"
            : "Xóa tài khoản này";
      }
      openModal("editUserModal");
      setTimeout(function () {
        var el = document.getElementById("editUserUsername");
        if (el) el.focus();
      }, 40);
    }

    function closeEditUserModal() {
      closeModal("editUserModal");
    }

    function confirmDeleteUser(userId) {
      if (!GL.canManageUsers()) return;
      var u = GL.authStore.users.find(function (x) {
        return x.id === userId;
      });
      if (!u) return;
      GL.confirm({
        title: "Xóa tài khoản?",
        message:
          'Xóa vĩnh viễn tài khoản "' +
          (u.displayName || u.username) +
          '" (@' +
          u.username +
          ")?\n\nKhông thể hoàn tác.",
        danger: true,
        okText: "Xóa tài khoản",
        cancelText: "Hủy",
      }).then(function (ok) {
        if (!ok) return;
        var res = GL.deleteUser(userId);
        if (!res.ok) {
          GL.toast(res.error || "Không xóa được.", "err");
          return;
        }
        closeEditUserModal();
        GL.toast("Đã xóa @" + u.username);
        renderUsersModal();
      });
    }

    ["editUserClose", "editUserCancel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeEditUserModal);
    });
    var editUserModal = document.getElementById("editUserModal");
    if (editUserModal) {
      editUserModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeEditUserModal();
      });
    }

    var pinToggle = document.getElementById("editUserPinToggle");
    if (pinToggle) {
      pinToggle.addEventListener("click", function () {
        var view = document.getElementById("editUserPinView");
        if (!view) return;
        var plain = view.dataset.plain || "";
        if (!plain) {
          GL.toast("Chưa có PIN dạng xem được. Hãy đặt PIN mới.", "warn");
          return;
        }
        if (view.dataset.hidden === "1") {
          view.value = plain;
          view.dataset.hidden = "0";
          pinToggle.textContent = "🙈";
        } else {
          view.value = "••••••••";
          view.dataset.hidden = "1";
          pinToggle.textContent = "👁";
        }
      });
    }
    var pinCopy = document.getElementById("editUserPinCopy");
    if (pinCopy) {
      pinCopy.addEventListener("click", function () {
        var view = document.getElementById("editUserPinView");
        var plain = view && view.dataset.plain;
        if (!plain) {
          GL.toast("Chưa có PIN để sao chép.", "err");
          return;
        }
        function ok() {
          GL.toast("Đã sao chép PIN.");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(plain).then(ok).catch(function () {
            window.prompt("Sao chép PIN:", plain);
          });
        } else {
          window.prompt("Sao chép PIN:", plain);
        }
      });
    }

    var editUserDelete = document.getElementById("editUserDelete");
    if (editUserDelete) {
      editUserDelete.addEventListener("click", function () {
        var id = document.getElementById("editUserId").value;
        confirmDeleteUser(id);
      });
    }

    var editUserSave = document.getElementById("editUserSave");
    if (editUserSave) {
      editUserSave.addEventListener("click", function () {
        var id = document.getElementById("editUserId").value;
        var u = GL.authStore.users.find(function (x) {
          return x.id === id;
        });
        if (!u) return;
        var pin = document.getElementById("editUserPin").value;
        var pin2 = document.getElementById("editUserPin2").value;
        var errEl = document.getElementById("editUserError");
        function showErr(msg) {
          if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
          }
          GL.toast(msg, "err");
        }
        if (pin || pin2) {
          if (pin.length < 4) {
            showErr("PIN mới tối thiểu 4 ký tự.");
            return;
          }
          if (pin !== pin2) {
            showErr("Hai lần nhập PIN mới không khớp.");
            return;
          }
        }
        var patch = {
          username: document.getElementById("editUserUsername").value.trim(),
          displayName: document.getElementById("editUserDisplay").value.trim(),
        };
        if (pin) patch.pin = pin;
        if (u.role === "glv") {
          var classIds = [];
          document
            .querySelectorAll(".edit-user-class:checked")
            .forEach(function (cb) {
              classIds.push(cb.value);
            });
          patch.classIds = classIds;
        }
        var res = GL.updateUser(id, patch);
        if (!res.ok) {
          showErr(res.error || "Không lưu được.");
          return;
        }
        closeEditUserModal();
        GL.toast("Đã cập nhật @" + res.user.username);
        renderUsersModal();
      });
    }

    // Đổi PIN tài khoản đang đăng nhập
    function openChangePinModal() {
      var u = GL.currentUser && GL.currentUser();
      if (!u) {
        GL.toast("Chưa đăng nhập.", "err");
        return;
      }
      var info = document.getElementById("changePinUser");
      if (info) {
        info.innerHTML =
          "Tài khoản: <strong>" +
          GL.escapeHtml(u.displayName || u.username) +
          "</strong> (@" +
          GL.escapeHtml(u.username) +
          ")";
      }
      ["pinOld", "pinNew", "pinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = "";
      });
      var err = document.getElementById("changePinError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      openModal("changePinModal");
      setTimeout(function () {
        var el = document.getElementById("pinOld");
        if (el) el.focus();
      }, 40);
    }
    function closeChangePinModal() {
      closeModal("changePinModal");
    }
    ["changePinClose", "changePinCancel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeChangePinModal);
    });
    var changePinModal = document.getElementById("changePinModal");
    if (changePinModal) {
      changePinModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeChangePinModal();
      });
    }
    var changePinSave = document.getElementById("changePinSave");
    if (changePinSave) {
      changePinSave.addEventListener("click", function () {
        var oldP = document.getElementById("pinOld").value;
        var newP = document.getElementById("pinNew").value;
        var newP2 = document.getElementById("pinNew2").value;
        var res = GL.changeOwnPin(oldP, newP, newP2);
        var err = document.getElementById("changePinError");
        if (!res.ok) {
          if (err) {
            err.textContent = res.error || "Không đổi được PIN.";
            err.classList.remove("hidden");
          }
          GL.toast(res.error || "Không đổi được PIN.", "err");
          return;
        }
        closeChangePinModal();
        GL.toast("Đã đổi PIN thành công. Lần sau đăng nhập bằng PIN mới.");
        // Đẩy cloud ngay để máy khác / điện thoại không còn PIN cũ
        if (typeof GL.cloudPush === "function" && GL.isSupabaseConfigured()) {
          GL.cloudPush({ force: true, silent: true }).then(function (r) {
            if (r && r.ok) {
              /* ok */
            } else if (r && r.error) {
              GL.toast(
                "PIN đã đổi trên máy này; chưa đẩy cloud: " + r.error,
                "warn"
              );
            }
          });
        }
      });
      // Enter trong ô PIN
      ["pinOld", "pinNew", "pinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") {
            ev.preventDefault();
            changePinSave.click();
          }
        });
      });
    }

    // Bắt buộc đổi PIN yếu
    function openForcePinModal() {
      var u = GL.currentUser && GL.currentUser();
      if (!u) return;
      var info = document.getElementById("forcePinUser");
      if (info) {
        info.innerHTML =
          "Tài khoản <strong>" +
          GL.escapeHtml(u.displayName || u.username) +
          "</strong> (@" +
          GL.escapeHtml(u.username) +
          ") đang dùng PIN dễ đoán. Hãy đổi ngay để bảo vệ sổ điểm.";
      }
      ["forcePinOld", "forcePinNew", "forcePinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = "";
      });
      var err = document.getElementById("forcePinError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      var modal = document.getElementById("forcePinModal");
      if (modal) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      }
      setTimeout(function () {
        var el = document.getElementById("forcePinOld");
        if (el) el.focus();
      }, 50);
    }
    function closeForcePinModal() {
      var modal = document.getElementById("forcePinModal");
      if (modal) modal.classList.add("hidden");
      var any = document.querySelector(".modal-overlay:not(.hidden)");
      if (!any) document.body.style.overflow = "";
    }
    var forcePinSave = document.getElementById("forcePinSave");
    if (forcePinSave) {
      forcePinSave.addEventListener("click", function () {
        var res = GL.changeOwnPin(
          document.getElementById("forcePinOld").value,
          document.getElementById("forcePinNew").value,
          document.getElementById("forcePinNew2").value
        );
        var err = document.getElementById("forcePinError");
        if (!res.ok) {
          if (err) {
            err.textContent = res.error || "Không đổi được PIN.";
            err.classList.remove("hidden");
          }
          GL.toast(res.error || "Không đổi được PIN.", "err");
          return;
        }
        closeForcePinModal();
        GL.toast("Đã đổi PIN. Hãy ghi nhớ PIN mới.");
        if (typeof GL.cloudPush === "function" && GL.isSupabaseConfigured()) {
          GL.cloudPush({ force: true, silent: true });
        }
        if (typeof GL.updateBackupReminderUI === "function") {
          GL.updateBackupReminderUI();
        }
      });
      ["forcePinOld", "forcePinNew", "forcePinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") {
            ev.preventDefault();
            forcePinSave.click();
          }
        });
      });
    }

    GL.checkSecurityGates = function checkSecurityGates() {
      // 1) PIN yếu → chặn dùng app
      if (typeof GL.mustChangePin === "function" && GL.mustChangePin()) {
        openForcePinModal();
        return;
      }
      // 2) Nhắc backup (admin) — tôn trọng snooze
      if (typeof GL.isBanGL === "function" && GL.isBanGL()) {
        var snooze = 0;
        try {
          snooze = Number(localStorage.getItem("giao-ly-backup-snooze") || 0);
        } catch (e) {
          /* ignore */
        }
        if (Date.now() < snooze) {
          var ban = document.getElementById("backupReminderBanner");
          if (ban) ban.classList.add("hidden");
        } else if (typeof GL.updateBackupReminderUI === "function") {
          GL.updateBackupReminderUI();
        }
      }
    };

    // ─── Chuyển HV sang lớp khác ───
    function openTransferModal(studentId) {
      var cls = GL.activeClass();
      if (!cls) {
        GL.toast("Chọn lớp trước.", "err");
        return;
      }
      var st = cls.students.find(function (s) {
        return s.id === studentId;
      });
      if (!st) {
        GL.toast("Không tìm thấy học viên.", "err");
        return;
      }
      document.getElementById("transferStudentId").value = st.id;
      document.getElementById("transferFromClassId").value = cls.id;
      document.getElementById("transferStudentName").textContent =
        GL.displayName(st);
      document.getElementById("transferFromName").textContent = cls.name;
      var err = document.getElementById("transferError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      var sel = document.getElementById("transferToClass");
      var targets =
        typeof GL.classesInScope === "function"
          ? GL.classesInScope()
          : typeof GL.visibleClasses === "function"
            ? GL.visibleClasses()
            : GL.state.classes || [];
      targets = targets.filter(function (c) {
        return c.id !== cls.id;
      });
      if (!targets.length) {
        GL.toast("Không có lớp đích nào bạn được xem.", "err");
        return;
      }
      sel.innerHTML = targets
        .map(function (c) {
          return (
            '<option value="' +
            GL.escapeHtml(c.id) +
            '">' +
            GL.escapeHtml(c.name) +
            (c.year ? " · " + GL.escapeHtml(c.year) : "") +
            " (" +
            ((c.students && c.students.length) || 0) +
            " HV)</option>"
          );
        })
        .join("");
      openModal("transferModal");
    }
    function closeTransferModal() {
      closeModal("transferModal");
    }
    ["transferClose", "transferCancel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeTransferModal);
    });
    var transferModal = document.getElementById("transferModal");
    if (transferModal) {
      transferModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeTransferModal();
      });
    }
    var transferConfirm = document.getElementById("transferConfirm");
    if (transferConfirm) {
      transferConfirm.addEventListener("click", function () {
        var sid = document.getElementById("transferStudentId").value;
        var fromId = document.getElementById("transferFromClassId").value;
        var toId = document.getElementById("transferToClass").value;
        var err = document.getElementById("transferError");
        var res = GL.transferStudent(sid, fromId, toId);
        if (!res.ok) {
          if (err) {
            err.textContent = res.error || "Không chuyển được.";
            err.classList.remove("hidden");
          }
          GL.toast(res.error || "Không chuyển được.", "err");
          return;
        }
        if (typeof GL.setUndoLabel === "function") {
          GL.setUndoLabel(
            "Chuyển HV → " + (res.to && res.to.name ? res.to.name : "")
          );
        }
        GL.saveState();
        closeTransferModal();
        GL.toast(
          "Đã chuyển " +
            GL.displayName(res.student) +
            ' → lớp "' +
            res.to.name +
            '"'
        );
        GL.render();
      });
    }

    // ─── Hướng dẫn ───
    function openHelpModal() {
      openModal("helpModal");
    }
    function closeHelpModal() {
      closeModal("helpModal");
    }
    var openHelpBtn = document.getElementById("openHelpModal");
    if (openHelpBtn) openHelpBtn.addEventListener("click", openHelpModal);
    ["helpClose", "helpDone"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeHelpModal);
    });
    var helpModal = document.getElementById("helpModal");
    if (helpModal) {
      helpModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeHelpModal();
      });
    }

    // Logout + Đổi PIN + Face ID (nút render động trong sidebar)
    document.getElementById("sidebar").addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.id === "logoutBtn") {
        GL.logout();
        showLogin();
        if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
        GL.toast("Đã đăng xuất.");
        return;
      }
      if (t.id === "openChangePinBtn") {
        openChangePinModal();
        return;
      }
      if (t.id === "bioToggleBtn") {
        var u = GL.currentUser && GL.currentUser();
        if (!u) return;
        var enabled =
          typeof GL.bioIsEnabledForUser === "function" &&
          GL.bioIsEnabledForUser(u.id);
        if (enabled) {
          GL.confirm({
            title: "Tắt " + (GL.bioLabel ? GL.bioLabel() : "sinh trắc") + "?",
            message: "Lần sau sẽ chỉ đăng nhập bằng PIN trên máy này.",
            danger: true,
            okText: "Tắt",
          }).then(function (ok) {
            if (!ok) return;
            GL.bioRevoke(u.id);
            if (typeof GL.updateBioToggleUI === "function") GL.updateBioToggleUI();
            if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
            GL.toast("Đã tắt sinh trắc trên máy này.");
          });
        } else {
          GL.bioRegister().then(function (r) {
            if (r.ok) {
              GL.toast(
                "Đã bật " + (GL.bioLabel ? GL.bioLabel() : "Face ID / vân tay") + "."
              );
            } else {
              GL.toast(r.error || "Không bật được.", "err");
            }
            if (typeof GL.updateBioToggleUI === "function") GL.updateBioToggleUI();
            if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
          });
        }
      }
    });

    // ─── Nhật ký: đổi loại → cập nhật mức độ ───
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLSelectElement)) return;
      var jType = t.closest(".journal-type");
      if (!jType) return;
      var jSection = jType.closest(".journal-section");
      if (!jSection) return;
      var jLevel = jSection.querySelector(".journal-level");
      if (!jLevel) return;
      var typeKey = jType.value;
      var typeObj = null;
      if (typeof GL.JOURNAL_TYPES !== "undefined") {
        for (var i = 0; i < GL.JOURNAL_TYPES.length; i++) {
          if (GL.JOURNAL_TYPES[i].key === typeKey) {
            typeObj = GL.JOURNAL_TYPES[i];
            break;
          }
        }
      }
      if (typeObj && typeObj.levels && typeObj.levels.length) {
        jLevel.innerHTML = '<option value="">—</option>' +
          typeObj.levels.map(function (l) {
            return '<option value="' + l + '">' + l + "</option>";
          }).join("");
      } else {
        jLevel.innerHTML = '<option value="">—</option>';
      }
    });

    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var res = GL.login(
        document.getElementById("loginUser").value,
        document.getElementById("loginPin").value,
        document.getElementById("loginRemember").checked
      );
      var err = document.getElementById("loginError");
      if (!res.ok) {
        err.textContent = res.error;
        err.classList.remove("hidden");
        return;
      }
      err.classList.add("hidden");
      showAppIfLoggedIn();
      GL.toast("Xin chào " + (res.user.displayName || res.user.username));
      // Gợi ý bật Face ID / vân tay sau lần đăng nhập PIN
      if (
        typeof GL.bioIsSupported === "function" &&
        GL.bioIsSupported() &&
        typeof GL.bioIsEnabledForUser === "function" &&
        !GL.bioIsEnabledForUser(res.user.id)
      ) {
        setTimeout(function () {
          if (typeof GL.confirm === "function") {
            GL.confirm({
              title: "Bật " + (GL.bioLabel ? GL.bioLabel() : "Face ID / vân tay") + "?",
              message:
                "Lần sau mở app nhanh hơn bằng Face ID / vân tay trên máy này. Vẫn dùng PIN khi cần.",
              okText: "Bật ngay",
              cancelText: "Để sau",
            }).then(function (ok) {
              if (!ok) return;
              GL.bioRegister().then(function (r) {
                if (r.ok) {
                  GL.toast("Đã bật " + (GL.bioLabel ? GL.bioLabel() : "sinh trắc") + ".");
                  if (typeof GL.updateBioToggleUI === "function") GL.updateBioToggleUI();
                  if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
                } else GL.toast(r.error || "Không bật được.", "err");
              });
            });
          }
        }, 500);
      }
    });

    // ─── Face ID / vân tay ───
    GL.updateLoginBioUI = function updateLoginBioUI() {
      var wrap = document.getElementById("loginBioWrap");
      var btn = document.getElementById("loginBioBtn");
      var lab = document.getElementById("loginBioLabel");
      var hint = document.getElementById("loginBioHint");
      if (!wrap || !btn) return;
      var label = typeof GL.bioLabel === "function" ? GL.bioLabel() : "Face ID / vân tay";
      if (lab) lab.textContent = "Mở bằng " + label;
      var supported =
        typeof GL.bioIsSupported === "function" && GL.bioIsSupported();
      wrap.classList.toggle("is-unsupported", !supported);
      if (!supported) {
        if (hint) {
          hint.textContent =
            "Sinh trắc cần HTTPS (GitHub Pages) hoặc localhost — không dùng file://";
        }
        btn.disabled = true;
        return;
      }
      var has =
        typeof GL.bioHasAny === "function" ? GL.bioHasAny() : false;
      wrap.classList.toggle("is-ready", has);
      btn.disabled = !has;
      if (hint) {
        hint.textContent = has
          ? "Chạm để mở bằng " + label + " trên máy này."
          : "Lần đầu: đăng nhập PIN → sidebar → bật " + label + ".";
      }
    };

    GL.updateBioToggleUI = function updateBioToggleUI() {
      var btn = document.getElementById("bioToggleBtn");
      if (!btn) return;
      var label = typeof GL.bioLabel === "function" ? GL.bioLabel() : "Face ID / vân tay";
      var u = typeof GL.currentUser === "function" ? GL.currentUser() : null;
      var on =
        u &&
        typeof GL.bioIsEnabledForUser === "function" &&
        GL.bioIsEnabledForUser(u.id);
      var supported =
        typeof GL.bioIsSupported === "function" && GL.bioIsSupported();
      if (!supported) {
        btn.textContent = "🔐 " + label + " (cần HTTPS)";
        btn.disabled = true;
        return;
      }
      btn.disabled = false;
      btn.textContent = on
        ? "🔐 Tắt " + label
        : "🔐 Bật " + label;
    };

    var loginBioBtn = document.getElementById("loginBioBtn");
    if (loginBioBtn) {
      loginBioBtn.addEventListener("click", function () {
        var err = document.getElementById("loginError");
        if (err) {
          err.classList.add("hidden");
          err.textContent = "";
        }
        loginBioBtn.disabled = true;
        var remember = document.getElementById("loginRemember");
        GL.bioLogin(remember ? remember.checked : true).then(function (res) {
          loginBioBtn.disabled = false;
          if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
          if (!res.ok) {
            if (err) {
              err.textContent = res.error || "Không mở khóa được.";
              err.classList.remove("hidden");
            }
            GL.toast(res.error || "Không mở khóa được.", "err");
            return;
          }
          showAppIfLoggedIn();
          GL.toast(
            "Xin chào " + (res.user.displayName || res.user.username) + " 🔐"
          );
        });
      });
    }

    if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
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
      });
    }
    return true;
  }

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
  bindEvents();
  if (typeof GL.updateUndoRedoUI === "function") GL.updateUndoRedoUI();
  if (GL.isLoggedIn()) {
    showAppIfLoggedIn();
  } else {
    showLogin();
  }
})(window.GL = window.GL || {});
