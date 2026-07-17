/**
 * Student score-entry, profile, search and follow-up event bindings.
 */
(function (GL) {
  "use strict";

  GL.bindStudentEvents = function bindStudentEvents() {
    var openModal = GL.openModal;
    var closeModal = GL.closeModal;
    var commitTableScore = GL.commitTableScore;
    var addScore = GL.addScore;
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
        GL.prompt({
          title: "Đổi tên lớp",
          message: "Nhập tên mới cho lớp \"" + rcls.name + "\":",
          defaultValue: rcls.name,
          okText: "Tiếp theo",
        }).then(function (newName) {
          if (!newName) return;
          GL.prompt({
            title: "Năm học",
            message: "Năm học (để trống nếu giữ nguyên):",
            defaultValue: rcls.year || "",
            okText: "Xong",
            cancelText: "Bỏ qua",
          }).then(function (year) {
            if (year) rcls.year = year;
            rcls.name = newName;
            GL.touchClass(rcls);
            if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Đổi tên lớp");
            GL.saveState();
            GL.render();
            GL.toast("Đã đổi tên lớp.");
          });
        });
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
        if (typeof window.openPrintSettingsModal === "function") {
          window.openPrintSettingsModal();
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
        if (typeof GL.openTransferModal === "function") {
          GL.openTransferModal(moveSt.getAttribute("data-move-student"));
        }
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

    var searchTimeout;
    document.getElementById("searchInput").addEventListener("input", function (e) {
      GL.searchQuery = e.target.value;
      var cls = GL.activeClass();
      if (cls) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          GL.renderStudents(cls);
        }, 150);
      }
    });

    document.getElementById("viewSwitcher").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-view], [data-view-more]");
      if (!btn) return;
      if (btn.getAttribute("data-view-more") === "1" || btn.id === "viewMoreBtn") {
        if (typeof GL.openViewMoreSheet === "function") GL.openViewMoreSheet();
        return;
      }
      var mode = btn.getAttribute("data-view");
      if (!mode) return;
      GL.setViewMode(mode);
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
  };
})(window.GL = window.GL || {});
