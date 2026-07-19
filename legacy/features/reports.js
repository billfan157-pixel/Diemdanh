/**
 * Báo cáo nhanh: top lớp, yếu, thiếu điểm, tiến bộ.
 */
(function (GL) {
  "use strict";

  GL.buildQuickReport = function buildQuickReport(cls, term) {
    term = term || GL.activeTerm || "hk1";
    if (term !== "hk1" && term !== "hk2" && term !== "year") term = "hk1";

    var students = (cls.students || []).slice();
    var rows = students.map(function (st, i) {
      GL.ensureStudentTerms(st);
      var tb = GL.studentTBContext(st, cls.weights, term);
      var t1 = GL.studentTB(st, cls.weights, "hk1");
      var t2 = GL.studentTB(st, cls.weights, "hk2");
      var missing = [];
      if (term === "year") {
        // thiếu nếu thiếu TB 1 trong 2 kỳ
        if (t1 == null) missing.push("TB HK1");
        if (t2 == null) missing.push("TB HK2");
      } else {
        var bag = GL.getScores(st, term);
        GL.COLS.forEach(function (c) {
          if (!bag[c.key] || !bag[c.key].length) missing.push(c.short);
        });
      }
      var progress = null;
      if (t1 != null && t2 != null) progress = t2 - t1;
      return {
        st: st,
        i: i,
        name: GL.displayName(st),
        tb: tb,
        t1: t1,
        t2: t2,
        missing: missing,
        progress: progress,
        rank: GL.classify(tb),
      };
    });

    var withTb = rows.filter(function (r) {
      return r.tb != null;
    });
    var sorted = withTb.slice().sort(function (a, b) {
      return b.tb - a.tb;
    });

    var top5 = sorted.slice(0, 5);
    var weak = withTb
      .filter(function (r) {
        return r.tb < 5;
      })
      .sort(function (a, b) {
        return a.tb - b.tb;
      });
    var needHelp = withTb
      .filter(function (r) {
        return r.tb >= 5 && r.tb < 6.5;
      })
      .sort(function (a, b) {
        return a.tb - b.tb;
      });
    var missingList = rows
      .filter(function (r) {
        return r.missing.length > 0;
      })
      .sort(function (a, b) {
        return b.missing.length - a.missing.length;
      });
    var improved = rows
      .filter(function (r) {
        return r.progress != null && r.progress > 0;
      })
      .sort(function (a, b) {
        return b.progress - a.progress;
      })
      .slice(0, 10);
    var declined = rows
      .filter(function (r) {
        return r.progress != null && r.progress < 0;
      })
      .sort(function (a, b) {
        return a.progress - b.progress;
      })
      .slice(0, 10);

    var classAvg =
      withTb.length === 0
        ? null
        : withTb.reduce(function (s, r) {
            return s + r.tb;
          }, 0) / withTb.length;

    return {
      term: term,
      termLabel: GL.termLabel(term),
      className: cls.name,
      year: cls.year || "",
      total: students.length,
      withTb: withTb.length,
      classAvg: classAvg,
      top5: top5,
      weak: weak,
      needHelp: needHelp,
      missingList: missingList,
      improved: improved,
      declined: declined,
      formula: term === "year" ? GL.yearFormulaText() : "",
    };
  };

  function listHtml(title, items, renderItem, emptyText) {
    if (!items.length) {
      return (
        '<div class="report-section"><h4>' +
        title +
        '</h4><p class="hint" style="margin:0">— ' +
        (emptyText || "Không có") +
        "</p></div>"
      );
    }
    return (
      '<div class="report-section"><h4>' +
      title +
      " (" +
      items.length +
      ")</h4><ol class=\"report-ol\">" +
      items
        .map(function (it, idx) {
          return "<li>" + renderItem(it, idx) + "</li>";
        })
        .join("") +
      "</ol></div>"
    );
  }

  GL.renderQuickReportHtml = function renderQuickReportHtml(report) {
    var head =
      '<div class="report-head-block">' +
      "<h3>Báo cáo nhanh — " +
      GL.escapeHtml(report.className) +
      "</h3>" +
      "<p>" +
      GL.escapeHtml(report.termLabel) +
      (report.year ? " · NH " + GL.escapeHtml(report.year) : "") +
      " · " +
      report.withTb +
      "/" +
      report.total +
      " HV có TB · TB lớp: <strong>" +
      GL.fmt(report.classAvg, 2) +
      "</strong></p>" +
      (report.formula
        ? '<p class="hint" style="margin:6px 0 0">' +
          GL.escapeHtml(report.formula) +
          "</p>"
        : "") +
      "</div>";

    var body =
      listHtml(
        "🏆 Top 5 điểm cao",
        report.top5,
        function (r, i) {
          return (
            GL.escapeHtml(r.name) +
            ' — <strong class="' +
            r.rank.score +
            '">' +
            GL.fmt(r.tb, 2) +
            "</strong> · " +
            r.rank.label
          );
        },
        "Chưa đủ điểm để xếp hạng"
      ) +
      listHtml(
        "⚠️ Điểm yếu (TB &lt; 5)",
        report.weak,
        function (r) {
          return (
            GL.escapeHtml(r.name) +
            " — <strong class=\"score-y\">" +
            GL.fmt(r.tb, 2) +
            "</strong>"
          );
        },
        "Không có học viên TB &lt; 5"
      ) +
      listHtml(
        "📌 Cần kèm (5 ≤ TB &lt; 6.5)",
        report.needHelp,
        function (r) {
          return (
            GL.escapeHtml(r.name) +
            " — <strong class=\"score-tb\">" +
            GL.fmt(r.tb, 2) +
            "</strong>"
          );
        }
      ) +
      listHtml(
        "📝 Thiếu điểm / thiếu kỳ",
        report.missingList,
        function (r) {
          return (
            GL.escapeHtml(r.name) +
            " — thiếu: <em>" +
            GL.escapeHtml(r.missing.join(", ")) +
            "</em>"
          );
        },
        "Đủ điểm / đủ kỳ"
      ) +
      listHtml(
        "📈 Tiến bộ (HK2 &gt; HK1)",
        report.improved,
        function (r) {
          return (
            GL.escapeHtml(r.name) +
            " — HK1 " +
            GL.fmt(r.t1, 2) +
            " → HK2 " +
            GL.fmt(r.t2, 2) +
            ' (<span class="score-g">+' +
            GL.fmt(r.progress, 2) +
            "</span>)"
          );
        },
        "Chưa so sánh được (cần đủ 2 kỳ)"
      ) +
      listHtml(
        "📉 Tụt (HK2 &lt; HK1)",
        report.declined,
        function (r) {
          return (
            GL.escapeHtml(r.name) +
            " — HK1 " +
            GL.fmt(r.t1, 2) +
            " → HK2 " +
            GL.fmt(r.t2, 2) +
            ' (<span class="score-y">' +
            GL.fmt(r.progress, 2) +
            "</span>)"
          );
        },
        "Không có"
      );

    return head + '<div class="report-grid">' + body + "</div>";
  };

  GL.showReportsModal = function showReportsModal() {
    var cls = GL.activeClass();
    if (!cls) {
      GL.toast("Chọn lớp trước.", "err");
      return;
    }
    var termEl = document.getElementById("reportTerm");
    var term = termEl ? termEl.value : GL.activeTerm || "hk1";
    if (termEl) termEl.value = term;
    var report = GL.buildQuickReport(cls, term);
    var body = document.getElementById("reportBody");
    if (body) body.innerHTML = GL.renderQuickReportHtml(report);
    var modal = document.getElementById("reportsModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };
})(window.GL = window.GL || {});
