/**
 * Tổng điểm cả năm: xếp hạng + bảng/thẻ cả năm.
 */
(function (GL) {
  "use strict";
  GL.getYearRanked = function getYearRanked(cls, list) {
    var w1 = (GL.YEAR_WEIGHTS && GL.YEAR_WEIGHTS.hk1) || 1;
    var w2 = (GL.YEAR_WEIGHTS && GL.YEAR_WEIGHTS.hk2) || 2;
    var ranked = list
      .map(function (item) {
        var st = item.s;
        var t1 = GL.studentTB(st, cls.weights, "hk1");
        var t2 = GL.studentTB(st, cls.weights, "hk2");
        var ty = GL.studentYearTB(st, cls.weights);
        return { st: st, i: item.i, t1: t1, t2: t2, ty: ty };
      })
      .sort(function (a, b) {
        if (a.ty == null && b.ty == null) return 0;
        if (a.ty == null) return 1;
        if (b.ty == null) return -1;
        return b.ty - a.ty;
      });
    return { ranked: ranked, w1: w1, w2: w2 };
  };

  /** Bảng tổng điểm cả năm (+ thẻ mobile) */
  GL.renderViewYear = function renderViewYear(cls, list) {
    var yearData = GL.getYearRanked(cls, list);
    var ranked = yearData.ranked;
    var w1 = yearData.w1;
    var w2 = yearData.w2;

    var withY = ranked.filter(function (r) {
      return r.ty != null;
    });
    var classAvg = withY.length
      ? withY.reduce(function (s, r) {
          return s + r.ty;
        }, 0) / withY.length
      : null;
    var both = ranked.filter(function (r) {
      return r.t1 != null && r.t2 != null;
    }).length;
    var only1 = ranked.filter(function (r) {
      return r.t1 != null && r.t2 == null;
    }).length;
    var only2 = ranked.filter(function (r) {
      return r.t1 == null && r.t2 != null;
    }).length;
    var none = ranked.filter(function (r) {
      return r.t1 == null && r.t2 == null;
    }).length;
    var partial = only1 + only2;
    var classCl = GL.classify(classAvg);

    function yearNameBlock(st) {
      var tenThanh = String(st.tenThanh || "").trim();
      var hoTenParts = [st.hoDem, st.ten]
        .map(function (x) {
          return String(x || "").trim();
        })
        .filter(Boolean);
      var hoTenLine = hoTenParts.join(" ");
      if (!tenThanh && !hoTenLine && st.name) {
        hoTenLine = String(st.name).trim();
      }
      if (!tenThanh && !hoTenLine) {
        return '<span class="yc-ho-ten">—</span>';
      }
      return (
        (tenThanh
          ? '<span class="yc-ten-thanh">' + GL.escapeHtml(tenThanh) + "</span>"
          : "") +
        (hoTenLine
          ? '<span class="yc-ho-ten">' + GL.escapeHtml(hoTenLine) + "</span>"
          : "")
      );
    }

    function rankPill(cl, opts) {
      opts = opts || {};
      if (cl.rank === "rank-none") {
        return opts.emptyDash
          ? '<span class="year-term-empty">—</span>'
          : '<span class="rank-pill rank-none">Chưa</span>';
      }
      var label = cl.label;
      // Trên thẻ: rút gọn nhãn dài để không tràn
      if (label === "Trung bình") label = "TB";
      if (opts.short && label === "Xuất sắc") label = "XS";
      return (
        '<span class="rank-pill ' +
        cl.rank +
        '">' +
        GL.escapeHtml(label) +
        "</span>"
      );
    }

    // ── Tóm tắt gọn: TB lớp + chips phủ điểm ──
    var chips = "";
    chips +=
      '<span class="year-chip year-chip-ok"><strong>' +
      both +
      "</strong> đủ 2 HK</span>";
    if (partial > 0) {
      chips +=
        '<span class="year-chip year-chip-warn"><strong>' +
        partial +
        "</strong> thiếu 1 HK</span>";
    }
    if (none > 0) {
      chips +=
        '<span class="year-chip year-chip-bad"><strong>' +
        none +
        "</strong> chưa điểm</span>";
    }
    if (only1 > 0 || only2 > 0) {
      var detail = [];
      if (only1) detail.push("HK1: " + only1);
      if (only2) detail.push("HK2: " + only2);
      chips +=
        '<span class="year-chip year-chip-muted">' +
        detail.join(" · ") +
        "</span>";
    }

    var summary =
      '<div class="year-hero">' +
      '<div class="year-hero-score">' +
      '<div class="year-hero-n ' +
      classCl.score +
      '">' +
      GL.fmt(classAvg, 2) +
      "</div>" +
      '<div class="year-hero-meta">' +
      '<div class="year-hero-label">TB lớp cả năm</div>' +
      '<div class="year-hero-sub">' +
      withY.length +
      "/" +
      ranked.length +
      " HV có điểm · " +
      rankPill(classCl) +
      "</div></div></div>" +
      '<div class="year-chips">' +
      chips +
      "</div></div>" +
      // Desktop vẫn có lưới 5 ô (ẩn trên mobile)
      '<div class="year-summary-bar year-summary-desktop">' +
      '<div class="year-sum-card year-sum-main"><div class="n">' +
      GL.fmt(classAvg, 2) +
      '</div><div class="l">TB cả năm (lớp)</div></div>' +
      '<div class="year-sum-card"><div class="n ok">' +
      both +
      '</div><div class="l">Đủ 2 HK</div></div>' +
      '<div class="year-sum-card"><div class="n warn">' +
      only1 +
      '</div><div class="l">Chỉ HK1</div></div>' +
      '<div class="year-sum-card"><div class="n warn">' +
      only2 +
      '</div><div class="l">Chỉ HK2</div></div>' +
      '<div class="year-sum-card"><div class="n bad">' +
      none +
      '</div><div class="l">Chưa có điểm</div></div>' +
      "</div>" +
      '<details class="year-formula-details">' +
      "<summary>Công thức TB năm (HK1×" +
      w1 +
      " · HK2×" +
      w2 +
      ")</summary>" +
      '<p class="year-formula-body">' +
      GL.escapeHtml(GL.yearFormulaText()) +
      "</p></details>";

    var head =
      "<tr>" +
      '<th style="width:44px">Hạng</th>' +
      '<th style="width:40px">STT</th>' +
      GL.NAME_FIELDS.map(function (nf) {
        return '<th class="name-col">' + nf.label + "</th>";
      }).join("") +
      "<th>TB HK1</th><th>XL HK1</th>" +
      "<th>TB HK2</th><th>XL HK2</th>" +
      "<th>TB cả năm</th><th>Xếp loại năm</th>" +
      "<th>Ghi chú</th></tr>";

    var isMobile =
      window.matchMedia && window.matchMedia("(max-width: 900px)").matches;

    var body = !isMobile
      ? ranked
          .map(function (r, rankIdx) {
            var c1 = GL.classify(r.t1);
            var c2 = GL.classify(r.t2);
            var cy = GL.classify(r.ty);
            var nameCells = GL.NAME_FIELDS.map(function (nf) {
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
                '<td class="name-col" style="text-align:left;font-weight:650">' +
                GL.escapeHtml(val || "—") +
                "</td>"
              );
            }).join("");
            var medal =
              rankIdx === 0 && r.ty != null
                ? "🥇"
                : rankIdx === 1 && r.ty != null
                  ? "🥈"
                  : rankIdx === 2 && r.ty != null
                    ? "🥉"
                    : String(rankIdx + 1);
            return (
              "<tr>" +
              '<td class="tb-cell">' +
              medal +
              "</td><td>" +
              (r.i + 1) +
              "</td>" +
              nameCells +
              '<td class="tb-cell ' +
              c1.score +
              '">' +
              GL.fmt(r.t1, 2) +
              '</td><td><span class="rank-pill ' +
              c1.rank +
              '">' +
              c1.label +
              "</span></td>" +
              '<td class="tb-cell ' +
              c2.score +
              '">' +
              GL.fmt(r.t2, 2) +
              '</td><td><span class="rank-pill ' +
              c2.rank +
              '">' +
              c2.label +
              "</span></td>" +
              '<td class="tb-cell ' +
              cy.score +
              '" style="font-size:1.05rem">' +
              GL.fmt(r.ty, 2) +
              '</td><td><span class="rank-pill ' +
              cy.rank +
              '">' +
              cy.label +
              "</span></td>" +
              '<td class="name-col" style="text-align:left;font-size:0.82rem">' +
              GL.escapeHtml(r.st.ghiChu || "—") +
              "</td></tr>"
            );
          })
          .join("")
      : "";

    // Thẻ mobile: 1 HV / card — gọn, rõ hạng, so sánh 2 HK
    var cards = isMobile
      ? ranked
          .map(function (r, rankIdx) {
            var c1 = GL.classify(r.t1);
            var c2 = GL.classify(r.t2);
            var cy = GL.classify(r.ty);
            var isTop = r.ty != null && rankIdx < 3;
            var topClass =
              isTop && rankIdx === 0
                ? " year-card--gold"
                : isTop && rankIdx === 1
                  ? " year-card--silver"
                  : isTop && rankIdx === 2
                    ? " year-card--bronze"
                    : "";
            var medal =
              rankIdx === 0 && r.ty != null
                ? "🥇"
                : rankIdx === 1 && r.ty != null
                  ? "🥈"
                  : rankIdx === 2 && r.ty != null
                    ? "🥉"
                    : String(rankIdx + 1);
            var note = r.st.ghiChu ? String(r.st.ghiChu).trim() : "";
            var fullName =
              typeof GL.displayName === "function"
                ? GL.displayName(r.st)
                : r.st.name || "—";
            return (
              '<article class="year-card' +
              topClass +
              '" data-rank="' +
              (rankIdx + 1) +
              '">' +
              '<div class="year-card-top">' +
              '<span class="year-card-rank' +
              (isTop ? " is-medal" : "") +
              '" aria-label="Hạng ' +
              (rankIdx + 1) +
              '">' +
              medal +
              "</span>" +
              '<div class="year-card-who">' +
              '<div class="year-card-name" title="' +
              GL.escapeHtml(fullName) +
              '">' +
              yearNameBlock(r.st) +
              "</div>" +
              '<div class="year-card-stt">STT ' +
              (r.i + 1) +
              "</div></div>" +
              '<div class="year-card-year">' +
              '<div class="year-card-ty ' +
              cy.score +
              '">' +
              GL.fmt(r.ty, 2) +
              "</div>" +
              rankPill(cy) +
              "</div></div>" +
              '<div class="year-card-terms">' +
              '<div class="year-term' +
              (r.t1 == null ? " is-empty" : "") +
              '">' +
              '<span class="year-term-l">HK1 <em>×' +
              w1 +
              "</em></span>" +
              '<span class="year-term-v ' +
              c1.score +
              '">' +
              GL.fmt(r.t1, 2) +
              "</span>" +
              rankPill(c1, { emptyDash: true, short: true }) +
              "</div>" +
              '<div class="year-term' +
              (r.t2 == null ? " is-empty" : "") +
              '">' +
              '<span class="year-term-l">HK2 <em>×' +
              w2 +
              "</em></span>" +
              '<span class="year-term-v ' +
              c2.score +
              '">' +
              GL.fmt(r.t2, 2) +
              "</span>" +
              rankPill(c2, { emptyDash: true, short: true }) +
              "</div></div>" +
              (note
                ? '<div class="year-card-note">' +
                  GL.escapeHtml(note) +
                  "</div>"
                : "") +
              "</article>"
            );
          })
          .join("")
      : "";

    isMobile =
      window.matchMedia && window.matchMedia("(max-width: 900px)").matches;

    body = !isMobile
      ? ranked
          .map(function (r, rankIdx) {
            var c1 = GL.classify(r.t1);
            var c2 = GL.classify(r.t2);
            var cy = GL.classify(r.ty);
            var nameCells = GL.NAME_FIELDS.map(function (nf) {
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
                '<td class="name-col" style="text-align:left;font-weight:650">' +
                GL.escapeHtml(val || "—") +
                "</td>"
              );
            }).join("");
            var medal =
              rankIdx === 0 && r.ty != null
                ? "🥇"
                : rankIdx === 1 && r.ty != null
                  ? "🥈"
                  : rankIdx === 2 && r.ty != null
                    ? "🥉"
                    : String(rankIdx + 1);
            return (
              "<tr>" +
              '<td class="tb-cell">' +
              medal +
              "</td><td>" +
              (r.i + 1) +
              "</td>" +
              nameCells +
              '<td class="tb-cell ' +
              c1.score +
              '">' +
              GL.fmt(r.t1, 2) +
              '</td><td><span class="rank-pill ' +
              c1.rank +
              '">' +
              c1.label +
              "</span></td>" +
              '<td class="tb-cell ' +
              c2.score +
              '">' +
              GL.fmt(r.t2, 2) +
              '</td><td><span class="rank-pill ' +
              c2.rank +
              '">' +
              c2.label +
              "</span></td>" +
              '<td class="tb-cell ' +
              cy.score +
              '" style="font-size:1.05rem">' +
              GL.fmt(r.ty, 2) +
              '</td><td><span class="rank-pill ' +
              cy.rank +
              '">' +
              cy.label +
              "</span></td>" +
              '<td class="name-col" style="text-align:left;font-size:0.82rem">' +
              GL.escapeHtml(r.st.ghiChu || "—") +
              "</td></tr>"
            );
          })
          .join("")
      : "";

    // Thẻ mobile: 1 HV / card — gọn, rõ hạng, so sánh 2 HK
    cards = isMobile
      ? ranked
          .map(function (r, rankIdx) {
            var c1 = GL.classify(r.t1);
            var c2 = GL.classify(r.t2);
            var cy = GL.classify(r.ty);
            var isTop = r.ty != null && rankIdx < 3;
            var topClass =
              isTop && rankIdx === 0
                ? " year-card--gold"
                : isTop && rankIdx === 1
                  ? " year-card--silver"
                  : isTop && rankIdx === 2
                    ? " year-card--bronze"
                    : "";
            var medal =
              isTop && rankIdx === 0
                ? "🥇"
                : isTop && rankIdx === 1
                  ? "🥈"
                  : isTop && rankIdx === 2
                    ? "🥉"
                    : String(rankIdx + 1);
            var note = r.st.ghiChu || "";
            return (
              '<article class="year-card' +
              topClass +
              '" data-st-id="' +
              r.st.id +
              '">' +
              '<div class="year-card-top">' +
              '<div class="year-card-rank">' +
              medal +
              "</div>" +
              '<div class="year-card-name">' +
              '<div class="yc-ten-thanh">' +
              GL.escapeHtml(r.st.tenThanh || "") +
              "</div>" +
              '<div class="yc-ho-ten">' +
              GL.escapeHtml(r.st.hoDem + " " + r.st.ten || "") +
              "</div>" +
              '<div class="yc-stt">STT ' +
              (r.i + 1) +
              "</div></div></div>" +
              '<div class="year-card-year' +
              (r.ty == null ? " is-empty" : "") +
              '">' +
              '<div class="year-term' +
              (r.t1 == null ? " is-empty" : "") +
              '">' +
              '<span class="year-term-l">HK1 <em>×' +
              w1 +
              "</em></span>" +
              '<span class="year-term-v ' +
              c1.score +
              '">' +
              GL.fmt(r.t1, 2) +
              "</span>" +
              rankPill(c1, { emptyDash: true, short: true }) +
              "</div>" +
              '<div class="year-term' +
              (r.t2 == null ? " is-empty" : "") +
              '">' +
              '<span class="year-term-l">HK2 <em>×' +
              w2 +
              "</em></span>" +
              '<span class="year-term-v ' +
              c2.score +
              '">' +
              GL.fmt(r.t2, 2) +
              "</span>" +
              rankPill(c2, { emptyDash: true, short: true }) +
              "</div></div>" +
              (note
                ? '<div class="year-card-note">' +
                  GL.escapeHtml(note) +
                  "</div>"
                : "") +
              "</article>"
            );
          })
          .join("")
      : "";

    return (
      '<div class="year-board">' +
      summary +
      '<div class="year-list-head">' +
      "<strong>Xếp hạng cả năm</strong>" +
      "<span>" +
      ranked.length +
      " học viên</span></div>" +
      '<div class="year-cards">' +
      (cards || '<div class="empty"><strong>Chưa có học viên</strong></div>') +
      "</div>" +
      '<div class="table-wrap year-table-wrap"><table class="score-table year-table">' +
      "<thead>" +
      head +
      "</thead><tbody>" +
      body +
      "</tbody></table></div>" +
      '<div class="year-actions report-actions">' +
      '<button type="button" class="btn btn-primary" id="printYearBtn">🖨️ In</button>' +
      '<button type="button" class="btn btn-success" id="exportYearBtn">📥 Excel</button>' +
      "</div></div>"
    );
  };
})((window.GL = window.GL || {}));
