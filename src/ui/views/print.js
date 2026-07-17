/**
 * Bản in chính thức (A4): header/chữ ký + bảng điểm HK và cả năm.
 */
(function (GL) {
  "use strict";
  GL.formalPrintHeaderHtml = function formalPrintHeaderHtml(cls, subtitle) {
    var ps =
      typeof GL.getPrintSettings === "function" ? GL.getPrintSettings() : {};
    var today = new Date().toLocaleDateString("vi-VN");
    return (
      '<div class="formal-print-header">' +
      '<div class="formal-left">' +
      "<div>" +
      GL.escapeHtml(ps.giaoHat || "Giáo hạt …") +
      "</div>" +
      "<div><strong>" +
      GL.escapeHtml(ps.giaoXu || "Giáo xứ …") +
      "</strong></div>" +
      "</div>" +
      '<div class="formal-center">' +
      "<h3>" +
      GL.escapeHtml(ps.tieuDe || "BẢNG ĐIỂM GIÁO LÝ") +
      "</h3>" +
      (subtitle
        ? "<p><strong>" + GL.escapeHtml(subtitle) + "</strong></p>"
        : "") +
      "<p>Lớp: <strong>" +
      GL.escapeHtml(cls.name) +
      "</strong>" +
      (cls.year || ps.namHoc
        ? " · Năm học " + GL.escapeHtml(cls.year || ps.namHoc)
        : "") +
      "</p>" +
      '<p style="font-size:0.8rem;color:#64748b">Ngày in: ' +
      today +
      "</p>" +
      "</div>" +
      '<div class="formal-right"></div>' +
      "</div>"
    );
  };

  GL.formalPrintSignHtml = function formalPrintSignHtml() {
    var ps =
      typeof GL.getPrintSettings === "function" ? GL.getPrintSettings() : {};
    return (
      '<div class="formal-sign">' +
      '<div><p>Giáo lý viên</p><p class="sign-space"></p><p><strong>' +
      GL.escapeHtml(ps.glvName || "…") +
      "</strong></p></div>" +
      '<div><p>Ban Giáo lý</p><p class="sign-space"></p><p><strong>' +
      GL.escapeHtml(ps.banGLName || "Trưởng Ban Giáo lý") +
      "</strong></p></div>" +
      "</div>" +
      (ps.footerNote
        ? '<p class="hint" style="margin-top:12px;text-align:center">' +
          GL.escapeHtml(ps.footerNote) +
          "</p>"
        : "")
    );
  };

  GL.renderViewPrint = function renderViewPrint(cls, list) {
    var rows = list
      .map(function (item) {
        var st = item.s;
        var i = item.i;
        var tb = GL.studentTB(st, cls.weights);
        var cl = GL.classify(tb);
        var cells = GL.COLS.map(function (col) {
          var avg = GL.colAvg(GL.getScores(st)[col.key]);
          return "<td>" + (avg == null ? "—" : GL.fmt(avg, 1)) + "</td>";
        }).join("");
        var nameTds = GL.NAME_FIELDS.map(function (nf) {
          var val = st[nf.key] || "";
          if (
            !val &&
            nf.key === "hoDem" &&
            !st.tenThanh &&
            !st.ten &&
            st.name
          ) {
            val = st.name;
          }
          return (
            '<td class="name-col" style="text-align:left;font-weight:600">' +
            GL.escapeHtml(val || "—") +
            "</td>"
          );
        }).join("");
        return (
          "<tr><td>" +
          (i + 1) +
          "</td>" +
          nameTds +
          cells +
          '<td style="font-weight:800">' +
          GL.fmt(tb, 2) +
          "</td><td>" +
          (tb == null ? "—" : cl.label) +
          '</td><td class="name-col" style="text-align:left;font-size:0.82rem">' +
          GL.escapeHtml(st.ghiChu || "—") +
          "</td></tr>"
        );
      })
      .join("");

    return (
      '<div class="report-sheet" id="reportSheet">' +
      '<div class="report-actions">' +
      '<button type="button" class="btn btn-primary" id="printBtn">🖨️ In trang này</button>' +
      '<button type="button" class="btn btn-ghost" id="openPrintSettingsBtn" title="Mở Mời họp PH → chỉnh mẫu in">⚙️ Mẫu in</button>' +
      '<button type="button" class="btn btn-ghost" id="goCardsFromPrint">✏️ Về nhập điểm</button>' +
      "</div>" +
      GL.formalPrintHeaderHtml(cls, GL.termLabel(GL.activeTerm)) +
      '<p class="hint" style="margin:8px 0 12px;text-align:center">Hệ số: ' +
      GL.COLS.map(function (c) {
        return c.short + "×" + cls.weights[c.key];
      }).join(" · ") +
      " · Tổng: " +
      list.length +
      " HV</p>" +
      '<div class="table-wrap"><table class="score-table"><thead><tr>' +
      "<th>STT</th>" +
      GL.NAME_FIELDS.map(function (nf) {
        return '<th class="name-col">' + nf.label + "</th>";
      }).join("") +
      GL.COLS.map(function (c) {
        return "<th>" + c.label + "</th>";
      }).join("") +
      "<th>TB</th><th>Xếp loại</th><th>Ghi chú</th></tr></thead><tbody>" +
      rows +
      "</tbody></table></div>" +
      GL.formalPrintSignHtml() +
      "</div>"
    );
  };

  /** Shared helper: compute year ranking for a class list */
  GL.renderViewPrintYear = function renderViewPrintYear(cls, list) {
    var yearData = GL.getYearRanked(cls, list);
    var ranked = yearData.ranked;

    var rows = ranked
      .map(function (r, idx) {
        var nameTds = GL.NAME_FIELDS.map(function (nf) {
          var val = r.st[nf.key] || "";
          if (
            !val &&
            nf.key === "hoDem" &&
            !r.st.tenThanh &&
            !r.st.ten &&
            r.st.name
          ) {
            val = r.st.name;
          }
          return (
            '<td class="name-col" style="text-align:left;font-weight:600">' +
            GL.escapeHtml(val || "—") +
            "</td>"
          );
        }).join("");
        return (
          "<tr><td>" +
          (idx + 1) +
          "</td>" +
          nameTds +
          "<td>" +
          GL.fmt(r.t1, 2) +
          "</td><td>" +
          (r.t1 == null ? "—" : GL.classify(r.t1).label) +
          "</td><td>" +
          GL.fmt(r.t2, 2) +
          "</td><td>" +
          (r.t2 == null ? "—" : GL.classify(r.t2).label) +
          '</td><td style="font-weight:800">' +
          GL.fmt(r.ty, 2) +
          "</td><td>" +
          (r.ty == null ? "—" : GL.classify(r.ty).label) +
          "</td></tr>"
        );
      })
      .join("");

    return (
      '<div class="report-sheet" id="reportSheet">' +
      '<div class="report-actions">' +
      '<button type="button" class="btn btn-primary" id="printBtn">🖨️ In trang này</button>' +
      '<button type="button" class="btn btn-ghost" id="openPrintSettingsBtn" title="Mở Mời họp PH → chỉnh mẫu in">⚙️ Mẫu in</button>' +
      "</div>" +
      GL.formalPrintHeaderHtml(cls, "TỔNG ĐIỂM CẢ NĂM") +
      '<p class="hint" style="margin:8px 0 12px;text-align:center">' +
      GL.escapeHtml(GL.yearFormulaText()) +
      " · " +
      list.length +
      " HV</p>" +
      '<div class="table-wrap"><table class="score-table"><thead><tr>' +
      "<th>Hạng</th>" +
      GL.NAME_FIELDS.map(function (nf) {
        return '<th class="name-col">' + nf.label + "</th>";
      }).join("") +
      "<th>TB HK1</th><th>XL HK1</th><th>TB HK2</th><th>XL HK2</th>" +
      "<th>TB cả năm</th><th>Xếp loại</th></tr></thead><tbody>" +
      rows +
      "</tbody></table></div>" +
      GL.formalPrintSignHtml() +
      "</div>"
    );
  };
})((window.GL = window.GL || {}));
