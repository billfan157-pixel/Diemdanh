/**
 * Import and export modal event bindings.
 */
(function (GL) {
  "use strict";

GL.bindImportExportEvents = function bindImportExportEvents() {
    var openModal = GL.openModal;
    var closeModal = GL.closeModal;
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
  };
})(window.GL = window.GL || {});
