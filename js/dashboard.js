/**
 * Năm học · Dashboard tổng quan · Nhắc thiếu điểm.
 */
(function (GL) {
  "use strict";

  GL.normalizeYear = function normalizeYear(y) {
    return String(y || "")
      .replace(/\s+/g, "")
      .replace(/–/g, "-")
      .trim();
  };

  /** So khớp năm học (2025-2026 ≈ 2025–2026) */
  GL.yearMatches = function yearMatches(classYear, filterYear) {
    if (!filterYear) return true;
    return GL.normalizeYear(classYear) === GL.normalizeYear(filterYear);
  };

  /**
   * Lớp trong phạm vi: quyền xem + lọc năm học.
   * @param {{ ignoreYear?: boolean }} opts
   */
  GL.classesInScope = function classesInScope(opts) {
    opts = opts || {};
    var list =
      typeof GL.visibleClasses === "function"
        ? GL.visibleClasses()
        : (GL.state && GL.state.classes) || [];
    if (opts.ignoreYear || !GL.activeYearFilter) return list.slice();
    return list.filter(function (c) {
      return GL.yearMatches(c.year, GL.activeYearFilter);
    });
  };

  /** Danh sách năm học có trong các lớp được xem */
  GL.collectSchoolYears = function collectSchoolYears() {
    var map = {};
    var list =
      typeof GL.visibleClasses === "function"
        ? GL.visibleClasses()
        : (GL.state && GL.state.classes) || [];
    list.forEach(function (c) {
      var y = String(c.year || "").trim();
      if (y) map[y] = (map[y] || 0) + 1;
    });
    if (typeof GL.getPrintSettings === "function") {
      var ps = GL.getPrintSettings();
      if (ps && ps.namHoc && String(ps.namHoc).trim()) {
        var ny = String(ps.namHoc).trim();
        if (!map[ny]) map[ny] = 0;
      }
    }
    return Object.keys(map).sort(function (a, b) {
      // mới hơn trước (so chuỗi năm bắt đầu)
      return GL.normalizeYear(b).localeCompare(GL.normalizeYear(a));
    });
  };

  /** Gợi ý năm học mặc định khi chưa chọn filter */
  GL.suggestDefaultYear = function suggestDefaultYear() {
    if (GL.activeYearFilter) return GL.activeYearFilter;
    if (typeof GL.getPrintSettings === "function") {
      var ps = GL.getPrintSettings();
      if (ps && ps.namHoc && String(ps.namHoc).trim()) {
        return String(ps.namHoc).trim();
      }
    }
    var years = GL.collectSchoolYears();
    return years[0] || "";
  };

  /**
   * HV thiếu điểm theo cột (kỳ).
   * @param {object} st
   * @param {object} weights
   * @param {string} term hk1|hk2|year
   * @param {string[]} [colKeys] null = mọi cột
   */
  GL.studentMissingCols = function studentMissingCols(st, weights, term, colKeys) {
    term = term || GL.activeTerm || "hk1";
    GL.ensureStudentTerms(st);
    var missing = [];
    if (term === "year") {
      var t1 = GL.studentTB(st, weights, "hk1");
      var t2 = GL.studentTB(st, weights, "hk2");
      if (t1 == null) missing.push({ key: "hk1", short: "TB HK1", label: "TB Học kỳ 1" });
      if (t2 == null) missing.push({ key: "hk2", short: "TB HK2", label: "TB Học kỳ 2" });
      return missing;
    }
    var bag = GL.getScores(st, term);
    var cols = GL.COLS || [];
    cols.forEach(function (c) {
      if (colKeys && colKeys.indexOf(c.key) < 0) return;
      if (!bag[c.key] || !bag[c.key].length) {
        missing.push({ key: c.key, short: c.short, label: c.label });
      }
    });
    return missing;
  };

  /**
   * Danh sách nhắc thiếu điểm (toàn phạm vi năm học).
   * @param {{ term?: string, colKeys?: string[], limit?: number }} opts
   */
  GL.buildMissingReminder = function buildMissingReminder(opts) {
    opts = opts || {};
    var term = opts.term || GL.activeTerm || "hk1";
    if (term !== "hk1" && term !== "hk2" && term !== "year") term = "hk1";
    var colKeys = opts.colKeys || null;
    var classes = GL.classesInScope();
    var rows = [];

    classes.forEach(function (cls) {
      (cls.students || []).forEach(function (st) {
        var miss = GL.studentMissingCols(st, cls.weights, term, colKeys);
        if (!miss.length) return;
        rows.push({
          classId: cls.id,
          className: cls.name,
          classYear: cls.year || "",
          st: st,
          studentId: st.id,
          name: GL.displayName(st),
          missing: miss,
          missingKeys: miss.map(function (m) {
            return m.key;
          }),
          missingLabel: miss
            .map(function (m) {
              return m.short;
            })
            .join(", "),
        });
      });
    });

    rows.sort(function (a, b) {
      var d = b.missing.length - a.missing.length;
      if (d) return d;
      var c = GL.normName(a.className).localeCompare(GL.normName(b.className), "vi");
      if (c) return c;
      return GL.normName(a.name).localeCompare(GL.normName(b.name), "vi");
    });

    var byCol = {};
    (GL.COLS || []).forEach(function (c) {
      byCol[c.key] = 0;
    });
    rows.forEach(function (r) {
      r.missingKeys.forEach(function (k) {
        if (byCol[k] != null) byCol[k]++;
      });
    });

    return {
      term: term,
      termLabel: GL.termLabel(term),
      total: rows.length,
      rows: opts.limit ? rows.slice(0, opts.limit) : rows,
      allRows: rows,
      byCol: byCol,
      yearFilter: GL.activeYearFilter || "",
    };
  };

  /**
   * Dữ liệu dashboard tổng quan giáo xứ / năm học.
   */
  GL.buildDashboard = function buildDashboard(term) {
    term = term || GL.activeTerm || "hk1";
    if (term !== "hk1" && term !== "hk2" && term !== "year") term = "hk1";

    var classes = GL.classesInScope();
    var allRows = [];
    var classCards = [];

    classes.forEach(function (cls) {
      var students = cls.students || [];
      var withTb = 0;
      var sumTb = 0;
      var good = 0;
      var weak = 0;
      var missingN = 0;

      students.forEach(function (st) {
        GL.ensureStudentTerms(st);
        var tb = GL.studentTBContext(st, cls.weights, term);
        var miss = GL.studentMissingCols(st, cls.weights, term);
        if (miss.length) missingN++;
        if (tb != null) {
          withTb++;
          sumTb += tb;
          if (tb >= 8) good++;
          if (tb < 5) weak++;
          allRows.push({
            classId: cls.id,
            className: cls.name,
            name: GL.displayName(st),
            tb: tb,
            rank: GL.classify(tb),
            missing: miss.length,
          });
        } else {
          allRows.push({
            classId: cls.id,
            className: cls.name,
            name: GL.displayName(st),
            tb: null,
            rank: GL.classify(null),
            missing: miss.length,
          });
        }
      });

      classCards.push({
        classId: cls.id,
        name: cls.name,
        year: cls.year || "",
        total: students.length,
        withTb: withTb,
        avg: withTb ? sumTb / withTb : null,
        good: good,
        weak: weak,
        missing: missingN,
      });
    });

    classCards.sort(function (a, b) {
      return GL.normName(a.name).localeCompare(GL.normName(b.name), "vi");
    });

    var totalStudents = allRows.length;
    var withTbAll = allRows.filter(function (r) {
      return r.tb != null;
    });
    var parishAvg =
      withTbAll.length === 0
        ? null
        : withTbAll.reduce(function (s, r) {
            return s + r.tb;
          }, 0) / withTbAll.length;
    var good = withTbAll.filter(function (r) {
      return r.tb >= 8;
    }).length;
    var weakList = withTbAll
      .filter(function (r) {
        return r.tb < 5;
      })
      .sort(function (a, b) {
        return a.tb - b.tb;
      });
    var missingList = GL.buildMissingReminder({ term: term, limit: 40 });
    var missingCount = missingList.allRows.length;
    var missingPct =
      totalStudents === 0
        ? 0
        : Math.round((missingCount / totalStudents) * 1000) / 10;

    // Cần quan tâm từ nhật ký + điểm
    var attentionList = [];
    classes.forEach(function (cls) {
      (cls.students || []).forEach(function (st) {
        if (typeof GL.studentAttention !== "function") return;
        var att = GL.studentAttention(st, cls, term);
        if (att.level === "none") return;
        attentionList.push({
          classId: cls.id,
          className: cls.name,
          name: GL.displayName(st),
          level: att.level,
          reasons: att.reasons || [],
          tb: att.tb,
          logCount: att.logCount,
        });
      });
    });
    attentionList.sort(function (a, b) {
      var r = { high: 0, mid: 1 };
      var d = (r[a.level] != null ? r[a.level] : 2) - (r[b.level] != null ? r[b.level] : 2);
      if (d) return d;
      if (a.tb == null && b.tb == null) return 0;
      if (a.tb == null) return 1;
      if (b.tb == null) return -1;
      return a.tb - b.tb;
    });
    var attHigh = attentionList.filter(function (x) {
      return x.level === "high";
    }).length;
    var attMid = attentionList.filter(function (x) {
      return x.level === "mid";
    }).length;

    return {
      term: term,
      termLabel: GL.termLabel(term),
      yearFilter: GL.activeYearFilter || "",
      totalClasses: classes.length,
      totalStudents: totalStudents,
      withTb: withTbAll.length,
      parishAvg: parishAvg,
      good: good,
      weak: weakList.length,
      missingCount: missingCount,
      missingPct: missingPct,
      topWeak: weakList.slice(0, 10),
      missing: missingList,
      attention: attentionList,
      attentionHigh: attHigh,
      attentionMid: attMid,
      classes: classCards,
    };
  };

  GL.fillYearFilterSelect = function fillYearFilterSelect(selectEl) {
    if (!selectEl) return;
    var years = GL.collectSchoolYears();
    var prev = selectEl.value || GL.activeYearFilter || "";
    var html = '<option value="">Tất cả năm học</option>';
    years.forEach(function (y) {
      html +=
        '<option value="' +
        GL.escapeHtml(y) +
        '">' +
        GL.escapeHtml(y) +
        "</option>";
    });
    // giữ filter hiện tại nếu không còn trong list
    if (prev && years.indexOf(prev) < 0) {
      html +=
        '<option value="' +
        GL.escapeHtml(prev) +
        '">' +
        GL.escapeHtml(prev) +
        " (không còn lớp)</option>";
    }
    selectEl.innerHTML = html;
    selectEl.value = prev;
    if (prev && selectEl.value !== prev) {
      // value không khớp option
      selectEl.value = "";
    }
  };

  GL.renderDashboard = function renderDashboard() {
    var root = document.getElementById("dashboardView");
    if (!root) return;

    var termEl = document.getElementById("dashTerm");
    var term = termEl ? termEl.value : GL.activeTerm || "hk1";
    var data = GL.buildDashboard(term);

    var yearLabel = data.yearFilter
      ? "Năm học " + data.yearFilter
      : "Tất cả năm học";
    var sub = document.getElementById("dashSubtitle");
    if (sub) {
      sub.textContent =
        yearLabel +
        " · " +
        data.termLabel +
        " · " +
        data.totalClasses +
        " lớp · " +
        data.totalStudents +
        " HV";
    }

    var stats = document.getElementById("dashStats");
    if (stats) {
      stats.innerHTML =
        '<div class="dash-stat"><div class="dash-stat-n">' +
        data.totalClasses +
        '</div><div class="dash-stat-l">Lớp</div></div>' +
        '<div class="dash-stat"><div class="dash-stat-n">' +
        data.totalStudents +
        '</div><div class="dash-stat-l">Học viên</div></div>' +
        '<div class="dash-stat"><div class="dash-stat-n gold">' +
        GL.fmt(data.parishAvg, 2) +
        '</div><div class="dash-stat-l">TB (' +
        GL.escapeHtml(data.termLabel) +
        ")</div></div>" +
        '<div class="dash-stat"><div class="dash-stat-n green">' +
        data.good +
        '</div><div class="dash-stat-l">Giỏi trở lên</div></div>' +
        '<div class="dash-stat"><div class="dash-stat-n danger">' +
        data.weak +
        '</div><div class="dash-stat-l">Yếu (TB&lt;5)</div></div>' +
        '<div class="dash-stat"><div class="dash-stat-n warn">' +
        data.missingPct +
        '%</div><div class="dash-stat-l">Thiếu điểm (' +
        data.missingCount +
        ")</div></div>" +
        '<div class="dash-stat"><div class="dash-stat-n danger">' +
        (data.attentionHigh || 0) +
        '</div><div class="dash-stat-l">🔴 Cần quan tâm</div></div>' +
        '<div class="dash-stat"><div class="dash-stat-n" style="color:var(--gold)">' +
        (data.attentionMid || 0) +
        '</div><div class="dash-stat-l">🟡 Theo dõi</div></div>';
    }

    // Cần quan tâm (nhật ký + điểm)
    var attEl = document.getElementById("dashAttentionList");
    if (attEl) {
      var attRows = (data.attention || []).slice(0, 12);
      if (!attRows.length) {
        attEl.innerHTML =
          '<p class="hint" style="margin:0">Không có HV cần quan tâm (theo điểm + nhật ký).</p>';
      } else {
        attEl.innerHTML =
          '<ol class="dash-ol">' +
          attRows
            .map(function (r) {
              var badge =
                r.level === "high"
                  ? '<span class="att-badge att-high">🔴</span> '
                  : '<span class="att-badge att-mid">🟡</span> ';
              return (
                "<li>" +
                badge +
                '<button type="button" class="dash-link" data-open-class="' +
                GL.escapeHtml(r.classId) +
                '">' +
                GL.escapeHtml(r.name) +
                "</button>" +
                ' <span class="dash-meta">' +
                GL.escapeHtml(r.className) +
                "</span>" +
                (r.tb != null
                  ? " — TB " + GL.fmt(r.tb, 2)
                  : "") +
                (r.reasons && r.reasons.length
                  ? " · <em>" +
                    GL.escapeHtml(r.reasons.slice(0, 2).join("; ")) +
                    "</em>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
          "</ol>" +
          (data.attention.length > 12
            ? '<p class="hint">… và ' +
              (data.attention.length - 12) +
              " em nữa. Mở lớp → tab Theo dõi.</p>"
            : "");
      }
    }

    // Top yếu
    var weakEl = document.getElementById("dashWeakList");
    if (weakEl) {
      if (!data.topWeak.length) {
        weakEl.innerHTML =
          '<p class="hint" style="margin:0">Không có HV yếu (TB &lt; 5) trong phạm vi này.</p>';
      } else {
        weakEl.innerHTML =
          '<ol class="dash-ol">' +
          data.topWeak
            .map(function (r, i) {
              return (
                "<li>" +
                '<button type="button" class="dash-link" data-open-class="' +
                GL.escapeHtml(r.classId) +
                '">' +
                GL.escapeHtml(r.name) +
                "</button>" +
                ' <span class="dash-meta">' +
                GL.escapeHtml(r.className) +
                '</span> — <strong class="score-y">' +
                GL.fmt(r.tb, 2) +
                "</strong></li>"
              );
            })
            .join("") +
          "</ol>";
      }
    }

    // Thiếu điểm
    var missEl = document.getElementById("dashMissingList");
    if (missEl) {
      var mrows = data.missing.rows || [];
      if (!mrows.length) {
        missEl.innerHTML =
          '<p class="hint" style="margin:0">✓ Không có HV thiếu điểm / thiếu kỳ.</p>';
      } else {
        missEl.innerHTML =
          '<ol class="dash-ol">' +
          mrows
            .slice(0, 15)
            .map(function (r) {
              return (
                "<li>" +
                '<button type="button" class="dash-link" data-open-class="' +
                GL.escapeHtml(r.classId) +
                '">' +
                GL.escapeHtml(r.name) +
                "</button>" +
                ' <span class="dash-meta">' +
                GL.escapeHtml(r.className) +
                "</span> — thiếu: <em>" +
                GL.escapeHtml(r.missingLabel) +
                "</em></li>"
              );
            })
            .join("") +
          "</ol>" +
          (data.missingCount > 15
            ? '<p class="hint">… và ' +
              (data.missingCount - 15) +
              ' em nữa. <button type="button" class="btn btn-ghost" id="dashOpenMissingFull" style="padding:2px 8px;font-size:0.78rem">Xem tất cả</button></p>'
            : "");
      }
    }

    // Theo cột thiếu
    var byColEl = document.getElementById("dashMissingByCol");
    if (byColEl && term !== "year") {
      byColEl.innerHTML = (GL.COLS || [])
        .map(function (c) {
          var n = (data.missing.byCol && data.missing.byCol[c.key]) || 0;
          return (
            '<button type="button" class="dash-col-chip' +
            (n ? " has-miss" : "") +
            '" data-miss-col="' +
            c.key +
            '" title="HV thiếu ' +
            GL.escapeHtml(c.label) +
            '">' +
            GL.escapeHtml(c.short) +
            ": <strong>" +
            n +
            "</strong></button>"
          );
        })
        .join("");
    } else if (byColEl) {
      byColEl.innerHTML =
        '<span class="hint">Chế độ cả năm: thiếu = chưa có TB HK1 hoặc HK2.</span>';
    }

    // Bảng lớp
    var tbody = document.getElementById("dashClassTbody");
    if (tbody) {
      if (!data.classes.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="hint" style="text-align:center;padding:16px">Không có lớp trong năm học này. Đổi bộ lọc năm hoặc tạo lớp.</td></tr>';
      } else {
        tbody.innerHTML = data.classes
          .map(function (c, i) {
            return (
              '<tr class="dash-class-row" data-open-class="' +
              GL.escapeHtml(c.classId) +
              '">' +
              "<td>" +
              (i + 1) +
              "</td>" +
              '<td class="name-col"><strong>' +
              GL.escapeHtml(c.name) +
              "</strong>" +
              (c.year
                ? '<div class="muted-sub">' + GL.escapeHtml(c.year) + "</div>"
                : '<div class="muted-sub">Chưa ghi năm học</div>') +
              "</td>" +
              "<td>" +
              c.total +
              "</td>" +
              "<td>" +
              GL.fmt(c.avg, 2) +
              "</td>" +
              "<td>" +
              c.good +
              "</td>" +
              "<td>" +
              (c.weak ? '<span class="score-y">' + c.weak + "</span>" : "0") +
              "</td>" +
              "<td>" +
              (c.missing
                ? '<span class="score-tb">' + c.missing + "</span>"
                : "0") +
              "</td>" +
              "</tr>"
            );
          })
          .join("");
      }
    }

    GL._dashboardData = data;
  };

  GL.showDashboard = function showDashboard() {
    if (typeof GL.setHomeView === "function") GL.setHomeView("dashboard");
    if (typeof GL.render === "function") GL.render();
  };

  GL.openClassFromDashboard = function openClassFromDashboard(classId) {
    if (!classId) return;
    var cls = GL.getClassById
      ? GL.getClassById(classId)
      : (GL.state.classes || []).find(function (c) {
          return c.id === classId;
        });
    if (!cls) {
      GL.toast("Không tìm thấy lớp.", "err");
      return;
    }
    if (typeof GL.canAccessClass === "function" && !GL.canAccessClass(classId)) {
      GL.toast("Bạn không có quyền xem lớp này.", "err");
      return;
    }
    GL.state.activeClassId = classId;
    if (typeof GL.saveState === "function") GL.saveState({ skipUndo: true });
    if (typeof GL.setHomeView === "function") GL.setHomeView("class");
    if (typeof GL.render === "function") GL.render();
  };

  /** Modal / panel đầy đủ thiếu điểm */
  GL.renderMissingModal = function renderMissingModal(colKey) {
    var termEl = document.getElementById("missingTerm");
    var colEl = document.getElementById("missingColFilter");
    var term = termEl ? termEl.value : GL.activeTerm || "hk1";
    var keys = null;
    if (colKey) keys = [colKey];
    else if (colEl && colEl.value) keys = [colEl.value];

    var data = GL.buildMissingReminder({ term: term, colKeys: keys });
    var body = document.getElementById("missingBody");
    var meta = document.getElementById("missingMeta");
    if (meta) {
      meta.textContent =
        (GL.activeYearFilter
          ? "NH " + GL.activeYearFilter + " · "
          : "Mọi năm · ") +
        data.termLabel +
        " · " +
        data.total +
        " HV thiếu điểm";
    }
    if (!body) return;
    if (!data.allRows.length) {
      body.innerHTML =
        '<p class="app-notice-ok" style="margin:0">Không có học viên thiếu điểm theo bộ lọc.</p>';
      return;
    }
    body.innerHTML =
      '<div class="modal-table-wrap" style="max-height:min(55vh,480px);margin:0">' +
      '<table class="import-preview-table">' +
      "<thead><tr><th>STT</th><th>Lớp</th><th>Học viên</th><th>Thiếu</th></tr></thead><tbody>" +
      data.allRows
        .map(function (r, i) {
          return (
            "<tr data-open-class=\"" +
            GL.escapeHtml(r.classId) +
            '">' +
            "<td>" +
            (i + 1) +
            "</td>" +
            "<td>" +
            GL.escapeHtml(r.className) +
            "</td>" +
            "<td><strong>" +
            GL.escapeHtml(r.name) +
            "</strong></td>" +
            "<td><em>" +
            GL.escapeHtml(r.missingLabel) +
            "</em></td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>";
  };

  GL.showMissingModal = function showMissingModal(colKey) {
    var termEl = document.getElementById("missingTerm");
    if (termEl && !termEl.dataset.locked) {
      termEl.value =
        GL.activeTerm === "hk2" || GL.activeTerm === "year"
          ? GL.activeTerm
          : "hk1";
    }
    var colEl = document.getElementById("missingColFilter");
    if (colEl) {
      if (!colEl.options.length || colEl.dataset.built !== "1") {
        colEl.innerHTML =
          '<option value="">Tất cả cột</option>' +
          (GL.COLS || [])
            .map(function (c) {
              return (
                '<option value="' +
                c.key +
                '">' +
                GL.escapeHtml(c.label) +
                "</option>"
              );
            })
            .join("");
        colEl.dataset.built = "1";
      }
      if (colKey) colEl.value = colKey;
    }
    GL.renderMissingModal(colKey || (colEl && colEl.value) || "");
    var modal = document.getElementById("missingModal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  };

  GL.closeMissingModal = function closeMissingModal() {
    var modal = document.getElementById("missingModal");
    if (modal) modal.classList.add("hidden");
    var any = document.querySelector(".modal-overlay:not(.hidden)");
    if (!any) document.body.style.overflow = "";
  };
})(window.GL = window.GL || {});
