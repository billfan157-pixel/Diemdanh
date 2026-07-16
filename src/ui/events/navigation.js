/**
 * Navigation, class selection, dashboard and mobile-shell event bindings.
 */
(function (GL) {
  "use strict";

  GL.bindNavigationEvents = function bindNavigationEvents() {
    var openModal = GL.openModal;
    var closeModal = GL.closeModal;
    var commitTableScore = GL.commitTableScore;
    var addScore = GL.addScore;
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

      function toggleBodyScrollLock(lock) {
        if (lock) {
          if (!document.body.classList.contains("m-drawer-open")) {
            GL.scrollYBeforeDrawer = window.scrollY || document.documentElement.scrollTop;
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
            document.body.style.top = -GL.scrollYBeforeDrawer + "px";
            document.body.classList.add("m-drawer-open");
          }
        } else {
          if (document.body.classList.contains("m-drawer-open")) {
            document.body.classList.remove("m-drawer-open");
            document.body.style.position = "";
            document.body.style.width = "";
            document.body.style.top = "";
            window.scrollTo(0, GL.scrollYBeforeDrawer || 0);
          }
        }
      }

      function setDrawerOpen(open) {
        if (!sidebar) return;
        sidebar.classList.toggle("open", !!open);
        if (scrim) {
          scrim.classList.toggle("is-open", !!open);
          scrim.classList.toggle("hidden", !open);
        }
        toggleBodyScrollLock(!!open);
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
          toggleBodyScrollLock(open);
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
          closeDrawer();
          closeMoreSheet();
          closeViewMoreSheet();
          if (key === "home") {
            if (typeof GL.setHomeView === "function") GL.setHomeView("dashboard");
            GL.render();
          } else if (key === "classes") {
            if (typeof GL.setHomeView === "function") GL.setHomeView("classes");
            GL.render();
          } else if (key === "scores") {
            var cls =
              typeof GL.activeClass === "function" ? GL.activeClass() : null;
            if (!cls) {
              if (typeof GL.setHomeView === "function") GL.setHomeView("classes");
              GL.render();
              GL.toast("Chọn lớp để nhập điểm.", "info");
              return;
            }
            if (typeof GL.setHomeView === "function") GL.setHomeView("class");
            if (typeof GL.setViewMode === "function") GL.setViewMode("cards");
            GL.render();
          } else if (key === "me") {
            if (typeof GL.setHomeView === "function") GL.setHomeView("me");
            GL.render();
          }
        });
      }

      function openViewMoreSheet() {
        var sheet = document.getElementById("mViewMoreSheet");
        if (sheet) sheet.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      }
      function closeViewMoreSheet() {
        var sheet = document.getElementById("mViewMoreSheet");
        if (sheet) sheet.classList.add("hidden");
        if (!document.querySelector(".modal-overlay:not(.hidden)")) {
          document.body.style.overflow = "";
        }
      }
      GL.openViewMoreSheet = openViewMoreSheet;
      GL.closeViewMoreSheet = closeViewMoreSheet;

      var viewMoreBtn = document.getElementById("viewMoreBtn");
      if (viewMoreBtn) {
        viewMoreBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          openViewMoreSheet();
        });
      }
      var viewMoreClose = document.getElementById("mViewMoreClose");
      if (viewMoreClose) {
        viewMoreClose.addEventListener("click", closeViewMoreSheet);
      }
      var viewMoreSheet = document.getElementById("mViewMoreSheet");
      if (viewMoreSheet) {
        viewMoreSheet.addEventListener("click", function (e) {
          if (e.target === viewMoreSheet) closeViewMoreSheet();
          var b = e.target.closest("[data-view], [data-m-action]");
          if (!b || !viewMoreSheet.contains(b)) return;
          closeViewMoreSheet();
          var v = b.getAttribute("data-view");
          if (v && typeof GL.setViewMode === "function") {
            GL.setViewMode(v);
            return;
          }
          var act = b.getAttribute("data-m-action");
          if (act === "reports") {
            var r = document.getElementById("openReportsModal");
            if (r) r.click();
          } else if (act === "weights") {
            var w = document.getElementById("openWeightsModal");
            if (w) w.click();
          }
        });
      }
    })();

    // Màn Lớp + Cá nhân (bind open-class sau khi bindDashOpenClass định nghĩa — gọi lại ở dưới)

    function createClassFromFields(nameEl, yearEl) {
      if (!nameEl) return;
      var name = nameEl.value.trim();
      if (!name) {
        GL.toast("Nhập tên lớp.", "err");
        return;
      }
      var year = yearEl ? yearEl.value.trim() : "";
      // reuse add class button logic if possible
      var sidebarName = document.getElementById("newClassName");
      var sidebarYear = document.getElementById("newClassYear");
      if (sidebarName) sidebarName.value = name;
      if (sidebarYear) sidebarYear.value = year || GL.activeYearFilter || "";
      var addBtn = document.getElementById("addClassBtn");
      if (addBtn) addBtn.click();
      nameEl.value = "";
    }
    var classesAddBtn = document.getElementById("classesAddBtn");
    if (classesAddBtn) {
      classesAddBtn.addEventListener("click", function () {
        createClassFromFields(
          document.getElementById("classesNewName"),
          document.getElementById("classesNewYear")
        );
      });
    }

    function meClickAction(act) {
      var map = {
        users: "openUsersModal",
        backup: "openBackupModal",
        invite: "openInviteModal",
        parish: "openParishModal",
        history: "openHistoryModal",
        weights: "openWeightsModal",
      };
      var id = map[act];
      if (id) {
        var el = document.getElementById(id);
        if (el) el.click();
      }
    }
    var meView = document.getElementById("meView");
    if (meView) {
      meView.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.id === "meChangePin" || t.closest("#meChangePin")) {
          var pinBtn = document.getElementById("openChangePinBtn");
          if (pinBtn) pinBtn.click();
          else if (typeof GL.openChangePinModal === "function") GL.openChangePinModal();
          return;
        }
        if (t.id === "meBioToggle" || t.closest("#meBioToggle")) {
          var bioBtn = document.getElementById("bioToggleBtn");
          if (bioBtn) bioBtn.click();
          else GL.toast("Bật/tắt sinh trắc từ sidebar.", "info");
          setTimeout(function () {
            if (typeof GL.renderMeView === "function") GL.renderMeView();
          }, 400);
          return;
        }
        if (t.id === "meSync" || t.closest("#meSync")) {
          var syncOpen = document.getElementById("openSyncModal");
          if (syncOpen) syncOpen.click();
          return;
        }
        if (t.id === "meIo" || t.closest("#meIo")) {
          var io = document.getElementById("openIoModal");
          if (io) io.click();
          return;
        }
        if (t.id === "meHelp" || t.closest("#meHelp")) {
          var h = document.getElementById("openHelpModal");
          if (h) h.click();
          return;
        }
        if (t.id === "meLogout" || t.closest("#meLogout")) {
          GL.logout();
          if (typeof GL.showLogin === "function") GL.showLogin();
          else {
            document.getElementById("loginScreen").classList.remove("hidden");
            document.getElementById("appRoot").classList.add("hidden");
          }
          GL.toast("Đã đăng xuất.");
          return;
        }
        var adminRow = t.closest("[data-me-action]");
        if (adminRow) {
          meClickAction(adminRow.getAttribute("data-me-action"));
        }
      });
    }

    // Năm học filter
    function onYearFilterChange(val) {
      if (typeof GL.setYearFilter === "function") GL.setYearFilter(val);
      GL.render();
      if (
        GL.homeView === "dashboard" &&
        typeof GL.renderDashboard === "function"
      ) {
        GL.renderDashboard();
      }
      if (
        GL.homeView === "classes" &&
        typeof GL.renderClassesView === "function"
      ) {
        GL.renderClassesView();
      }
    }
    ["yearFilterSelect", "dashYearFilter", "classesYearFilter"].forEach(
      function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", function () {
          onYearFilterChange(el.value);
          document
            .querySelectorAll(
              "#yearFilterSelect, #dashYearFilter, #classesYearFilter"
            )
            .forEach(function (s) {
              if (s !== el) s.value = el.value;
            });
        });
      }
    );

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
    bindDashOpenClass(document.getElementById("classesView"));
    bindDashOpenClass(document.getElementById("classesViewList"));

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
  };
})(window.GL = window.GL || {});
