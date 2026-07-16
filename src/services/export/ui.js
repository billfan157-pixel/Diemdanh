/**
 * Export modal state and preview UI.
 */
(function (GL) {
  "use strict";

/** Lớp đang chọn trong modal Xuất/Nhập (dropdown xuất) */
  GL.getIoExportClass = function getIoExportClass() {
    var sel = document.getElementById("ioExportClass");
    if (sel && sel.value) {
      var c = GL.getClassById(sel.value);
      if (c) return c;
    }
    return GL.activeClass();
  };

  /** Đổ danh sách lớp vào select xuất (lớp trong năm học đang lọc) */
  GL.fillIoExportClassSelect = function fillIoExportClassSelect() {
    var sel = document.getElementById("ioExportClass");
    if (!sel) return;
    var list =
      typeof GL.classesInScope === "function"
        ? GL.classesInScope()
        : typeof GL.visibleClasses === "function"
          ? GL.visibleClasses()
          : (GL.state && GL.state.classes) || [];
    var prev = sel.value;
    var activeId = GL.state && GL.state.activeClassId;
    sel.innerHTML =
      '<option value="">— Chọn lớp —</option>' +
      list
        .map(function (c) {
          var n = (c.students && c.students.length) || 0;
          return (
            '<option value="' +
            GL.escapeHtml(c.id) +
            '">' +
            GL.escapeHtml(c.name) +
            (c.year ? " · " + GL.escapeHtml(c.year) : "") +
            " (" +
            n +
            " HV)</option>"
          );
        })
        .join("");
    // Ưu tiên: giữ lựa chọn cũ → lớp đang active → lớp đầu
    if (prev && list.some(function (c) { return c.id === prev; })) {
      sel.value = prev;
    } else if (activeId && list.some(function (c) { return c.id === activeId; })) {
      sel.value = activeId;
    } else if (list.length === 1) {
      sel.value = list[0].id;
    }
  };

  /**
   * UI Xuất/Nhập theo quyền:
   * - GLV: chỉ xuất 1 lớp (lớp được gán)
   * - Admin: nhập + xuất 1 lớp + xuất nhiều lớp
   */
  GL.applyIoRoleUI = function applyIoRoleUI() {
    var canImp =
      typeof GL.canImport === "function" ? GL.canImport() : GL.isBanGL();
    var canMulti =
      typeof GL.canExportMultiClass === "function"
        ? GL.canExportMultiClass()
        : GL.isBanGL();

    var importBox = document.getElementById("ioImportBox");
    var multiBox = document.getElementById("ioMultiExportBox");
    var exportBox = document.getElementById("ioExportBox");
    var title = document.getElementById("ioModalTitle");
    var sub = document.querySelector("#ioModal .modal-sub");
    var hint = document.getElementById("ioRoleHint");
    var openBtn = document.getElementById("openIoModal");

    if (importBox) {
      importBox.classList.toggle("hidden", !canImp);
      importBox.style.display = canImp ? "" : "none";
    }
    if (multiBox) {
      multiBox.classList.toggle("hidden", !canMulti);
      multiBox.style.display = canMulti ? "" : "none";
    }
    if (exportBox) {
      exportBox.classList.remove("hidden");
      exportBox.style.display = "";
    }

    // Grid 1 cột khi chỉ còn xuất
    var grid = document.querySelector("#ioModal .io-grid");
    if (grid) {
      grid.classList.toggle("io-grid-export-only", !canImp);
    }

    if (title) {
      title.textContent = canImp ? "Xuất / Nhập dữ liệu" : "Xuất điểm";
    }
    if (sub) {
      sub.textContent = canImp
        ? "Admin: nhập file · xuất 1 lớp / nhiều lớp · Excel CSV Word"
        : "Giáo lý viên: xuất điểm lớp được gán (không nhập file)";
    }
    if (hint) {
      if (canImp) {
        hint.innerHTML =
          "🔑 Quyền <strong>Ban Giáo lý</strong>: nhập file + xuất 1 lớp + xuất nhiều lớp (theo năm học).";
        hint.className = "hint io-role-hint app-notice-info";
      } else {
        hint.innerHTML =
          "🔑 Quyền <strong>Giáo lý viên</strong>: chỉ <strong>xuất</strong> điểm lớp được gán. Nhập file và xuất nhiều lớp dành cho admin.";
        hint.className = "hint io-role-hint app-notice-warn";
      }
    }
    if (openBtn) {
      var label = openBtn.querySelector(".chip-text") || openBtn;
      // button is plain text
      if (openBtn.childNodes.length && !openBtn.querySelector(".chip-text")) {
        openBtn.childNodes[openBtn.childNodes.length - 1].textContent = canImp
          ? " 📤 Xuất / Nhập"
          : " 📤 Xuất điểm";
        // keep emoji at start - rewrite fully
        openBtn.textContent = canImp ? "📤 Xuất / Nhập" : "📤 Xuất điểm";
      }
    }
  };

  /** Mở modal Xuất/Nhập (toàn app — UI theo quyền) */
  GL.openIoModal = function openIoModal() {
    if (typeof GL.canExport === "function" && !GL.canExport()) {
      GL.toast("Cần đăng nhập để xuất điểm.", "err");
      return;
    }
    GL.applyIoRoleUI();
    GL.fillIoExportClassSelect();
    var importTerm = document.getElementById("importTerm");
    if (importTerm) {
      importTerm.value =
        GL.activeTerm === "year" ? "hk1" : GL.activeTerm || "hk1";
    }
    var multiTerm = document.getElementById("ioMultiExportTerm");
    if (multiTerm) {
      multiTerm.value =
        GL.activeTerm === "hk2" || GL.activeTerm === "year"
          ? GL.activeTerm
          : "hk1";
    }
    var nameEl = document.getElementById("importFileName");
    if (nameEl && nameEl.textContent.indexOf("✓") !== 0) {
      if (/Đang đọc|👁|Lỗi:/.test(nameEl.textContent)) nameEl.textContent = "";
    }
    var modal = document.getElementById("ioModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  GL._pendingExport = null;

  GL.closeExportPreview = function closeExportPreview() {
    GL._pendingExport = null;
    var modal = document.getElementById("exportPreviewModal");
    if (modal) modal.classList.add("hidden");
    var anyOpen = document.querySelector(".modal-overlay:not(.hidden)");
    if (!anyOpen) document.body.style.overflow = "";
  };

  GL.renderExportPreviewSheet = function renderExportPreviewSheet(sheetKey) {
    var pending = GL._pendingExport;
    if (!pending) return;
    var sheet = pending.sheets.find(function (s) {
      return s.key === sheetKey;
    });
    if (!sheet) sheet = pending.sheets[0];
    pending.activeSheet = sheet.key;

    // tabs active
    document.querySelectorAll(".export-sheet-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-sheet") === sheet.key);
    });

    var thead = document.getElementById("exportPreviewThead");
    var tbody = document.getElementById("exportPreviewTbody");
    var meta = document.getElementById("exportPreviewSheetMeta");
    if (!thead || !tbody) return;

    if (sheet.rawPairs) {
      thead.innerHTML = "<tr><th>Mục</th><th>Giá trị</th></tr>";
      tbody.innerHTML = sheet.rawPairs
        .map(function (row) {
          if (!row || (!row[0] && !row[1])) {
            return '<tr><td colspan="2" style="height:8px;border:none;background:transparent"></td></tr>';
          }
          return (
            "<tr><td style='text-align:left;font-weight:650'>" +
            GL.escapeHtml(row[0] != null ? row[0] : "") +
            "</td><td style='text-align:left'>" +
            GL.escapeHtml(row[1] != null ? row[1] : "") +
            "</td></tr>"
          );
        })
        .join("");
      if (meta) {
        meta.textContent =
          sheet.label + " · " + sheet.rawPairs.length + " dòng thông tin";
      }
      return;
    }

    thead.innerHTML =
      "<tr>" +
      sheet.headers
        .map(function (h) {
          return "<th>" + GL.escapeHtml(String(h)) + "</th>";
        })
        .join("") +
      "</tr>";

    var maxPreview = 200;
    var rows = sheet.rows.slice(0, maxPreview);
    tbody.innerHTML = rows
      .map(function (row) {
        return (
          "<tr>" +
          row
            .map(function (cell) {
              return (
                "<td>" +
                GL.escapeHtml(cell == null || cell === "" ? "—" : String(cell)) +
                "</td>"
              );
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");

    if (meta) {
      var more =
        sheet.rows.length > maxPreview
          ? " (hiện " + maxPreview + "/" + sheet.rows.length + " dòng)"
          : "";
      meta.textContent =
        sheet.label +
        " · " +
        sheet.rows.length +
        " học viên · " +
        sheet.headers.length +
        " cột" +
        more;
    }
  };

  GL.refreshExportPreviewUI = function refreshExportPreviewUI() {
    var pending = GL._pendingExport;
    if (!pending) return;
    var cls =
      (pending.classId && GL.getClassById(pending.classId)) ||
      GL.getIoExportClass() ||
      GL.activeClass();
    if (!cls) return;

    var modeEl = document.querySelector(
      'input[name="exportMode"]:checked'
    );
    var mode = modeEl ? modeEl.value : pending.mode || "hk1";
    var pack = GL.buildExportPackage(cls, mode);
    pack.activeSheet =
      pending.activeSheet &&
      pack.sheets.some(function (s) {
        return s.key === pending.activeSheet;
      })
        ? pending.activeSheet
        : pack.sheets[0].key;
    GL._pendingExport = pack;

    var sub = document.getElementById("exportPreviewSub");
    if (sub) {
      sub.textContent =
        pack.modeLabel + ' · lớp "' + cls.name + '"';
    }

    var meta = document.getElementById("exportPreviewMeta");
    if (meta) {
      meta.innerHTML =
        '<span class="chip-meta">📚 ' +
        GL.escapeHtml(cls.name) +
        "</span>" +
        (cls.year
          ? '<span class="chip-meta">📅 ' + GL.escapeHtml(cls.year) + "</span>"
          : "") +
        '<span class="chip-meta">👥 ' +
        pack.studentCount +
        " HV</span>" +
        '<span class="chip-meta">📦 ' +
        GL.escapeHtml(pack.modeLabel) +
        "</span>" +
        '<span class="chip-meta">📄 ' +
        GL.escapeHtml(pack.filename) +
        "</span>" +
        '<span class="chip-meta">📑 ' +
        pack.sheets.length +
        " sheet</span>";
    }

    var desc = document.getElementById("exportModeDesc");
    if (desc) {
      var opt = (GL.EXPORT_OPTIONS || []).find(function (o) {
        return o.key === mode;
      });
      desc.textContent = opt ? opt.desc : "";
    }

    var tabs = document.getElementById("exportSheetTabs");
    if (tabs) {
      tabs.innerHTML = pack.sheets
        .map(function (s) {
          return (
            '<button type="button" class="export-sheet-tab' +
            (s.key === pack.activeSheet ? " active" : "") +
            '" data-sheet="' +
            s.key +
            '">' +
            '<input type="checkbox" class="export-sheet-cb" data-sheet="' +
            s.key +
            '" ' +
            (s.include ? "checked" : "") +
            ' title="Gồm sheet này khi xuất" /> ' +
            GL.escapeHtml(s.label) +
            ' <span class="export-tab-count">' +
            (s.rawPairs ? s.rawPairs.length : s.rows.length) +
            "</span></button>"
          );
        })
        .join("");
    }

    var fnameInput = document.getElementById("exportFilename");
    if (fnameInput) fnameInput.value = pack.filename;

    GL.renderExportPreviewSheet(pack.activeSheet);
  };

  GL.showExportPreview = function showExportPreview(classIdOpt) {
    var cls = null;
    if (classIdOpt) cls = GL.getClassById(classIdOpt);
    if (!cls) cls = GL.getIoExportClass();
    if (!cls) {
      GL.toast("Chọn lớp cần xuất trong «Xuất / Nhập».", "err");
      return;
    }
    if (!cls.students.length) {
      GL.toast('Lớp "' + cls.name + '" chưa có học viên để xuất.', "err");
      return;
    }
    if (typeof XLSX === "undefined") {
      GL.toast(
        "Chưa tải thư viện Excel (assets/vendor/xlsx.full.min.js).",
        "err"
      );
      return;
    }

    // default mode theo kỳ đang xem
    var defaultMode =
      GL.activeTerm === "hk2"
        ? "hk2"
        : GL.activeTerm === "year"
          ? "year"
          : "hk1";

    // chọn radio
    var radio = document.querySelector(
      'input[name="exportMode"][value="' + defaultMode + '"]'
    );
    if (radio) radio.checked = true;

    GL._pendingExport = GL.buildExportPackage(cls, defaultMode);
    GL._pendingExport.activeSheet = GL._pendingExport.sheets[0].key;

    GL.refreshExportPreviewUI();

    var io = document.getElementById("ioModal");
    if (io) io.classList.add("hidden");

    var modal = document.getElementById("exportPreviewModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  /** Nút Xuất Excel → mở xem trước (không tải ngay) */
  GL.exportExcel = function exportExcel() {
    try {
      GL.showExportPreview();
    } catch (err) {
      console.error("exportExcel preview error", err);
      GL.toast(
        "Lỗi xem trước Excel: " + (err && err.message ? err.message : String(err)),
        "err"
      );
    }
  };

  /** Xác nhận tải file sau khi review */
  GL.confirmExportExcel = function confirmExportExcel() {
    try {
      var pending = GL._pendingExport;
      if (!pending) {
        GL.toast("Không có dữ liệu xuất.", "err");
        return;
      }
      if (typeof XLSX === "undefined") {
        GL.toast("Chưa tải thư viện Excel.", "err");
        return;
      }

      // sync include flags from UI
      document.querySelectorAll(".export-sheet-cb").forEach(function (cb) {
        var key = cb.getAttribute("data-sheet");
        var sheet = pending.sheets.find(function (s) {
          return s.key === key;
        });
        if (sheet) sheet.include = cb.checked;
      });

      var included = pending.sheets.filter(function (s) {
        return s.include;
      });
      if (!included.length) {
        GL.toast("Chọn ít nhất 1 sheet để xuất.", "err");
        return;
      }

      var fnameEl = document.getElementById("exportFilename");
      var fname = (fnameEl && fnameEl.value.trim()) || pending.filename;
      if (!/\.xlsx$/i.test(fname)) fname += ".xlsx";
      fname = fname.replace(/[\\/:*?"<>|]/g, "-");

      var wb = XLSX.utils.book_new();
      included.forEach(function (sheet) {
        var aoa;
        if (sheet.rawPairs) {
          aoa = sheet.rawPairs;
        } else {
          aoa = [sheet.headers].concat(sheet.rows);
        }
        var ws = XLSX.utils.aoa_to_sheet(aoa);
        if (sheet.headers && sheet.headers.length) {
          ws["!cols"] = sheet.headers.map(function (h, i) {
            return {
              wch: i >= 2 && i <= 4 ? 16 : Math.max(10, String(h).length + 1),
            };
          });
        }
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });

      GL.downloadWorkbook(wb, fname);
      GL.closeExportPreview();
      GL.toast(
        "Đã xuất " +
          included.length +
          " sheet · " +
          pending.studentCount +
          " HV → " +
          fname
      );
    } catch (err) {
      console.error("confirmExportExcel error", err);
      GL.toast(
        "Xuất Excel lỗi: " + (err && err.message ? err.message : String(err)),
        "err"
      );
    }
  };

  GL.exportCsv = function exportCsv() {
    var cls = GL.getIoExportClass();
    if (!cls) {
      GL.toast("Chọn lớp cần xuất trong «Xuất / Nhập».", "err");
      return;
    }
    if (!cls.students.length) {
      GL.toast('Lớp "' + cls.name + '" chưa có dữ liệu.', "err");
      return;
    }
    // CSV: theo kỳ đang xem
    var built;
    if (GL.activeTerm === "year") {
      built = GL.buildYearSummaryRows(cls, { includeInfo: false });
    } else {
      built = GL.buildExportRows(
        cls,
        GL.activeTerm === "hk2" ? "hk2" : "hk1",
        { includeInfo: false }
      );
    }
    var csv = [built.headers]
      .concat(built.rows)
      .map(function (r) {
        return r
          .map(function (c) {
            return '"' + String(c).replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\n");
    var blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    var term = GL.activeTerm || "hk1";
    var termPart =
      term === "hk2" ? "HK2" : term === "year" ? "Ca nam" : "HK1";
    var classPart = String(cls.name || "Lop")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);
    GL.downloadBlob(blob, classPart + " - " + termPart + ".csv");
    GL.toast("Đã xuất CSV (" + GL.termLabel(GL.activeTerm) + ").");
  };

  GL.downloadTemplate = function downloadTemplate() {
    try {
    if (typeof XLSX === "undefined") {
      GL.toast("Chưa tải thư viện Excel (assets/vendor/xlsx.full.min.js).", "err");
      return;
    }
    var headers = ["STT", "Lớp"]
      .concat(
        GL.NAME_FIELDS.map(function (nf) {
          return nf.label;
        })
      )
      .concat(
        GL.COLS.map(function (c) {
          return c.label;
        })
      )
      .concat(["Ghi chú"]);
    var sample = [
      [
        1,
        "Thiếu nhi 1A",
        "Anna",
        "Nguyễn Ngọc Kim",
        "Anh",
        10,
        "6; 8",
        "7.5; 5.75",
        8,
        8.5,
        8,
        "Chuyên cần tốt",
      ],
      [
        2,
        "Thiếu nhi 1A",
        "Maria",
        "Nguyễn Ngọc Minh",
        "Anh",
        10,
        7,
        "8; 6.5",
        9,
        9,
        9.2,
        "",
      ],
      [3, "Ấu Nhi 1B", "Giuse", "Trần Văn", "Bảo", 9, 8, 7, 8, 8, 8, "Cần kèm thêm"],
    ];
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(
      [headers]
        .concat(sample)
        .concat([
          [],
          [
            "Hướng dẫn: có cột Lớp để lọc khi nhập (vd. chỉ Thiếu nhi 1A). Tên: Thánh | Họ đệm | Tên. Nhiều điểm: 7.5; 8",
          ],
        ])
    );
    XLSX.utils.book_append_sheet(wb, ws, "Mau");
    GL.downloadWorkbook(wb, "mau-nhap-diem-giao-ly.xlsx");
    GL.toast("Đã tải file mẫu.");
    } catch (err) {
      console.error(err);
      GL.toast("Lỗi tải mẫu: " + (err.message || err), "err");
    }
  };
})(window.GL = window.GL || {});
