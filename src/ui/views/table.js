/**
 * Kiểu hiển thị bảng, xếp hạng, thiếu điểm, thống kê.
 */
(function (GL) {
  "use strict";
  GL.renderViewTable = function renderViewTable(cls, list) {
    var head =
      '<tr><th style="width:40px">STT</th>' +
      GL.NAME_FIELDS.map(function (nf) {
        return '<th class="name-col">' + nf.label + "</th>";
      }).join("") +
      GL.COLS.map(function (c) {
        return (
          '<th title="Hệ số ' +
          cls.weights[c.key] +
          '">' +
          c.short +
          '<br><span style="font-weight:500;text-transform:none;font-size:0.65rem;opacity:0.8">×' +
          cls.weights[c.key] +
          "</span></th>"
        );
      }).join("") +
      "<th>TB</th><th>Xếp loại</th><th>Ghi chú</th></tr>";

    var body = list
      .map(function (item) {
        var st = item.s;
        var i = item.i;
        var tb = GL.studentTB(st, cls.weights);
        var cl = GL.classify(tb);
        var nameCells = GL.NAME_FIELDS.map(function (nf) {
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
            '<td class="name-col"><input class="cell-score" style="width:100%;min-width:72px;text-align:left;font-weight:650" type="text" value="' +
            GL.escapeHtml(val) +
            '" data-name-field="' +
            nf.key +
            '" data-sid="' +
            st.id +
            '" placeholder="' +
            GL.escapeHtml(nf.short) +
            '" /></td>'
          );
        }).join("");
        var cells = GL.COLS.map(function (col) {
          var scores = GL.getScores(st)[col.key] || [];
          var avg = GL.colAvg(scores);
          var display = avg == null ? "" : GL.fmt(avg, 2);
          var multi =
            scores.length > 1
              ? ' title="' + scores.map(GL.fmt).join("; ") + '"'
              : "";
          return (
            '<td><input class="cell-score" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" value="' +
            display +
            '" placeholder="—" data-table-score data-sid="' +
            st.id +
            '" data-col="' +
            col.key +
            '"' +
            multi +
            " /></td>"
          );
        }).join("");
        return (
          '<tr data-id="' +
          st.id +
          '"><td>' +
          (i + 1) +
          "</td>" +
          nameCells +
          cells +
          '<td class="tb-cell ' +
          cl.score +
          '">' +
          GL.fmt(tb, 2) +
          '</td><td><span class="rank-pill ' +
          cl.rank +
          '">' +
          cl.label +
          "</span></td>" +
          '<td class="name-col"><input class="cell-score" style="width:100%;min-width:100px;text-align:left;font-weight:500" type="text" value="' +
          GL.escapeHtml(st.ghiChu || "") +
          '" data-note data-sid="' +
          st.id +
          '" placeholder="Ghi chú…" /></td></tr>'
        );
      })
      .join("");

    return (
      '<div class="table-wrap"><table class="score-table"><thead>' +
      head +
      "</thead><tbody>" +
      body +
      "</tbody></table></div>" +
      '<p class="hint">Gõ điểm vào ô → Enter hoặc rời ô để lưu. Ô có nhiều lần điểm sẽ thay bằng 1 điểm mới (dùng chế độ Nhập điểm để giữ nhiều lần).</p>'
    );
  };

  GL.renderViewRank = function renderViewRank(cls, list) {
    var ranked = list
      .map(function (item) {
        return {
          s: item.s,
          i: item.i,
          tb: GL.studentTBContext(item.s, cls.weights, GL.activeTerm),
        };
      })
      .sort(function (a, b) {
        if (a.tb == null && b.tb == null) return 0;
        if (a.tb == null) return 1;
        if (b.tb == null) return -1;
        return b.tb - a.tb;
      });

    var withTb = ranked.filter(function (r) {
      return r.tb != null;
    });
    var top3 = withTb.slice(0, 3);
    var medals = ["🥇", "🥈", "🥉"];
    var podiumClass = ["gold", "silver", "bronze"];
    var podium = "";

    if (top3.length) {
      var order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
      var orderIdx =
        top3.length >= 3
          ? [1, 0, 2]
          : top3.map(function (_, i) {
              return i;
            });
      podium =
        '<div class="rank-podium">' +
        order
          .map(function (r, j) {
            var place = orderIdx[j];
            var cl = GL.classify(r.tb);
            return (
              '<div class="podium-card ' +
              (podiumClass[place] || "") +
              '"><div class="podium-place">' +
              (medals[place] || place + 1) +
              '</div><div class="podium-name">' +
              GL.escapeHtml(GL.displayName(r.s)) +
              '</div><div class="podium-tb ' +
              cl.score +
              '">' +
              GL.fmt(r.tb, 2) +
              '</div><div style="margin-top:6px"><span class="tb-rank ' +
              cl.rank +
              '">' +
              cl.label +
              "</span></div></div>"
            );
          })
          .join("") +
        "</div>";
    }

    var rows = ranked
      .map(function (r, idx) {
        var cl = GL.classify(r.tb);
        var isTop = idx < 3 && r.tb != null;
        var full = GL.displayName(r.s);
        return (
          '<div class="rank-row ' +
          (isTop ? "top" : "") +
          '"><div class="place">' +
          (idx + 1) +
          '</div><div class="r-name" title="' +
          GL.escapeHtml(full) +
          '">' +
          GL.escapeHtml(full) +
          '</div><div class="r-tb ' +
          cl.score +
          '">' +
          GL.fmt(r.tb, 2) +
          '</div><span class="tb-rank ' +
          cl.rank +
          '">' +
          cl.label +
          "</span></div>"
        );
      })
      .join("");

    return podium + '<div class="rank-list">' + rows + "</div>";
  };

  GL.renderViewMissing = function renderViewMissing(cls, list) {
    var missCounts = {};
    GL.COLS.forEach(function (c) {
      missCounts[c.key] = 0;
    });
    var complete = 0;
    var incomplete = 0;

    var items = list.map(function (item) {
      var st = item.s;
      var i = item.i;
      var missing = GL.COLS.filter(function (c) {
        var bag = GL.getScores(st);
        return !(bag[c.key] && bag[c.key].length);
      });
      missing.forEach(function (c) {
        missCounts[c.key]++;
      });
      if (missing.length === 0) complete++;
      else incomplete++;
      return { st: st, i: i, missing: missing };
    });

    items.sort(function (a, b) {
      return b.missing.length - a.missing.length;
    });

    var sortedCards = items
      .map(function (it) {
        var tb = GL.studentTB(it.st, cls.weights);
        var cl = GL.classify(tb);
        var tags =
          it.missing.length === 0
            ? '<span class="ok-tag">Đủ tất cả cột</span>'
            : it.missing
                .map(function (c) {
                  return '<span class="miss-tag">' + c.label + "</span>";
                })
                .join("");
        return (
          '<div class="missing-card ' +
          (it.missing.length ? "has-miss" : "") +
          '"><div class="missing-head">' +
          '<span class="m-name">' +
          (it.i + 1) +
          ". " +
          GL.escapeHtml(GL.displayName(it.st)) +
          '</span><span class="tb-rank ' +
          cl.rank +
          '">TB ' +
          GL.fmt(tb, 2) +
          " · " +
          cl.label +
          '</span></div><div class="miss-tags">' +
          tags +
          "</div></div>"
        );
      })
      .join("");

    var summary =
      '<div class="missing-summary">' +
      '<div class="miss-stat"><div class="n" style="color:var(--danger)">' +
      incomplete +
      '</div><div class="l">Còn thiếu</div></div>' +
      '<div class="miss-stat"><div class="n" style="color:var(--success)">' +
      complete +
      '</div><div class="l">Đủ điểm</div></div>' +
      GL.COLS.map(function (c) {
        return (
          '<div class="miss-stat"><div class="n" style="color:' +
          (missCounts[c.key] ? "var(--danger)" : "var(--success)") +
          '">' +
          missCounts[c.key] +
          '</div><div class="l">Thiếu ' +
          c.short +
          "</div></div>"
        );
      }).join("") +
      "</div>";

    return summary + sortedCards;
  };

  GL.renderViewStats = function renderViewStats(cls) {
    var students = cls.students;
    var tbs = students.map(function (s) {
      return GL.studentTB(s, cls.weights);
    });
    var withTb = tbs.filter(function (x) {
      return x != null;
    });
    var buckets = [
      { key: "xs", label: "Xuất sắc (≥9)", color: "#16a34a", min: 9, max: 11 },
      { key: "g", label: "Giỏi (8–9)", color: "#2563eb", min: 8, max: 9 },
      { key: "k", label: "Khá (6.5–8)", color: "#7c3aed", min: 6.5, max: 8 },
      { key: "tb", label: "TB (5–6.5)", color: "#d97706", min: 5, max: 6.5 },
      { key: "y", label: "Yếu (<5)", color: "#dc2626", min: 0, max: 5 },
      { key: "na", label: "Chưa có TB", color: "#94a3b8" },
    ];
    var counts = buckets.map(function (b) {
      if (b.key === "na") {
        return tbs.filter(function (x) {
          return x == null;
        }).length;
      }
      return tbs.filter(function (x) {
        return x != null && x >= b.min && x < b.max;
      }).length;
    });
    var maxC = Math.max.apply(null, counts.concat([1]));
    var classAvg = withTb.length
      ? withTb.reduce(function (a, b) {
          return a + b;
        }, 0) / withTb.length
      : null;
    var maxTb = withTb.length ? Math.max.apply(null, withTb) : null;
    var minTb = withTb.length ? Math.min.apply(null, withTb) : null;

    var bars = buckets
      .map(function (b, i) {
        var n = counts[i];
        var pct = (n / maxC) * 100;
        return (
          '<div class="bar-row"><div class="bl">' +
          b.label +
          '</div><div class="bar-track"><div class="bar-fill" style="width:' +
          pct +
          "%;background:" +
          b.color +
          '"></div></div><div class="bn">' +
          n +
          "</div></div>"
        );
      })
      .join("");

    var colAvgs = GL.COLS.map(function (col) {
      var avgs = students
        .map(function (s) {
          return GL.colAvg(GL.getScores(s)[col.key]);
        })
        .filter(function (x) {
          return x != null;
        });
      var avg = avgs.length
        ? avgs.reduce(function (a, b) {
            return a + b;
          }, 0) / avgs.length
        : null;
      var filled = avgs.length;
      var scoreClass =
        avg == null
          ? "score-none"
          : avg >= 8
            ? "score-g"
            : avg >= 6.5
              ? "score-k"
              : avg >= 5
                ? "score-tb"
                : "score-y";
      return (
        '<div class="col-avg-row"><span class="ca-label">' +
        col.label +
        ' <span style="color:var(--muted);font-weight:500">(' +
        filled +
        "/" +
        students.length +
        ')</span></span><span class="ca-val ' +
        scoreClass +
        '">' +
        GL.fmt(avg, 2) +
        "</span></div>"
      );
    }).join("");

    return (
      '<div class="stats-grid"><div class="stats-panel"><h4>Phân bố xếp loại (theo TB)</h4>' +
      bars +
      '<div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">' +
      '<div><div style="font-size:0.72rem;color:var(--muted);font-weight:600">TB lớp</div><div style="font-weight:800;font-size:1.2rem;color:var(--gold)">' +
      GL.fmt(classAvg, 2) +
      "</div></div>" +
      '<div><div style="font-size:0.72rem;color:var(--muted);font-weight:600">Cao nhất</div><div style="font-weight:800;font-size:1.2rem;color:var(--success)">' +
      GL.fmt(maxTb, 2) +
      "</div></div>" +
      '<div><div style="font-size:0.72rem;color:var(--muted);font-weight:600">Thấp nhất</div><div style="font-weight:800;font-size:1.2rem;color:var(--danger)">' +
      GL.fmt(minTb, 2) +
      "</div></div></div></div>" +
      '<div class="stats-panel"><h4>Trung bình từng cột điểm</h4>' +
      colAvgs +
      "</div></div>"
    );
  };
})((window.GL = window.GL || {}));
