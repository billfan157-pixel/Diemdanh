/**
 * Excel workbook builders and download helpers.
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
})(window.GL = window.GL || {});
