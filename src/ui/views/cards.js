/**
 * Kiểu hiển thị thẻ (cards) — nhập điểm nhanh.
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
})((window.GL = window.GL || {}));
