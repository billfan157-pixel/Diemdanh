/**
 * Excel, CSV and DOCX file readers for imports.
 */
(function (GL) {
  "use strict";

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
