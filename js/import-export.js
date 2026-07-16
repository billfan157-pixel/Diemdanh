/**
 * Xuất / nhập Excel, CSV, Word.
 */
(function (GL) {
  "use strict";

  /**
   * @param {object} cls
   * @param {string} term hk1|hk2
   * @param {{ includeInfo?: boolean }} opts
   */
  GL.buildExportRows = function buildExportRows(cls, term, opts) {
    term = term || "hk1";
    if (term !== "hk1" && term !== "hk2") term = "hk1";
    opts = opts || {};
    var includeInfo = !!opts.includeInfo;

    var headers = ["STT", "Học kỳ"]
      .concat(
        GL.NAME_FIELDS.map(function (nf) {
          return nf.label;
        })
      );
    if (includeInfo) {
      headers = headers.concat(
        (GL.INFO_FIELDS || []).map(function (f) {
          return f.label;
        })
      );
    }
    headers = headers
      .concat(
        GL.COLS.map(function (c) {
          return c.label;
        })
      )
      .concat(
        GL.COLS.map(function (c) {
          return c.label + " (chi tiết)";
        })
      )
      .concat(["TB", "Xếp loại", "Ghi chú"]);

    var rows = cls.students.map(function (st, i) {
      GL.ensureStudentTerms(st);
      GL.ensureNameFields(st);
      var bag = GL.getScores(st, term);
      var tb = GL.studentTB(st, cls.weights, term);
      var cl = GL.classify(tb);
      var nameVals = GL.NAME_FIELDS.map(function (nf) {
        var val = st[nf.key] || "";
        if (!val && nf.key === "hoDem" && !st.tenThanh && !st.ten && st.name) {
          val = st.name;
        }
        return val;
      });
      var row = [i + 1, GL.termLabel(term)].concat(nameVals);
      if (includeInfo) {
        (GL.INFO_FIELDS || []).forEach(function (f) {
          row.push(st[f.key] || "");
        });
      }
      var avgs = GL.COLS.map(function (c) {
        var avg = GL.colAvg(bag[c.key]);
        return avg == null ? "" : Number(avg.toFixed(2));
      });
      var details = GL.COLS.map(function (c) {
        return (bag[c.key] || []).join("; ");
      });
      return row
        .concat(avgs)
        .concat(details)
        .concat([
          tb == null ? "" : Number(tb.toFixed(2)),
          tb == null ? "" : cl.label,
          st.ghiChu || "",
        ]);
    });
    return { headers: headers, rows: rows };
  };

  /**
   * @param {object} cls
   * @param {{ includeInfo?: boolean }} opts
   */
  GL.buildYearSummaryRows = function buildYearSummaryRows(cls, opts) {
    opts = opts || {};
    var includeInfo = !!opts.includeInfo;
    var headers = ["STT", "Tên thánh", "Họ và tên đệm", "Tên"];
    if (includeInfo) {
      headers = headers.concat(
        (GL.INFO_FIELDS || []).map(function (f) {
          return f.label;
        })
      );
    }
    headers = headers.concat([
      "TB HK1",
      "XL HK1",
      "TB HK2",
      "XL HK2",
      "TB cả năm",
      "XL cả năm",
      "Ghi chú",
    ]);

    var rows = cls.students.map(function (st, i) {
      GL.ensureStudentTerms(st);
      GL.ensureNameFields(st);
      var t1 = GL.studentTB(st, cls.weights, "hk1");
      var t2 = GL.studentTB(st, cls.weights, "hk2");
      var ty = GL.studentYearTB(st, cls.weights);
      var row = [
        i + 1,
        st.tenThanh || "",
        st.hoDem || (!st.tenThanh && !st.ten && st.name ? st.name : ""),
        st.ten || "",
      ];
      if (includeInfo) {
        (GL.INFO_FIELDS || []).forEach(function (f) {
          row.push(st[f.key] || "");
        });
      }
      row = row.concat([
        t1 == null ? "" : Number(t1.toFixed(2)),
        t1 == null ? "" : GL.classify(t1).label,
        t2 == null ? "" : Number(t2.toFixed(2)),
        t2 == null ? "" : GL.classify(t2).label,
        ty == null ? "" : Number(ty.toFixed(2)),
        ty == null ? "" : GL.classify(ty).label,
        st.ghiChu || "",
      ]);
      return row;
    });
    return { headers: headers, rows: rows };
  };

  /** Các gói xuất Excel */
  GL.EXPORT_OPTIONS = [
    {
      key: "hk1",
      label: "Xuất điểm Học kỳ 1",
      desc: "Chỉ bảng điểm HK1 (họ tên + điểm + TB)",
      fileSuffix: "HK1",
    },
    {
      key: "hk2",
      label: "Xuất điểm Học kỳ 2",
      desc: "Chỉ bảng điểm HK2 (họ tên + điểm + TB)",
      fileSuffix: "HK2",
    },
    {
      key: "year",
      label: "Xuất điểm cả năm",
      desc: "Gồm sheet HK1, HK2 và tổng kết cả năm",
      fileSuffix: "Ca nam",
    },
    {
      key: "full",
      label: "Xuất đầy đủ",
      desc: "Tất cả sheet + thông tin học viên (mã, SĐT, phụ huynh…)",
      fileSuffix: "Day du",
    },
  ];

  /** Tải file binary (xlsx) — hoạt động cả khi mở file:// */
  GL.downloadBlob = function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  };

  /**
   * Gắn pageSetup A4 dọc + fit-to-width cho mọi sheet (metadata SheetJS).
   * Community SheetJS thường không ghi vào file — bước JSZip bên dưới sẽ inject XML.
   */
  GL.applyWorkbookA4Portrait = function applyWorkbookA4Portrait(wb) {
    if (!wb || !wb.SheetNames) return wb;
    wb.SheetNames.forEach(function (name) {
      var ws = wb.Sheets[name];
      if (!ws) return;
      ws["!pageSetup"] = Object.assign({}, ws["!pageSetup"] || {}, {
        paperSize: 9, // A4 (ECMA-376)
        orientation: "portrait",
        fitToWidth: 1,
        fitToHeight: 0,
        scale: 100,
      });
      ws["!margins"] = Object.assign({}, ws["!margins"] || {}, {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      });
    });
    return wb;
  };

  /**
   * Inject pageSetup A4 portrait vào từng worksheet XML trong file xlsx.
   * @param {ArrayBuffer|Uint8Array} data
   * @returns {Promise<Blob>}
   */
  GL.injectXlsxA4Portrait = function injectXlsxA4Portrait(data) {
    var mime =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (typeof JSZip === "undefined") {
      return Promise.resolve(new Blob([data], { type: mime }));
    }
    var zip = new JSZip();
    return zip
      .loadAsync(data)
      .then(function (z) {
        var tasks = [];
        var folder = z.folder("xl/worksheets");
        if (!folder) return z;
        folder.forEach(function (relPath, file) {
          if (file.dir) return;
          if (!/\.xml$/i.test(relPath)) return;
          tasks.push(
            file.async("string").then(function (xml) {
              var next = GL._patchWorksheetXmlA4(xml);
              if (next !== xml) {
                z.file("xl/worksheets/" + relPath, next);
              }
            })
          );
        });
        return Promise.all(tasks).then(function () {
          return z;
        });
      })
      .then(function (z) {
        return z.generateAsync({
          type: "blob",
          mimeType: mime,
          compression: "DEFLATE",
        });
      })
      .catch(function (err) {
        console.warn("injectXlsxA4Portrait failed, raw file", err);
        return new Blob([data], { type: mime });
      });
  };

  /** Sửa XML worksheet → A4 dọc, fit 1 trang ngang */
  GL._patchWorksheetXmlA4 = function patchWorksheetXmlA4(xml) {
    if (!xml || typeof xml !== "string") return xml;
    var out = xml;

    // sheetPr / pageSetUpPr fitToPage
    if (/<sheetPr[\s>]/.test(out)) {
      if (/<pageSetUpPr\b/.test(out)) {
        out = out.replace(
          /<pageSetUpPr\b[^/]*\/>/,
          '<pageSetUpPr fitToPage="1"/>'
        );
        out = out.replace(
          /<pageSetUpPr\b([^>]*)>/,
          function (m, attrs) {
            if (/fitToPage=/.test(attrs)) {
              return (
                "<pageSetUpPr" +
                attrs.replace(/fitToPage="[^"]*"/, 'fitToPage="1"') +
                ">"
              );
            }
            return "<pageSetUpPr" + attrs + ' fitToPage="1">';
          }
        );
      } else {
        out = out.replace(
          /<sheetPr([^>]*)\/>/,
          '<sheetPr$1><pageSetUpPr fitToPage="1"/></sheetPr>'
        );
        out = out.replace(
          /<sheetPr([^>]*)>/,
          '<sheetPr$1><pageSetUpPr fitToPage="1"/>'
        );
      }
    } else {
      out = out.replace(
        /(<worksheet\b[^>]*>)/,
        '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
      );
    }

    var margins =
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>';
    var setup =
      '<pageSetup paperSize="9" orientation="portrait" fitToPage="1" fitToWidth="1" fitToHeight="0"/>';

    if (/<pageMargins\b/.test(out)) {
      out = out.replace(/<pageMargins\b[^/]*\/>/, margins);
      out = out.replace(/<pageMargins\b[^>]*>[\s\S]*?<\/pageMargins>/, margins);
    } else {
      out = out.replace(/<\/worksheet>/, margins + "</worksheet>");
    }

    if (/<pageSetup\b/.test(out)) {
      out = out.replace(/<pageSetup\b[^/]*\/>/, setup);
      out = out.replace(/<pageSetup\b[^>]*>[\s\S]*?<\/pageSetup>/, setup);
    } else {
      out = out.replace(/<\/worksheet>/, setup + "</worksheet>");
    }

    return out;
  };

  GL.downloadWorkbook = function downloadWorkbook(wb, filename) {
    if (typeof XLSX === "undefined") {
      throw new Error("Thư viện Excel (XLSX) chưa tải được.");
    }
    if (typeof GL.applyWorkbookA4Portrait === "function") {
      GL.applyWorkbookA4Portrait(wb);
    }
    // Ưu tiên write → Blob (ổn định hơn writeFile trên một số trình duyệt / file://)
    try {
      var out = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
        cellStyles: false,
      });
      // SheetJS type:"array" → number[]; JSZip cần Uint8Array
      var bytes =
        out instanceof Uint8Array
          ? out
          : new Uint8Array(out);
      var finish = function (blob) {
        GL.downloadBlob(blob, filename);
      };
      if (typeof GL.injectXlsxA4Portrait === "function") {
        GL.injectXlsxA4Portrait(bytes)
          .then(finish)
          .catch(function () {
            finish(
              new Blob([bytes], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              })
            );
          });
        return;
      }
      finish(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
      return;
    } catch (e1) {
      console.warn("XLSX.write blob failed, fallback writeFile", e1);
    }
    if (typeof XLSX.writeFile === "function") {
      XLSX.writeFile(wb, filename);
      return;
    }
    throw new Error("Không thể tải file Excel trên trình duyệt này.");
  };

  /**
   * Đóng gói dữ liệu xuất theo option.
   * @param {object} cls
   * @param {string} mode hk1|hk2|year|full
   */
  GL.buildExportPackage = function buildExportPackage(cls, mode) {
    mode = mode || "hk1";
    var opt = (GL.EXPORT_OPTIONS || []).find(function (o) {
      return o.key === mode;
    });
    if (!opt) {
      mode = "hk1";
      opt = GL.EXPORT_OPTIONS[0];
    }

    var includeInfo = mode === "full";
    var sheets = [];

    function pushTermSheet(term) {
      var built = GL.buildExportRows(cls, term, { includeInfo: includeInfo });
      sheets.push({
        key: term,
        name: term === "hk1" ? "HK1" : "HK2",
        label: term === "hk1" ? "Học kỳ 1" : "Học kỳ 2",
        headers: built.headers,
        rows: built.rows,
        include: true,
      });
    }

    if (mode === "hk1") {
      pushTermSheet("hk1");
    } else if (mode === "hk2") {
      pushTermSheet("hk2");
    } else if (mode === "year") {
      // Điểm cả năm = HK1 + HK2 + tổng kết
      pushTermSheet("hk1");
      pushTermSheet("hk2");
      var year = GL.buildYearSummaryRows(cls, { includeInfo: false });
      sheets.push({
        key: "year",
        name: "Ca nam",
        label: "Tổng kết cả năm",
        headers: year.headers,
        rows: year.rows,
        include: true,
      });
    } else {
      // full
      pushTermSheet("hk1");
      pushTermSheet("hk2");
      var yearFull = GL.buildYearSummaryRows(cls, { includeInfo: true });
      sheets.push({
        key: "year",
        name: "Ca nam",
        label: "Tổng kết cả năm",
        headers: yearFull.headers,
        rows: yearFull.rows,
        include: true,
      });
      var infoRows = [
        ["Lớp", cls.name],
        ["Năm học", cls.year || ""],
        ["Loại xuất", opt.label],
        ["Công thức TB năm", GL.yearFormulaText ? GL.yearFormulaText() : ""],
        [],
        ["Cột điểm", "Hệ số"],
      ]
        .concat(
          GL.COLS.map(function (c) {
            return [c.label, cls.weights[c.key]];
          })
        )
        .concat([[], ["Ngày xuất", new Date().toLocaleString("vi-VN")]]);
      sheets.push({
        key: "info",
        name: "Thong tin",
        label: "Thông tin lớp / hệ số",
        headers: ["Mục", "Giá trị"],
        rows: infoRows,
        rawPairs: infoRows,
        include: true,
      });
    }

    // Tên file: "Tên lớp - option"
    var classPart = String(cls.name || "Lop")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);
    var fname = classPart + " - " + opt.fileSuffix + ".xlsx";

    return {
      classId: cls.id,
      className: cls.name,
      year: cls.year || "",
      studentCount: cls.students.length,
      filename: fname,
      mode: mode,
      modeLabel: opt.label,
      includeInfo: includeInfo,
      sheets: sheets,
    };
  };

  /** Lấy lớp theo id (xuất/nhập độc lập với lớp đang xem bảng điểm) */
  GL.getClassById = function getClassById(id) {
    if (!id || !GL.state || !GL.state.classes) return null;
    return (
      GL.state.classes.find(function (c) {
        return c.id === id;
      }) || null
    );
  };

  /** Tên sheet Excel an toàn (≤31 ký tự, unique) */
  GL.safeSheetName = function safeSheetName(name, used) {
    used = used || {};
    var base = String(name || "Sheet")
      .replace(/[\\/?*[\]:]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 28);
    if (!base) base = "Sheet";
    var n = base;
    var i = 2;
    while (used[n]) {
      var suf = " " + i;
      n = base.slice(0, 31 - suf.length) + suf;
      i++;
    }
    used[n] = true;
    return n;
  };

  /**
   * Xuất nhiều lớp → 1 file Excel, mỗi lớp 1 sheet (điểm theo kỳ).
   * @param {object[]} classes
   * @param {string} mode hk1|hk2|year
   */
  GL.exportMultiClassExcel = function exportMultiClassExcel(classes, mode) {
    if (typeof XLSX === "undefined") {
      throw new Error("Chưa tải thư viện Excel.");
    }
    classes = (classes || []).filter(function (c) {
      return c && Array.isArray(c.students);
    });
    if (!classes.length) {
      throw new Error("Không có lớp để xuất.");
    }
    mode = mode || "hk1";
    if (mode !== "hk1" && mode !== "hk2" && mode !== "year") mode = "hk1";

    var wb = XLSX.utils.book_new();
    var used = {};
    var totalHv = 0;

    classes.forEach(function (cls) {
      totalHv += (cls.students || []).length;
      var sheetLabel =
        cls.name +
        (cls.year ? " " + cls.year : "") +
        (mode === "year" ? " CN" : mode === "hk2" ? " HK2" : " HK1");
      var sheetName = GL.safeSheetName(sheetLabel, used);

      var built;
      if (mode === "year") {
        built = GL.buildYearSummaryRows(cls, { includeInfo: false });
      } else {
        built = GL.buildExportRows(cls, mode, { includeInfo: false });
      }
      var aoa = [built.headers].concat(built.rows);
      // dòng meta đầu
      aoa.unshift(
        ["Lớp", cls.name],
        ["Năm học", cls.year || ""],
        ["Kỳ", GL.termLabel(mode)],
        ["Số HV", cls.students.length],
        []
      );
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Sheet tổng hợp
    var sumHeaders = [
      "STT",
      "Lớp",
      "Năm học",
      "Số HV",
      "Có TB",
      "TB lớp",
      "Giỏi+",
      "Yếu",
    ];
    var sumRows = classes.map(function (cls, i) {
      var withTb = 0;
      var sum = 0;
      var good = 0;
      var weak = 0;
      (cls.students || []).forEach(function (st) {
        var tb = GL.studentTBContext(st, cls.weights, mode);
        if (tb == null) return;
        withTb++;
        sum += tb;
        if (tb >= 8) good++;
        if (tb < 5) weak++;
      });
      return [
        i + 1,
        cls.name,
        cls.year || "",
        (cls.students || []).length,
        withTb,
        withTb ? Number((sum / withTb).toFixed(2)) : "",
        good,
        weak,
      ];
    });
    var sumAoa = [
      ["Tổng hợp xuất nhiều lớp"],
      ["Kỳ", GL.termLabel(mode)],
      [
        "Năm học filter",
        GL.activeYearFilter || "Tất cả",
      ],
      ["Số lớp", classes.length],
      ["Số HV", totalHv],
      ["Xuất lúc", new Date().toLocaleString("vi-VN")],
      [],
      sumHeaders,
    ].concat(sumRows);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(sumAoa),
      GL.safeSheetName("Tong hop", used)
    );

    var yearPart = GL.activeYearFilter
      ? GL.activeYearFilter.replace(/[\\/:*?"<>|]/g, "-")
      : "Tat-ca";
    var fname =
      "Nhieu lop - " +
      yearPart +
      " - " +
      GL.termLabel(mode).replace(/\s+/g, " ") +
      ".xlsx";
    if (typeof GL.downloadWorkbook === "function") {
      GL.downloadWorkbook(wb, fname);
    } else {
      XLSX.writeFile(wb, fname);
    }
    return {
      classes: classes.length,
      students: totalHv,
      filename: fname,
      mode: mode,
    };
  };

  /** Xuất các lớp trong phạm vi năm học hiện tại (chỉ admin) */
  GL.exportScopedClassesExcel = function exportScopedClassesExcel(mode) {
    if (
      typeof GL.canExportMultiClass === "function" &&
      !GL.canExportMultiClass()
    ) {
      GL.toast("Chỉ Ban Giáo lý (admin) được xuất nhiều lớp.", "err");
      return null;
    }
    var classes =
      typeof GL.classesInScope === "function"
        ? GL.classesInScope()
        : typeof GL.visibleClasses === "function"
          ? GL.visibleClasses()
          : (GL.state && GL.state.classes) || [];
    if (!classes.length) {
      GL.toast("Không có lớp trong phạm vi năm học để xuất.", "err");
      return null;
    }
    try {
      var res = GL.exportMultiClassExcel(classes, mode);
      GL.toast(
        "Đã xuất " +
          res.classes +
          " lớp · " +
          res.students +
          " HV → " +
          res.filename
      );
      return res;
    } catch (err) {
      console.error(err);
      GL.toast(err.message || "Xuất nhiều lớp lỗi.", "err");
      return null;
    }
  };

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
        "Chưa tải thư viện Excel (js/vendor/xlsx.full.min.js).",
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
      GL.toast("Chưa tải thư viện Excel (js/vendor/xlsx.full.min.js).", "err");
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

  GL.rowsToStudents = function rowsToStudents(matrix) {
    if (!matrix || matrix.length < 2) {
      throw new Error("File cần có tiêu đề + ít nhất 1 dòng học viên.");
    }
    var headerIdx = 0;
    var bestScore = -1;
    var r, c, score, cell;
    for (r = 0; r < Math.min(8, matrix.length); r++) {
      score = 0;
      var row = matrix[r] || [];
      for (c = 0; c < row.length; c++) {
        var m = GL.mapHeader(row[c]);
        if (m && m !== "_skip") score++;
      }
      if (score > bestScore) {
        bestScore = score;
        headerIdx = r;
      }
    }

    var colMap = (matrix[headerIdx] || []).map(GL.mapHeader);
    var students = [];

    for (r = headerIdx + 1; r < matrix.length; r++) {
      var dataRow = matrix[r] || [];
      var empty = dataRow.every(function (v) {
        return v == null || String(v).trim() === "";
      });
      if (empty) continue;

      var fullName = "";
      var tenThanh = "";
      var hoDem = "";
      var ten = "";
      var lop = "";
      var ghiChu = "";
      var info = {};
      var scores = GL.emptyScores();
      (GL.INFO_FIELDS || []).forEach(function (f) {
        info[f.key] = "";
      });

      for (c = 0; c < Math.max(dataRow.length, colMap.length); c++) {
        var key = colMap[c];
        if (!key || key === "_skip") continue;
        var val = dataRow[c];
        if (key === "fullName" || key === "name") {
          var s = String(val ?? "").trim();
          if (s) fullName = s;
        } else if (key === "tenThanh") tenThanh = String(val ?? "").trim();
        else if (key === "hoDem" || key === "ho") {
          hoDem = String(val ?? "").trim();
        } else if (key === "ten" || key === "tenOnly") {
          ten = String(val ?? "").trim();
        } else if (key === "lop") {
          lop = String(val ?? "").trim();
        } else if (key === "ghiChu") {
          ghiChu = String(val ?? "").trim();
        } else if (info.hasOwnProperty(key)) {
          info[key] = String(val ?? "").trim();
        } else if (scores[key]) {
          scores[key] = scores[key].concat(GL.parseScoreCell(val));
        }
      }

      // Chỉ có cột Họ tên gộp → để legacy name (hiển thị), 3 cột rỗng để user tách sau
      if (!tenThanh && !hoDem && !ten && fullName) {
        if (/^(stt|tt|họ tên|ho ten|học viên)$/i.test(fullName)) continue;
        students.push(
          GL.createStudent(
            Object.assign(
              {
                name: fullName,
                scores: scores,
                _lop: lop,
                ghiChu: ghiChu,
              },
              info
            )
          )
        );
        continue;
      }

      var display = [tenThanh, hoDem, ten].filter(Boolean).join(" ").trim();
      if (!display) continue;
      if (/^(stt|tt|họ tên|ho ten|học viên)$/i.test(display)) continue;

      students.push(
        GL.createStudent(
          Object.assign(
            {
              tenThanh: tenThanh,
              hoDem: hoDem,
              ten: ten,
              scores: scores,
              _lop: lop,
              ghiChu: ghiChu,
            },
            info
          )
        )
      );
    }

    if (!students.length) {
      throw new Error("Không tìm thấy học viên trong file.");
    }
    return students;
  };

  /** Dự đoán số thêm / cập nhật theo mode (không ghi dữ liệu) */
  GL.previewImportStats = function previewImportStats(incoming, mode) {
    var cls = GL.activeClass();
    var added = 0;
    var updated = 0;
    var withScores = 0;

    incoming.forEach(function (inc) {
      GL.ensureStudentTerms(inc);
      var bag = GL.getScores(inc);
      var hasAny = GL.COLS.some(function (col) {
        return bag[col.key] && bag[col.key].length;
      });
      if (hasAny) withScores++;

      if (mode === "replace" || mode === "append") {
        added++;
      } else if (cls) {
        var found = cls.students.find(function (s) {
          return GL.normStudent(s) === GL.normStudent(inc);
        });
        if (found) updated++;
        else added++;
      } else {
        added++;
      }
    });

    return {
      total: incoming.length,
      added: added,
      updated: updated,
      withScores: withScores,
      nameOnly: incoming.length - withScores,
    };
  };

  /**
   * Nhập danh sách HV vào một lớp (không lưu state — caller lưu 1 lần).
   * @param {object} cls
   * @param {Array} incoming
   * @param {string} mode merge|append|replace
   * @param {string} importTerm hk1|hk2
   */
  GL.applyImportToClass = function applyImportToClass(
    cls,
    incoming,
    mode,
    importTerm
  ) {
    if (!cls) throw new Error("Chưa chọn lớp.");
    if (!mode) mode = "merge";
    importTerm = importTerm || "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";

    var added = 0;
    var updated = 0;
    incoming = incoming || [];

    if (mode === "replace") {
      cls.students = incoming.map(function (inc) {
        GL.ensureStudentTerms(inc);
        return inc;
      });
      added = incoming.length;
    } else if (mode === "append") {
      incoming.forEach(function (inc) {
        GL.ensureStudentTerms(inc);
        cls.students.push(inc);
      });
      added = incoming.length;
    } else {
      incoming.forEach(function (inc) {
        GL.ensureStudentTerms(inc);
        var found = cls.students.find(function (s) {
          return GL.normStudent(s) === GL.normStudent(inc);
        });
        if (!found) {
          GL.ensureNameFields(inc);
          cls.students.push(inc);
          added++;
        } else {
          GL.ensureStudentTerms(found);
          if (inc.tenThanh || inc.hoDem || inc.ten) {
            if (inc.tenThanh) found.tenThanh = inc.tenThanh;
            if (inc.hoDem) found.hoDem = inc.hoDem;
            if (inc.ten) found.ten = inc.ten;
            if (inc.tenThanh || inc.hoDem || inc.ten) found.name = "";
          }
          if (inc.ghiChu) found.ghiChu = String(inc.ghiChu).trim();
          (GL.INFO_FIELDS || []).forEach(function (f) {
            if (inc[f.key]) found[f.key] = String(inc[f.key]).trim();
          });
          var bag = GL.getScores(found, importTerm);
          var src = GL.getScores(inc, importTerm);
          GL.COLS.forEach(function (col) {
            var before = (bag[col.key] || []).slice();
            var add = src[col.key] || [];
            if (!add.length) return;
            bag[col.key] = before.concat(add);
            if (typeof GL.logScoreColumnChange === "function") {
              var prevTerm = GL.activeTerm;
              GL.activeTerm = importTerm;
              GL.logScoreColumnChange(
                found,
                col.key,
                before,
                bag[col.key],
                "import"
              );
              GL.activeTerm = prevTerm;
            }
          });
          updated++;
        }
      });
    }

    cls.students.forEach(function (st) {
      GL.ensureNameFields(st);
      GL.ensureStudentTerms(st);
    });
    GL.touchClass(cls);

    return {
      added: added,
      updated: updated,
      total: incoming.length,
      term: importTerm,
      classId: cls.id,
      className: cls.name,
      created: false,
    };
  };

  GL.applyImport = function applyImport(incoming, mode, importTerm) {
    var cls = GL.activeClass();
    if (!cls) throw new Error("Chưa chọn lớp.");
    if (!mode) {
      var modeEl =
        document.getElementById("importPreviewMode") ||
        document.getElementById("importMode");
      mode = modeEl ? modeEl.value : "merge";
    }
    importTerm =
      importTerm ||
      (GL._pendingImport && GL._pendingImport.importTerm) ||
      GL.activeTerm ||
      "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";

    var res = GL.applyImportToClass(cls, incoming, mode, importTerm);
    if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Nhập file điểm");
    GL.saveState();
    GL.render();
    return res;
  };

  /** Clone 1 dòng pending → student sẵn sàng ghi (kèm điểm theo kỳ) */
  GL.cloneImportStudent = function cloneImportStudent(st, importTerm) {
    GL.ensureStudentTerms(st);
    var infoCopy = {};
    (GL.INFO_FIELDS || []).forEach(function (f) {
      infoCopy[f.key] = st[f.key] || "";
    });
    var created = GL.createStudent(
      Object.assign(
        {
          tenThanh: st.tenThanh,
          hoDem: st.hoDem,
          ten: st.ten,
          name: st.name,
          ghiChu: st.ghiChu || "",
          scores: GL.cloneScores(GL.getScores(st, importTerm)),
          _term: importTerm,
        },
        infoCopy
      )
    );
    // giữ tên lớp file (không lưu vào state student, chỉ dùng lúc phân lớp)
    created._lop = st._lop || "";
    return created;
  };

  /**
   * Nhóm học viên đã chọn theo tên lớp trong file (_lop).
   * Dòng không có lớp → khóa "" (fallback).
   */
  GL.groupImportStudentsByLop = function groupImportStudentsByLop(students) {
    var map = {};
    var order = [];
    (students || []).forEach(function (st) {
      var lop = String(st._lop || "").trim();
      var key = lop || "";
      if (!map[key]) {
        map[key] = { lop: lop, students: [] };
        order.push(key);
      }
      map[key].students.push(st);
    });
    return order.map(function (k) {
      return map[k];
    });
  };

  /**
   * Tìm hoặc tạo lớp theo tên (không đổi active nếu opts.keepActive).
   * @param {string} lopName
   * @param {{ keepActive?: boolean, year?: string }} opts
   */
  GL.findOrCreateClassByName = function findOrCreateClassByName(lopName, opts) {
    opts = opts || {};
    lopName = String(lopName || "").trim();
    if (!lopName) throw new Error("Thiếu tên lớp.");

    var existing = GL.findAppClassByName(lopName);
    if (existing) {
      if (!opts.keepActive) {
        GL.state.activeClassId = existing.id;
      }
      return { cls: existing, created: false };
    }

    if (typeof GL.canCreateClass === "function" && !GL.canCreateClass()) {
      throw new Error(
        'Không có quyền tạo lớp "' + lopName + '". Liên hệ Ban Giáo lý.'
      );
    }

    var year = opts.year != null ? String(opts.year).trim() : "";
    if (!year && typeof GL.getPrintSettings === "function") {
      var ps = GL.getPrintSettings();
      if (ps && ps.namHoc) year = ps.namHoc;
    }

    var cls = GL.createClass(lopName, year);
    GL.state.classes.push(cls);
    if (!opts.keepActive) {
      GL.state.activeClassId = cls.id;
    }

    var u = typeof GL.currentUser === "function" ? GL.currentUser() : null;
    if (u && u.role === "glv") {
      u.classIds = u.classIds || [];
      if (u.classIds.indexOf(cls.id) < 0) {
        u.classIds.push(cls.id);
        if (typeof GL.saveAuthStore === "function") GL.saveAuthStore();
      }
    }

    return { cls: cls, created: true };
  };

  /**
   * Nhập nhiều lớp: phân HV theo cột Lớp; tự tạo lớp nếu chưa có.
   * Dòng không có lớp → lớp active (hoặc lớp đầu tiên vừa tạo).
   */
  GL.applyImportByLopGroups = function applyImportByLopGroups(
    selected,
    mode,
    importTerm
  ) {
    if (!mode) {
      var modeEl =
        document.getElementById("importPreviewMode") ||
        document.getElementById("importMode");
      mode = modeEl ? modeEl.value : "merge";
    }
    importTerm =
      importTerm ||
      (GL._pendingImport && GL._pendingImport.importTerm) ||
      GL.activeTerm ||
      "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";

    var groups = GL.groupImportStudentsByLop(selected);
    var withLop = groups.filter(function (g) {
      return !!g.lop;
    });
    var without = groups.filter(function (g) {
      return !g.lop;
    });

    if (!withLop.length) {
      // Không có cột Lớp / mọi dòng trống → hành vi cũ: 1 lớp
      var single = GL.activeClass();
      if (!single) throw new Error("Chưa có lớp đích để nhập.");
      var clones0 = selected.map(function (st) {
        return GL.cloneImportStudent(st, importTerm);
      });
      var r0 = GL.applyImportToClass(single, clones0, mode, importTerm);
      if (typeof GL.setUndoLabel === "function") {
        GL.setUndoLabel("Nhập file điểm");
      }
      GL.saveState();
      GL.render();
      return {
        multi: false,
        added: r0.added,
        updated: r0.updated,
        total: r0.total,
        term: importTerm,
        classesTouched: 1,
        classesCreated: 0,
        perClass: [r0],
        targetLabel: single.name,
      };
    }

    var perClass = [];
    var totalAdded = 0;
    var totalUpdated = 0;
    var classesCreated = 0;
    var prevActive = GL.state.activeClassId;
    var firstClassId = null;

    withLop.forEach(function (g) {
      var fr = GL.findOrCreateClassByName(g.lop, { keepActive: true });
      if (fr.created) classesCreated++;
      if (!firstClassId) firstClassId = fr.cls.id;
      var clones = g.students.map(function (st) {
        return GL.cloneImportStudent(st, importTerm);
      });
      var res = GL.applyImportToClass(fr.cls, clones, mode, importTerm);
      res.created = fr.created;
      perClass.push(res);
      totalAdded += res.added;
      totalUpdated += res.updated;
    });

    // Dòng không có tên lớp
    if (without.length && without[0].students.length) {
      var fallback =
        GL.activeClass() ||
        (firstClassId && GL.getClassById
          ? GL.getClassById(firstClassId)
          : null) ||
        (GL.state.classes && GL.state.classes[0]) ||
        null;
      if (!fallback) {
        throw new Error(
          "Có " +
            without[0].students.length +
            " HV không có cột Lớp và chưa có lớp đích."
        );
      }
      var clonesFb = without[0].students.map(function (st) {
        return GL.cloneImportStudent(st, importTerm);
      });
      var resFb = GL.applyImportToClass(
        fallback,
        clonesFb,
        mode === "replace" ? "merge" : mode, // không replace cả lớp bằng phần thiếu lớp
        importTerm
      );
      resFb.fallback = true;
      perClass.push(resFb);
      totalAdded += resFb.added;
      totalUpdated += resFb.updated;
    }

    // Active: lớp đầu tiên trong file, hoặc giữ lớp trước
    if (firstClassId) {
      GL.state.activeClassId = firstClassId;
    } else if (prevActive) {
      GL.state.activeClassId = prevActive;
    }

    if (typeof GL.setUndoLabel === "function") {
      GL.setUndoLabel(
        "Nhập file · " +
          withLop.length +
          " lớp" +
          (classesCreated ? " (+" + classesCreated + " mới)" : "")
      );
    }
    GL.saveState();
    GL.render();

    var names = perClass
      .map(function (p) {
        return p.className + (p.created ? " ★" : "");
      })
      .join(", ");

    return {
      multi: true,
      added: totalAdded,
      updated: totalUpdated,
      total: selected.length,
      term: importTerm,
      classesTouched: perClass.length,
      classesCreated: classesCreated,
      perClass: perClass,
      targetLabel: names,
    };
  };

  /** @type {{ students: Array, fileName: string, selected: boolean[], hasLop: boolean } | null} */
  GL._pendingImport = null;

  GL.closeImportPreview = function closeImportPreview() {
    GL._pendingImport = null;
    var modal = document.getElementById("importPreviewModal");
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
    var nameFilter = document.getElementById("importFilterName");
    var lopFilter = document.getElementById("importFilterLop");
    if (nameFilter) nameFilter.value = "";
    if (lopFilter) lopFilter.innerHTML = '<option value="">Tất cả lớp</option>';
  };

  /** So khớp lớp file ↔ bộ lọc (không phân biệt hoa thường, gọn khoảng trắng) */
  GL.matchLopFilter = function matchLopFilter(lopValue, filterValue) {
    if (!filterValue) return true;
    return GL.normName(lopValue || "") === GL.normName(filterValue);
  };

  /** Tìm lớp trong app theo tên (khớp với cột Lớp trong file) */
  GL.findAppClassByName = function findAppClassByName(name) {
    if (!name || !GL.state || !GL.state.classes) return null;
    var n = GL.normName(name);
    return (
      GL.state.classes.find(function (c) {
        return GL.normName(c.name) === n;
      }) || null
    );
  };

  /**
   * Tạo lớp mới từ tên filter import (nếu chưa có).
   * Gán cho GLV hiện tại nếu cần; chọn làm lớp active.
   */
  GL.createClassFromFilterName = function createClassFromFilterName(lopName, yearOpt) {
    lopName = String(lopName || "").trim();
    if (!lopName) throw new Error("Chưa chọn tên lớp filter.");
    var fr = GL.findOrCreateClassByName(lopName, {
      year: yearOpt,
      keepActive: false,
    });
    if (fr.created) {
      if (typeof GL.setUndoLabel === "function") {
        GL.setUndoLabel('Tạo lớp "' + lopName + '"');
      }
      if (typeof GL.saveState === "function") GL.saveState();
    } else if (typeof GL.saveState === "function") {
      GL.saveState({ skipUndo: true });
    }
    return fr.cls;
  };

  /** Cập nhật nút «Tạo lớp từ filter» + trạng thái lớp app */
  GL.updateImportCreateClassUI = function updateImportCreateClassUI() {
    var btn = document.getElementById("importCreateClassBtn");
    var status = document.getElementById("importClassStatus");
    var filter = GL.getImportFilterState();
    var lop = filter.lop;
    var pending = GL._pendingImport;

    if (!btn) return;

    if (!lop) {
      btn.classList.add("hidden");
      btn.disabled = true;
      if (status) {
        if (pending && pending.hasLop) {
          // Đếm lớp trong file (các dòng đang chọn / tất cả pending)
          var selected = GL.getSelectedImportStudents
            ? GL.getSelectedImportStudents()
            : pending.students || [];
          var groups = GL.groupImportStudentsByLop(selected);
          var named = groups.filter(function (g) {
            return !!g.lop;
          });
          var missing = 0;
          var existingN = 0;
          named.forEach(function (g) {
            if (GL.findAppClassByName(g.lop)) existingN++;
            else missing++;
          });
          status.innerHTML =
            '🌐 <strong>Tất cả lớp</strong> — xác nhận nhập sẽ <strong>tự xếp HV vào đúng lớp</strong> theo cột Lớp trong file' +
            (named.length
              ? " · " +
                named.length +
                " lớp (" +
                existingN +
                " đã có" +
                (missing
                  ? ", <em>tự tạo " + missing + " lớp mới</em>"
                  : "") +
                ")"
              : "") +
            ".";
        } else {
          var cur = GL.activeClass();
          status.innerHTML = cur
            ? 'Đích nhập: lớp app <strong>' +
              GL.escapeHtml(cur.name) +
              "</strong> (file không có cột Lớp — mọi HV vào lớp này)"
            : "File không có cột Lớp · cần có ít nhất 1 lớp trong app.";
        }
      }
      return;
    }

    var existing = GL.findAppClassByName(lop);
    var canCreate =
      typeof GL.canCreateClass !== "function" || GL.canCreateClass();

    if (existing) {
      btn.classList.add("hidden");
      btn.disabled = true;
      if (status) {
        var isActive = existing.id === GL.state.activeClassId;
        status.innerHTML =
          '✓ Lớp <strong>' +
          GL.escapeHtml(lop) +
          "</strong> đã có trong app" +
          (isActive
            ? " <em>(đang chọn — sẽ nhập vào đây)</em>"
            : " — khi xác nhận sẽ <strong>chuyển sang lớp này</strong> để nhập");
      }
    } else {
      btn.classList.remove("hidden");
      btn.disabled = !canCreate;
      btn.textContent = "＋ Tạo lớp «" + lop + "»";
      if (status) {
        status.innerHTML = canCreate
          ? '⚠️ Lớp <strong>' +
            GL.escapeHtml(lop) +
            "</strong> <em>chưa có</em> trong app. Bấm <strong>Tạo lớp</strong> hoặc xác nhận nhập sẽ được hỏi tạo lớp mới đúng tên filter."
          : '⚠️ Lớp <strong>' +
            GL.escapeHtml(lop) +
            "</strong> chưa có — bạn <em>không có quyền</em> tạo lớp. Liên hệ Ban Giáo lý.";
      }
    }
  };

  /** Cập nhật phụ đề / chip meta «lớp đích» trong modal import */
  GL.refreshImportTargetClassUI = function refreshImportTargetClassUI() {
    var cls = GL.activeClass();
    var pending = GL._pendingImport;
    if (!cls || !pending) return;

    var term = pending.importTerm || GL.activeTerm || "hk1";
    var sub = document.getElementById("importPreviewSub");
    if (sub) {
      sub.textContent =
        "Nhập vào " + GL.termLabel(term) + ' · lớp "' + cls.name + '"';
    }

    var meta = document.getElementById("importPreviewMeta");
    if (meta) {
      var appChip = meta.querySelector(".chip-meta-app");
      if (appChip) {
        appChip.textContent = "📚 App: " + cls.name;
      } else {
        // fallback: rebuild meta chip list if structure changed
        var chips = meta.querySelectorAll(".chip-meta");
        if (chips.length >= 2) {
          chips[1].textContent = "📚 App: " + cls.name;
        }
      }
      var hvChip = meta.querySelector(".chip-meta-hv");
      if (hvChip) {
        hvChip.textContent = "Hiện có " + cls.students.length + " HV";
      }
    }

    if (typeof GL.refreshImportPreviewActions === "function") {
      GL.refreshImportPreviewActions();
    }
  };

  /**
   * Bấm nút «Tạo lớp từ filter»: tạo (hoặc chọn) lớp đúng tên filter.
   * @returns {object|null} lớp đã chọn
   */
  GL.createImportClassFromFilter = function createImportClassFromFilter() {
    var filter = GL.getImportFilterState();
    var lop = filter.lop;
    if (!lop) {
      GL.toast("Hãy chọn lớp trong bộ lọc trước.", "err");
      return null;
    }
    try {
      var existed = GL.findAppClassByName(lop);
      var cls = GL.createClassFromFilterName(lop);
      GL.updateImportCreateClassUI();
      GL.refreshImportTargetClassUI();
      if (typeof GL.renderClassList === "function") GL.renderClassList();
      if (existed) {
        GL.toast('Đã chuyển sang lớp "' + cls.name + '".');
      } else {
        GL.toast('Đã tạo lớp mới "' + cls.name + '" — sẽ nhập vào lớp này.');
      }
      return cls;
    } catch (err) {
      console.error(err);
      GL.toast(err.message || "Không tạo được lớp.", "err");
      return null;
    }
  };

  /**
   * Trước khi xác nhận import (Promise&lt;boolean&gt;).
   * - Filter 1 lớp → chuyển/tạo lớp đó
   * - Filter «Tất cả» + có cột Lớp → multi-class (tự tạo khi xác nhận)
   * - Không có cột Lớp → cần lớp active
   */
  GL.ensureImportTargetClass = function ensureImportTargetClass(
    selectedCount,
    selectedStudents
  ) {
    var filter = GL.getImportFilterState();
    var lop = filter.lop;
    var n = selectedCount != null ? selectedCount : 0;
    var pending = GL._pendingImport;
    var selected =
      selectedStudents ||
      (typeof GL.getSelectedImportStudents === "function"
        ? GL.getSelectedImportStudents()
        : []);

    function ok(v) {
      return Promise.resolve(!!v);
    }

    if (lop) {
      var existing = GL.findAppClassByName(lop);
      if (existing) {
        if (existing.id !== GL.state.activeClassId) {
          GL.state.activeClassId = existing.id;
          if (typeof GL.saveState === "function") {
            GL.saveState({ skipUndo: true });
          }
        }
        return ok(true);
      }

      return GL.confirm({
        title: "Tạo lớp mới?",
        message:
          'Lớp "' +
          lop +
          '" chưa có trong app.\n\nTạo lớp mới đúng tên filter và nhập ' +
          n +
          " học viên đã chọn vào lớp đó?",
        type: "warn",
        okText: "Tạo & nhập",
        cancelText: "Hủy",
      }).then(function (yes) {
        if (!yes) return false;
        try {
          GL.createClassFromFilterName(lop);
          return true;
        } catch (err) {
          console.error(err);
          GL.toast(err.message || "Không tạo được lớp.", "err");
          return false;
        }
      });
    }

    // === Tất cả lớp ===
    var hasLopCol = pending && pending.hasLop;
    var groups = GL.groupImportStudentsByLop(selected);
    var named = groups.filter(function (g) {
      return !!g.lop;
    });

    if (hasLopCol && named.length) {
      var toCreate = named.filter(function (g) {
        return !GL.findAppClassByName(g.lop);
      });
      if (toCreate.length) {
        if (typeof GL.canCreateClass === "function" && !GL.canCreateClass()) {
          GL.toast(
            "Có " +
              toCreate.length +
              " lớp chưa có nhưng bạn không có quyền tạo lớp.",
            "err"
          );
          return ok(false);
        }
        var list = toCreate
          .slice(0, 12)
          .map(function (g) {
            return '• "' + g.lop + '" (' + g.students.length + " HV)";
          })
          .join("\n");
        if (toCreate.length > 12) {
          list += "\n… và " + (toCreate.length - 12) + " lớp nữa";
        }
        return GL.confirm({
          title: "Nhập tất cả lớp",
          message:
            "Sẽ tự xếp HV vào đúng lớp theo file.\nTạo mới " +
            toCreate.length +
            " lớp chưa có:\n\n" +
            list,
          type: "info",
          okText: "Tiếp tục nhập",
          cancelText: "Hủy",
        });
      }
      return ok(true);
    }

    if (GL.activeClass()) return ok(true);

    GL.toast(
      "Chưa có lớp đích. Tạo lớp ở cột trái, hoặc dùng file có cột Lớp.",
      "err"
    );
    return ok(false);
  };

  GL.getImportFilterState = function getImportFilterState() {
    var lopEl = document.getElementById("importFilterLop");
    var nameEl = document.getElementById("importFilterName");
    return {
      lop: lopEl ? lopEl.value : "",
      name: nameEl ? GL.normName(nameEl.value) : "",
    };
  };

  /** Dòng có khớp bộ lọc đang chọn không */
  GL.studentMatchesImportFilter = function studentMatchesImportFilter(st, filter) {
    filter = filter || GL.getImportFilterState();
    if (!GL.matchLopFilter(st._lop, filter.lop)) return false;
    if (filter.name) {
      if (GL.normStudent(st).indexOf(filter.name) < 0) return false;
    }
    return true;
  };

  GL.getVisibleImportIndices = function getVisibleImportIndices() {
    var pending = GL._pendingImport;
    if (!pending) return [];
    var filter = GL.getImportFilterState();
    var out = [];
    pending.students.forEach(function (st, i) {
      if (GL.studentMatchesImportFilter(st, filter)) out.push(i);
    });
    return out;
  };

  GL.getSelectedImportStudents = function getSelectedImportStudents() {
    var pending = GL._pendingImport;
    if (!pending) return [];
    return pending.students.filter(function (_, i) {
      return pending.selected[i];
    });
  };

  /** Chỉ tick các dòng đang hiện theo filter */
  GL.selectVisibleImportRows = function selectVisibleImportRows() {
    var pending = GL._pendingImport;
    if (!pending) return;
    var visible = {};
    GL.getVisibleImportIndices().forEach(function (i) {
      visible[i] = true;
    });
    pending.selected = pending.students.map(function (_, i) {
      return !!visible[i];
    });
    var tbody = document.getElementById("importPreviewTbody");
    if (tbody) {
      Array.prototype.forEach.call(
        tbody.querySelectorAll(".import-row-cb"),
        function (cb) {
          var idx = Number(cb.getAttribute("data-idx"));
          cb.checked = !!pending.selected[idx];
        }
      );
    }
    GL.applyImportPreviewFilter();
  };

  /** Ẩn/hiện dòng theo filter + cập nhật summary */
  GL.applyImportPreviewFilter = function applyImportPreviewFilter() {
    var pending = GL._pendingImport;
    if (!pending) return;
    var filter = GL.getImportFilterState();

    // Filter lớp đã có trong app → chuyển lớp đích ngay (preview «Tác động» chính xác)
    if (filter.lop) {
      var matched = GL.findAppClassByName(filter.lop);
      if (matched && matched.id !== GL.state.activeClassId) {
        GL.state.activeClassId = matched.id;
        if (typeof GL.saveState === "function") {
          GL.saveState({ skipUndo: true });
        }
        GL.refreshImportTargetClassUI();
        if (typeof GL.renderClassList === "function") GL.renderClassList();
      }
    }

    GL.updateImportCreateClassUI();
    var tbody = document.getElementById("importPreviewTbody");
    var visibleCount = 0;
    var selectedVisible = 0;

    if (tbody) {
      Array.prototype.forEach.call(tbody.querySelectorAll("tr"), function (tr) {
        var idx = Number(tr.getAttribute("data-idx"));
        var st = pending.students[idx];
        var match = st && GL.studentMatchesImportFilter(st, filter);
        tr.classList.toggle("row-filtered-out", !match);
        tr.classList.toggle("row-off", !pending.selected[idx]);
        if (match) {
          visibleCount++;
          if (pending.selected[idx]) selectedVisible++;
        }
      });
    }

    var hint = document.getElementById("importFilterHint");
    if (hint) {
      if (!pending.hasLop) {
        hint.innerHTML =
          "File <strong>không có cột Lớp</strong> — lọc theo lớp không dùng được. Dùng lọc theo tên hoặc chọn tay.";
      } else if (filter.lop) {
        hint.innerHTML =
          "Đang lọc lớp <strong>" +
          GL.escapeHtml(filter.lop) +
          "</strong> · hiện " +
          visibleCount +
          "/" +
          pending.students.length +
          " dòng · nhập vào <em>một lớp</em> đó (tự tạo nếu chưa có).";
      } else {
        hint.innerHTML =
          "<strong>Tất cả lớp</strong>: xác nhận sẽ tự xếp HV vào đúng lớp theo cột Lớp; lớp chưa có → <em>tự tạo</em>. " +
          "Hoặc chọn 1 lớp trong danh sách để chỉ nhập lớp đó.";
      }
    }

    GL.refreshImportPreviewSummary(visibleCount, selectedVisible);
  };

  GL.refreshImportPreviewSummary = function refreshImportPreviewSummary(
    visibleCount,
    selectedVisible
  ) {
    var pending = GL._pendingImport;
    if (!pending) return;
    var modeEl = document.getElementById("importPreviewMode");
    var mode = modeEl ? modeEl.value : "merge";
    var selected = GL.getSelectedImportStudents();
    var stats = GL.previewImportStats(selected, mode);

    if (visibleCount == null) {
      visibleCount = GL.getVisibleImportIndices().length;
    }

    var sum = document.getElementById("importPreviewSummary");
    if (sum) {
      sum.innerHTML =
        '<div class="sum-item"><div class="n">' +
        pending.students.length +
        '</div><div class="l">Trong file</div></div>' +
        '<div class="sum-item"><div class="n">' +
        visibleCount +
        '</div><div class="l">Đang hiện</div></div>' +
        '<div class="sum-item"><div class="n ok">' +
        stats.total +
        '</div><div class="l">Đã chọn nhập</div></div>' +
        '<div class="sum-item"><div class="n ok">' +
        stats.added +
        '</div><div class="l">' +
        (mode === "replace" ? "Sẽ ghi vào lớp" : "Thêm mới") +
        "</div></div>" +
        '<div class="sum-item"><div class="n warn">' +
        stats.updated +
        '</div><div class="l">Cập nhật</div></div>' +
        '<div class="sum-item"><div class="n">' +
        stats.withScores +
        '</div><div class="l">Có điểm</div></div>';
    }

    var confirmBtn = document.getElementById("importPreviewConfirm");
    if (confirmBtn) {
      confirmBtn.disabled = selected.length === 0;
      confirmBtn.textContent =
        selected.length === 0
          ? "Chưa chọn dòng nào"
          : "✓ Xác nhận nhập " + selected.length + " học viên";
    }

    var tbody = document.getElementById("importPreviewTbody");
    if (tbody) {
      Array.prototype.forEach.call(tbody.querySelectorAll("tr"), function (tr) {
        var idx = Number(tr.getAttribute("data-idx"));
        tr.classList.toggle("row-off", !pending.selected[idx]);
      });
    }

    // Select-all chỉ áp cho dòng đang hiện
    var allCb = document.getElementById("importSelectAll");
    if (allCb) {
      var visible = GL.getVisibleImportIndices();
      if (!visible.length) {
        allCb.checked = false;
        allCb.indeterminate = false;
      } else {
        var allOn = visible.every(function (i) {
          return pending.selected[i];
        });
        var someOn = visible.some(function (i) {
          return pending.selected[i];
        });
        allCb.checked = allOn;
        allCb.indeterminate = someOn && !allOn;
      }
    }
  };

  GL.collectLopValues = function collectLopValues(students) {
    var map = {};
    students.forEach(function (st) {
      var lop = String(st._lop || "").trim();
      if (lop) map[lop] = (map[lop] || 0) + 1;
    });
    return Object.keys(map)
      .sort(function (a, b) {
        return a.localeCompare(b, "vi");
      })
      .map(function (lop) {
        return { lop: lop, count: map[lop] };
      });
  };

  /** Chọn mặc định lớp trùng tên lớp app (nếu có trong file) */
  GL.pickDefaultLopFilter = function pickDefaultLopFilter(lopList, className) {
    if (!lopList.length || !className) return "";
    var target = GL.normName(className);
    for (var i = 0; i < lopList.length; i++) {
      if (GL.normName(lopList[i].lop) === target) return lopList[i].lop;
    }
    // khớp một phần: "Thiếu nhi 1A" trong "Lớp Thiếu nhi 1A"
    for (var j = 0; j < lopList.length; j++) {
      var n = GL.normName(lopList[j].lop);
      if (n.indexOf(target) >= 0 || target.indexOf(n) >= 0) return lopList[j].lop;
    }
    return "";
  };

  GL.showImportPreview = function showImportPreview(students, fileName) {
    // Import là chức năng toàn app — không bắt buộc đang mở bảng điểm lớp
    var cls = GL.activeClass();
    var displayCls = cls || {
      name: "(chưa chọn lớp đích)",
      students: [],
      year: "",
    };

    var lopList = GL.collectLopValues(students);
    var hasLop = lopList.length > 0;
    var defaultLop = GL.pickDefaultLopFilter(
      lopList,
      cls ? cls.name : ""
    );

    // Ưu tiên: chọn trong modal Xuất/Nhập → kỳ đang xem
    var mainTermEl = document.getElementById("importTerm");
    var importTermEl = document.getElementById("importPreviewTerm");
    var importTerm =
      (mainTermEl && mainTermEl.value) ||
      (importTermEl && importTermEl.value) ||
      GL.activeTerm ||
      "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";
    if (importTermEl) importTermEl.value = importTerm;

    // Gắn điểm import vào đúng học kỳ
    students.forEach(function (st) {
      if (st.scores && !st.scoresByTerm) {
        var flat = st.scores;
        st.scoresByTerm = {
          hk1: GL.emptyScores(),
          hk2: GL.emptyScores(),
        };
        st.scoresByTerm[importTerm] = GL.cloneScores(flat);
        delete st.scores;
      } else if (st.scoresByTerm) {
        // nếu createStudent đã ghi vào activeTerm khác → chuyển sang importTerm
        var a = GL.getScores(st, "hk1");
        var b = GL.getScores(st, "hk2");
        var has1 = GL.COLS.some(function (c) {
          return a[c.key] && a[c.key].length;
        });
        var has2 = GL.COLS.some(function (c) {
          return b[c.key] && b[c.key].length;
        });
        if (importTerm === "hk2" && has1 && !has2) {
          st.scoresByTerm.hk2 = GL.cloneScores(a);
          st.scoresByTerm.hk1 = GL.emptyScores();
        } else if (importTerm === "hk1" && has2 && !has1) {
          st.scoresByTerm.hk1 = GL.cloneScores(b);
          st.scoresByTerm.hk2 = GL.emptyScores();
        }
      }
      GL.ensureStudentTerms(st);
    });

    GL._pendingImport = {
      students: students,
      fileName: fileName || "file",
      selected: students.map(function () {
        return true;
      }),
      hasLop: hasLop,
      importTerm: importTerm,
    };

    var mainMode = document.getElementById("importMode");
    var previewMode = document.getElementById("importPreviewMode");
    if (mainMode && previewMode) previewMode.value = mainMode.value;

    var sub = document.getElementById("importPreviewSub");
    if (sub) {
      sub.textContent =
        "Nhập vào " +
        GL.termLabel(importTerm) +
        (cls
          ? ' · lớp đích "' + cls.name + '"'
          : " · chọn/tạo lớp đích (filter Lớp hoặc tạo lớp)");
    }

    var meta = document.getElementById("importPreviewMeta");
    if (meta) {
      meta.innerHTML =
        '<span class="chip-meta">📄 ' +
        GL.escapeHtml(fileName) +
        "</span>" +
        '<span class="chip-meta chip-meta-app">📚 App: ' +
        GL.escapeHtml(displayCls.name) +
        "</span>" +
        '<span class="chip-meta">👥 ' +
        students.length +
        " dòng file</span>" +
        (hasLop
          ? '<span class="chip-meta">🏷️ ' + lopList.length + " lớp trong file</span>"
          : '<span class="chip-meta">⚠️ Không có cột Lớp</span>') +
        '<span class="chip-meta chip-meta-hv">Hiện có ' +
        displayCls.students.length +
        " HV</span>";
    }

    // Dropdown filter lớp
    var lopSelect = document.getElementById("importFilterLop");
    if (lopSelect) {
      lopSelect.innerHTML =
        '<option value="">Tất cả lớp (' +
        students.length +
        ")</option>" +
        lopList
          .map(function (item) {
            return (
              '<option value="' +
              GL.escapeHtml(item.lop) +
              '">' +
              GL.escapeHtml(item.lop) +
              " (" +
              item.count +
              ")</option>"
            );
          })
          .join("");
      lopSelect.disabled = !hasLop;
      lopSelect.value = defaultLop || "";
    }

    var nameFilter = document.getElementById("importFilterName");
    if (nameFilter) nameFilter.value = "";

    var thead = document.getElementById("importPreviewThead");
    if (thead) {
      thead.innerHTML =
        "<tr>" +
        '<th style="width:36px"></th>' +
        '<th style="width:40px">STT</th>' +
        (hasLop ? "<th>Lớp</th>" : "") +
        GL.NAME_FIELDS.map(function (nf) {
          return '<th class="name-col">' + nf.short + "</th>";
        }).join("") +
        GL.COLS.map(function (c) {
          return "<th>" + c.short + "</th>";
        }).join("") +
        "<th>Tác động</th>" +
        "</tr>";
    }

    var tbody = document.getElementById("importPreviewTbody");
    if (tbody) {
      tbody.innerHTML = students
        .map(function (st, i) {
          var mode = previewMode ? previewMode.value : "merge";
          var action = "new";
          var actionLabel = "Thêm mới";
          if (mode === "replace") {
            action = "replace";
            actionLabel = "Thay thế";
          } else if (mode === "append") {
            action = "append";
            actionLabel = "Thêm dòng";
          } else if (cls && cls.students) {
            var found = cls.students.find(function (s) {
              return GL.normStudent(s) === GL.normStudent(st);
            });
            if (found) {
              action = "update";
              actionLabel = "Cập nhật";
            }
          }

          var nameCells = GL.NAME_FIELDS.map(function (nf) {
            var val = st[nf.key] || "";
            if (!val && nf.key === "hoDem" && !st.tenThanh && !st.ten && st.name) {
              val = st.name;
            }
            return (
              '<td class="name-col" title="' +
              GL.escapeHtml(val) +
              '">' +
              GL.escapeHtml(val || "—") +
              "</td>"
            );
          }).join("");

          var bag = GL.getScores(st, GL._pendingImport.importTerm || GL.activeTerm);
          var cells = GL.COLS.map(function (col) {
            var scores = bag[col.key] || [];
            if (!scores.length) {
              return '<td class="miss-cell">—</td>';
            }
            return "<td>" + scores.map(GL.fmt).join("; ") + "</td>";
          }).join("");

          var lopCell = hasLop
            ? '<td class="name-col" style="font-weight:600;color:var(--text2)">' +
              GL.escapeHtml(st._lop || "—") +
              "</td>"
            : "";

          return (
            '<tr data-idx="' +
            i +
            '" data-lop="' +
            GL.escapeHtml(st._lop || "") +
            '">' +
            '<td><input type="checkbox" class="import-row-cb" data-idx="' +
            i +
            '" checked /></td>' +
            "<td>" +
            (i + 1) +
            "</td>" +
            lopCell +
            nameCells +
            cells +
            '<td><span class="action-pill ' +
            action +
            '">' +
            actionLabel +
            "</span></td>" +
            "</tr>"
          );
        })
        .join("");
    }

    // Nếu auto-match được lớp app → chỉ chọn dòng lớp đó
    if (defaultLop) {
      GL.selectVisibleImportRows();
    } else {
      GL.applyImportPreviewFilter();
    }

    var modal = document.getElementById("importPreviewModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    if (defaultLop) {
      GL.toast('Đã lọc sẵn lớp "' + defaultLop + '" (trùng tên lớp app).');
    }
  };

  /** Cập nhật nhãn "Tác động" khi đổi mode */
  GL.refreshImportPreviewActions = function refreshImportPreviewActions() {
    var pending = GL._pendingImport;
    if (!pending) return;
    var cls = GL.activeClass(); // có thể null — mọi dòng = Thêm mới
    var modeEl = document.getElementById("importPreviewMode");
    var mode = modeEl ? modeEl.value : "merge";
    var tbody = document.getElementById("importPreviewTbody");
    if (!tbody) return;

    Array.prototype.forEach.call(tbody.querySelectorAll("tr"), function (tr) {
      var idx = Number(tr.getAttribute("data-idx"));
      var st = pending.students[idx];
      if (!st) return;
      var action = "new";
      var actionLabel = "Thêm mới";
      if (mode === "replace") {
        action = "replace";
        actionLabel = "Thay thế";
      } else if (mode === "append") {
        action = "append";
        actionLabel = "Thêm dòng";
      } else if (cls && cls.students) {
        var found = cls.students.find(function (s) {
          return GL.normStudent(s) === GL.normStudent(st);
        });
        if (found) {
          action = "update";
          actionLabel = "Cập nhật";
        }
      }
      var pill = tr.querySelector(".action-pill");
      if (pill) {
        pill.className = "action-pill " + action;
        pill.textContent = actionLabel;
      }
    });

    GL.applyImportPreviewFilter();
  };

  GL.confirmImportPreview = function confirmImportPreview() {
    if (typeof GL.canImport === "function" && !GL.canImport()) {
      GL.toast("Chỉ Ban Giáo lý (admin) được xác nhận nhập file.", "err");
      return;
    }
    var pending = GL._pendingImport;
    if (!pending) return;

    var selected = GL.getSelectedImportStudents();
    if (!selected.length) {
      GL.toast("Chọn ít nhất 1 học viên để nhập.", "err");
      return;
    }

    var modeEl = document.getElementById("importPreviewMode");
    var mode = modeEl ? modeEl.value : "merge";
    var filter = GL.getImportFilterState();
    var importTerm = pending.importTerm || GL.activeTerm || "hk1";
    var groups = GL.groupImportStudentsByLop(selected);
    var namedGroups = groups.filter(function (g) {
      return !!g.lop;
    });
    var multiMode = !filter.lop && pending.hasLop && namedGroups.length > 0;
    var fileName = pending.fileName;

    function runImport() {
      try {
        var res;
        if (multiMode) {
          res = GL.applyImportByLopGroups(selected, mode, importTerm);
        } else {
          var target = GL.activeClass();
          if (!target) {
            GL.toast("Chưa có lớp đích để nhập.", "err");
            return;
          }
          var toImport = selected.map(function (st) {
            return GL.cloneImportStudent(st, importTerm);
          });
          res = GL.applyImport(toImport, mode, importTerm);
          res.multi = false;
          res.targetLabel = target.name;
          res.classesTouched = 1;
          res.classesCreated = 0;
        }

        GL.closeImportPreview();

        if (typeof GL.setActiveTerm === "function") {
          GL.setActiveTerm(importTerm);
        }

        var mainMode = document.getElementById("importMode");
        if (mainMode) mainMode.value = mode;

        var summaryLabel = res.multi
          ? res.classesTouched +
            " lớp" +
            (res.classesCreated
              ? " (tạo mới " + res.classesCreated + ")"
              : "")
          : res.targetLabel || "";

        var nameEl = document.getElementById("importFileName");
        if (nameEl) {
          nameEl.textContent =
            "✓ " +
            fileName +
            " → " +
            GL.termLabel(importTerm) +
            " · " +
            summaryLabel +
            " — +" +
            res.added +
            " mới, " +
            res.updated +
            " cập nhật";
        }

        if (res.multi) {
          GL.toast(
            "Đã nhập " +
              res.total +
              " HV vào " +
              res.classesTouched +
              " lớp" +
              (res.classesCreated
                ? " (tự tạo " + res.classesCreated + " lớp mới)"
                : "") +
              " · " +
              GL.termLabel(importTerm) +
              " (+" +
              res.added +
              " mới, " +
              res.updated +
              " cập nhật)"
          );
        } else {
          GL.toast(
            "Đã nhập " +
              res.total +
              ' HV vào lớp "' +
              (res.targetLabel || "") +
              '" · ' +
              GL.termLabel(importTerm) +
              " (+" +
              res.added +
              " mới, " +
              res.updated +
              " cập nhật)"
          );
        }
        GL.render();
      } catch (err) {
        console.error(err);
        GL.toast(err.message || "Không nhập được.", "err");
      }
    }

    function afterTargetOk() {
      if (mode === "replace") {
        if (multiMode) {
          return GL.confirm({
            title: "Thay thế nhiều lớp?",
            message:
              "Chế độ Thay thế + Tất cả lớp:\nMỗi lớp trong file sẽ bị thay danh sách HV bằng các dòng thuộc lớp đó (" +
              namedGroups.length +
              " lớp · " +
              selected.length +
              " HV).",
            danger: true,
            okText: "Thay thế & nhập",
            cancelText: "Hủy",
          }).then(function (ok) {
            if (ok) runImport();
          });
        }
        var cls = GL.activeClass();
        if (cls && cls.students.length) {
          return GL.confirm({
            title: "Thay thế lớp?",
            message:
              "Thay thế toàn bộ " +
              cls.students.length +
              ' HV của lớp "' +
              cls.name +
              '" bằng ' +
              selected.length +
              " dòng đã chọn?",
            danger: true,
            okText: "Thay thế",
            cancelText: "Hủy",
          }).then(function (ok) {
            if (ok) runImport();
          });
        }
      }
      runImport();
    }

    GL.ensureImportTargetClass(selected.length, selected).then(function (ok) {
      if (!ok) return;
      afterTargetOk();
    });
  };

  GL.parseExcelFile = async function parseExcelFile(file) {
    if (typeof XLSX === "undefined") throw new Error("Chưa tải thư viện Excel.");
    var wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    var best = null;
    var bestLen = -1;
    wb.SheetNames.forEach(function (name) {
      var m = XLSX.utils.sheet_to_json(wb.Sheets[name], {
        header: 1,
        defval: "",
        raw: true,
      });
      var score = m.length + (/điểm|diem|học|hoc|gl/i.test(name) ? 50 : 0);
      if (score > bestLen) {
        bestLen = score;
        best = m;
      }
    });
    return GL.rowsToStudents(best || []);
  };

  GL.parseCsvFile = async function parseCsvFile(file) {
    if (typeof XLSX === "undefined") throw new Error("Chưa tải thư viện Excel.");
    var wb = XLSX.read(await file.text(), { type: "string" });
    var ws = wb.Sheets[wb.SheetNames[0]];
    return GL.rowsToStudents(
      XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true })
    );
  };

  GL.parseDocxFile = async function parseDocxFile(file) {
    if (typeof JSZip === "undefined") throw new Error("Chưa tải thư viện Word.");
    var zip = await JSZip.loadAsync(await file.arrayBuffer());
    var entry = zip.file("word/document.xml");
    if (!entry) throw new Error("File Word không hợp lệ.");
    var docXml = await entry.async("string");
    var xml = new DOMParser().parseFromString(docXml, "application/xml");
    var W_NS =
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

    function cellText(tc) {
      var texts = [];
      var ts = tc.getElementsByTagNameNS(W_NS, "t");
      if (!ts.length) ts = tc.getElementsByTagName("w:t");
      for (var i = 0; i < ts.length; i++) texts.push(ts[i].textContent || "");
      return texts.join("").replace(/\s+/g, " ").trim();
    }

    var tables = Array.from(xml.getElementsByTagNameNS(W_NS, "tbl"));
    if (!tables.length) tables = Array.from(xml.getElementsByTagName("w:tbl"));

    if (!tables.length) {
      var ps = Array.from(xml.getElementsByTagNameNS(W_NS, "p"));
      if (!ps.length) ps = Array.from(xml.getElementsByTagName("w:p"));
      var names = ps
        .map(function (p) {
          var ts = p.getElementsByTagNameNS(W_NS, "t");
          if (!ts.length) ts = p.getElementsByTagName("w:t");
          var parts = [];
          for (var i = 0; i < ts.length; i++) parts.push(ts[i].textContent || "");
          return parts.join("").replace(/\s+/g, " ").trim();
        })
        .filter(function (t) {
          return t && t.length > 1 && !/^(stt|danh sách|bảng điểm)/i.test(t);
        });
      if (!names.length) {
        throw new Error("Word không có bảng điểm. Dùng Table hoặc Excel.");
      }
      return names.map(function (name) {
        return GL.createStudent({ name: name, scores: GL.emptyScores() });
      });
    }

    var best = null;
    var bestCount = 0;
    var lastErr = null;
    tables.forEach(function (tbl) {
      try {
        var rows = Array.from(tbl.getElementsByTagNameNS(W_NS, "tr"));
        if (!rows.length) rows = Array.from(tbl.getElementsByTagName("w:tr"));
        var matrix = rows.map(function (tr) {
          var cells = Array.from(tr.getElementsByTagNameNS(W_NS, "tc"));
          if (!cells.length) cells = Array.from(tr.getElementsByTagName("w:tc"));
          return cells.map(cellText);
        });
        var students = GL.rowsToStudents(matrix);
        if (students.length > bestCount) {
          bestCount = students.length;
          best = students;
        }
      } catch (e) {
        lastErr = e;
      }
    });
    if (!best) throw lastErr || new Error("Không đọc được bảng Word.");
    return best;
  };

  GL.handleImportFile = async function handleImportFile(file) {
    if (!file) return;
    if (typeof GL.canImport === "function" && !GL.canImport()) {
      GL.toast(
        "Giáo lý viên không được nhập file. Chỉ Ban Giáo lý (admin) được nhập.",
        "err"
      );
      return;
    }
    // Không bắt buộc chọn lớp — có thể tạo lớp từ filter khi xác nhận
    var nameEl = document.getElementById("importFileName");
    if (nameEl) nameEl.textContent = "Đang đọc: " + file.name + " …";

    var ext = file.name.split(".").pop().toLowerCase();
    try {
      var students;
      if (ext === "csv") students = await GL.parseCsvFile(file);
      else if (ext === "docx") students = await GL.parseDocxFile(file);
      else if (ext === "doc") {
        throw new Error("Dùng .docx hoặc Excel, không hỗ trợ .doc cũ.");
      } else students = await GL.parseExcelFile(file);

      if (nameEl) {
        nameEl.textContent =
          "👁 " + file.name + " — " + students.length + " dòng (chờ xác nhận)";
      }
      // Xem trước — chưa ghi vào hệ thống
      GL.showImportPreview(students, file.name);
    } catch (err) {
      console.error(err);
      if (nameEl) nameEl.textContent = "Lỗi: " + file.name;
      GL.toast(err.message || "Không đọc được file.", "err");
    }
  };
})(window.GL = window.GL || {});
