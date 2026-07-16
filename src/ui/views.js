/**
 * Các kiểu hiển thị điểm: cards, table, rank, missing, stats, print.
 */
(function (GL) {
  "use strict";

  GL.renderViewCards = function renderViewCards(cls, list) {
    // header legend một lần
    var legend =
      '<div class="se-legend" aria-hidden="true">' +
      '<span class="se-leg-stt">#</span>' +
      '<span class="se-leg-name">Học viên</span>' +
      GL.COLS.map(function (c) {
        return (
          '<span class="se-leg-col" title="' +
          GL.escapeHtml(c.label) +
          " ×" +
          cls.weights[c.key] +
          '">' +
          GL.escapeHtml(c.short) +
          "<small>×" +
          cls.weights[c.key] +
          "</small></span>"
        );
      }).join("") +
      '<span class="se-leg-tb">TB</span></div>';

    return (
      '<div class="score-entry">' +
      legend +
      list
        .map(function (item) {
          var st = item.s;
          var i = item.i;
          var tb = GL.studentTB(st, cls.weights);
          var cl = GL.classify(tb);
          var filledCols = 0;

          var colsHtml = GL.COLS.map(function (col) {
            var scores = GL.getScores(st)[col.key] || [];
            if (scores.length) filledCols++;
            var empty = !scores.length;
            var chips = scores
              .map(function (sc, idx) {
                return (
                  '<span class="chip">' +
                  GL.fmt(sc) +
                  '<button type="button" title="Xóa" aria-label="Xóa" data-del-score data-sid="' +
                  st.id +
                  '" data-col="' +
                  col.key +
                  '" data-idx="' +
                  idx +
                  '">×</button></span>'
                );
              })
              .join("");
            return (
              '<div class="se-cell' +
              (empty ? " is-empty" : "") +
              '" data-col-key="' +
              col.key +
              '">' +
              '<div class="se-cell-top">' +
              '<span class="se-cell-label">' +
              GL.escapeHtml(col.short) +
              "</span>" +
              (!empty
                ? '<span class="se-cell-val ' +
                  (scores.length > 1 ? "is-avg" : "") +
                  '">' +
                  (scores.length > 1
                    ? GL.fmt(GL.colAvg(scores), 2)
                    : GL.fmt(scores[0], 2)) +
                  "</span>"
                : '<span class="se-cell-val is-miss">—</span>') +
              "</div>" +
              (scores.length
                ? '<div class="chips se-chips">' + chips + "</div>"
                : "") +
              '<div class="add-score">' +
              '<input type="number" min="0" max="10" step="0.25" placeholder="0–10" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-score-input data-sid="' +
              st.id +
              '" data-col="' +
              col.key +
              '" aria-label="' +
              GL.escapeHtml(col.label) +
              '" />' +
              '<button type="button" data-add-score data-sid="' +
              st.id +
              '" data-col="' +
              col.key +
              '" title="Thêm" aria-label="Thêm">+</button></div></div>'
            );
          }).join("");

          var nameFields = GL.NAME_FIELDS.map(function (nf) {
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
              '<div class="nf-cell">' +
              '<span class="nf-label">' +
              nf.short +
              "</span>" +
              '<input type="text" value="' +
              GL.escapeHtml(val) +
              '" data-name-field="' +
              nf.key +
              '" data-sid="' +
              st.id +
              '" placeholder="' +
              GL.escapeHtml(nf.placeholder) +
              '" aria-label="' +
              nf.label +
              '" /></div>'
            );
          }).join("");

          var att =
            typeof GL.studentAttention === "function"
              ? GL.studentAttention(st, cls, GL.activeTerm || "hk1")
              : { level: "none" };
          var attHtml =
            typeof GL.attentionBadgeHtml === "function"
              ? GL.attentionBadgeHtml(att)
              : "";
          var summary = GL.infoSummary(st);
          var display = GL.displayName(st);
          var tenThanh = String(st.tenThanh || "").trim();
          var hoTenParts = [st.hoDem, st.ten]
            .map(function (x) {
              return String(x || "").trim();
            })
            .filter(Boolean);
          var hoTenLine = hoTenParts.join(" ");
          // Fallback: dữ liệu cũ chỉ có name
          if (!tenThanh && !hoTenLine && st.name) {
            hoTenLine = String(st.name).trim();
          }
          var nameHtml;
          if (tenThanh || hoTenLine) {
            nameHtml =
              (tenThanh
                ? '<span class="se-ten-thanh">' +
                  GL.escapeHtml(tenThanh) +
                  "</span>"
                : "") +
              (hoTenLine
                ? '<span class="se-ho-ten">' +
                  GL.escapeHtml(hoTenLine) +
                  "</span>"
                : "");
          } else {
            nameHtml = '<span class="se-ho-ten">—</span>';
          }

          return (
            '<article class="student score-card se-row" data-id="' +
            st.id +
            '">' +
            '<div class="se-main">' +
            '<div class="se-who">' +
            '<div class="se-identity">' +
            '<span class="stt-badge" title="STT ' +
            (i + 1) +
            '">' +
            (i + 1) +
            "</span>" +
            '<div class="se-name-block">' +
            '<div class="student-display-name" title="' +
            GL.escapeHtml(display) +
            '">' +
            nameHtml +
            "</div>" +
            '<div class="se-who-meta">' +
            (attHtml || "") +
            (summary
              ? '<span class="se-meta-info" title="' +
                GL.escapeHtml(summary) +
                '">' +
                GL.escapeHtml(summary) +
                "</span>"
              : "") +
            "</div></div></div></div>" +
            '<div class="se-scores">' +
            colsHtml +
            "</div>" +
            (function () {
              var rankKey = String(cl.rank || "rank-none").replace(
                /^rank-/,
                ""
              );
              var fillPct = Math.round(
                (filledCols / Math.max(1, GL.COLS.length)) * 100
              );
              var tbTitle =
                "TB " +
                GL.fmt(tb, 2) +
                " · " +
                cl.label +
                " · " +
                filledCols +
                "/" +
                GL.COLS.length +
                " cột có điểm";
              return (
                '<div class="se-tb se-tb--' +
                rankKey +
                '" title="' +
                GL.escapeHtml(tbTitle) +
                '">' +
                '<div class="se-tb-card">' +
                '<div class="se-tb-main">' +
                '<span class="se-tb-kicker">TB</span>' +
                '<span class="tb-score ' +
                cl.score +
                '">' +
                GL.fmt(tb, 2) +
                "</span>" +
                "</div>" +
                '<span class="tb-rank ' +
                cl.rank +
                '">' +
                GL.escapeHtml(cl.label) +
                "</span>" +
                '<div class="se-tb-meta">' +
                '<div class="se-tb-bar" aria-hidden="true"><i style="width:' +
                fillPct +
                '%"></i></div>' +
                '<span class="tb-fill-hint">' +
                filledCols +
                "/" +
                GL.COLS.length +
                " cột</span>" +
                "</div></div></div>"
              );
            })() +
            '<div class="student-actions se-actions">' +
            '<button type="button" class="btn-icon btn-icon-neutral" data-move-student="' +
            st.id +
            '" title="Chuyển lớp">⇄</button>' +
            '<button type="button" class="btn-icon" data-del-student="' +
            st.id +
            '" title="Xóa">×</button>' +
            "</div></div>" +
            '<details class="se-more">' +
            "<summary>Họ tên · thông tin · ghi chú</summary>" +
            '<div class="se-more-body">' +
            '<div class="student-name-fields">' +
            nameFields +
            "</div>" +
            '<div class="info-fields">' +
            GL.INFO_FIELDS.map(function (f) {
              var val = st[f.key] || "";
              if (f.type === "select") {
                var opts = (f.options || [])
                  .map(function (o) {
                    return (
                      '<option value="' +
                      GL.escapeHtml(o) +
                      '"' +
                      (val === o ? " selected" : "") +
                      ">" +
                      (o || "—") +
                      "</option>"
                    );
                  })
                  .join("");
                return (
                  '<div class="info-field"><label class="nf-label">' +
                  f.label +
                  '</label><select data-info-field="' +
                  f.key +
                  '" data-sid="' +
                  st.id +
                  '">' +
                  opts +
                  "</select></div>"
                );
              }
              var inputType =
                f.type === "date" ? "date" : f.type === "tel" ? "tel" : "text";
              return (
                '<div class="info-field"><label class="nf-label">' +
                f.label +
                '</label><input type="' +
                inputType +
                '" value="' +
                GL.escapeHtml(val) +
                '" data-info-field="' +
                f.key +
                '" data-sid="' +
                st.id +
                '" placeholder="' +
                GL.escapeHtml(f.placeholder || "") +
                '" /></div>'
              );
            }).join("") +
            '</div><div class="student-note">' +
            '<label class="nf-label" for="note-' +
            st.id +
            '">Ghi chú</label>' +
            '<textarea id="note-' +
            st.id +
            '" class="note-input" rows="2" placeholder="Ghi chú ngắn…" data-note data-sid="' +
            st.id +
            '">' +
            GL.escapeHtml(st.ghiChu || "") +
            "</textarea></div></div></details>" +
            "</article>"
          );
        })
        .join("") +
      "</div>"
    );
  };

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
          if (!val && nf.key === "hoDem" && !st.tenThanh && !st.ten && st.name) {
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
            "<td><input class=\"cell-score\" type=\"text\" inputmode=\"decimal\" enterkeyhint=\"next\" autocomplete=\"off\" value=\"" +
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
        top3.length >= 3 ? [1, 0, 2] : top3.map(function (_, i) {
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

  GL.formalPrintHeaderHtml = function formalPrintHeaderHtml(cls, subtitle) {
    var ps =
      typeof GL.getPrintSettings === "function"
        ? GL.getPrintSettings()
        : {};
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
      typeof GL.getPrintSettings === "function"
        ? GL.getPrintSettings()
        : {};
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
          if (!val && nf.key === "hoDem" && !st.tenThanh && !st.ten && st.name) {
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
            ? '<div class="year-card-note">' + GL.escapeHtml(note) + "</div>"
            : "") +
          "</article>"
        );
      })
      .join("")
      : "";

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
              ? '<div class="year-card-note">' + GL.escapeHtml(note) + "</div>"
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
      (cards ||
        '<div class="empty"><strong>Chưa có học viên</strong></div>') +
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
})(window.GL = window.GL || {});
