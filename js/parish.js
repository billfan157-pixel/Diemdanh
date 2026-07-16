/**
 * Tổng hợp toàn giáo xứ: mọi lớp · mọi học viên (theo quyền xem).
 */
(function (GL) {
  "use strict";

  /**
   * Gom học viên từ các lớp user được xem.
   * @param {string} term hk1|hk2|year
   * @returns {{ rows: object[], classes: object[], term: string }}
   */
  GL.buildParishOverview = function buildParishOverview(term) {
    term = term || "hk1";
    if (term !== "hk1" && term !== "hk2" && term !== "year") term = "hk1";

    var classes =
      typeof GL.classesInScope === "function"
        ? GL.classesInScope()
        : typeof GL.visibleClasses === "function"
          ? GL.visibleClasses()
          : (GL.state && GL.state.classes) || [];

    var rows = [];
    var classSummaries = [];

    classes.forEach(function (cls) {
      var students = cls.students || [];
      var classRows = [];
      students.forEach(function (st) {
        GL.ensureStudentTerms(st);
        GL.ensureNameFields(st);
        var t1 = GL.studentTB(st, cls.weights, "hk1");
        var t2 = GL.studentTB(st, cls.weights, "hk2");
        var tb = GL.studentTBContext(st, cls.weights, term);
        var rank = GL.classify(tb);
        var missing = [];
        if (term === "year") {
          if (t1 == null) missing.push("TB HK1");
          if (t2 == null) missing.push("TB HK2");
        } else {
          var bag = GL.getScores(st, term);
          GL.COLS.forEach(function (c) {
            if (!bag[c.key] || !bag[c.key].length) missing.push(c.short);
          });
        }
        var row = {
          classId: cls.id,
          className: cls.name,
          classYear: cls.year || "",
          st: st,
          name: GL.displayName(st),
          tenThanh: st.tenThanh || "",
          hoDem: st.hoDem || "",
          ten: st.ten || "",
          maHV: st.maHV || "",
          t1: t1,
          t2: t2,
          tb: tb,
          rank: rank,
          missing: missing,
          missingCount: missing.length,
        };
        rows.push(row);
        classRows.push(row);
      });

      var withTb = classRows.filter(function (r) {
        return r.tb != null;
      });
      var avg =
        withTb.length === 0
          ? null
          : withTb.reduce(function (s, r) {
              return s + r.tb;
            }, 0) / withTb.length;
      var good = withTb.filter(function (r) {
        return r.tb >= 8;
      }).length;
      var weak = withTb.filter(function (r) {
        return r.tb < 5;
      }).length;
      var missingN = classRows.filter(function (r) {
        return r.missingCount > 0;
      }).length;

      classSummaries.push({
        classId: cls.id,
        name: cls.name,
        year: cls.year || "",
        total: classRows.length,
        withTb: withTb.length,
        avg: avg,
        good: good,
        weak: weak,
        missing: missingN,
      });
    });

    // Sắp lớp theo tên
    classSummaries.sort(function (a, b) {
      return GL.normName(a.name).localeCompare(GL.normName(b.name), "vi");
    });

    var withTbAll = rows.filter(function (r) {
      return r.tb != null;
    });
    var parishAvg =
      withTbAll.length === 0
        ? null
        : withTbAll.reduce(function (s, r) {
            return s + r.tb;
          }, 0) / withTbAll.length;

    var byRank = {
      xs: 0,
      g: 0,
      k: 0,
      tb: 0,
      y: 0,
      none: 0,
    };
    rows.forEach(function (r) {
      if (r.tb == null) byRank.none++;
      else if (r.tb >= 9) byRank.xs++;
      else if (r.tb >= 8) byRank.g++;
      else if (r.tb >= 6.5) byRank.k++;
      else if (r.tb >= 5) byRank.tb++;
      else byRank.y++;
    });

    return {
      term: term,
      termLabel: GL.termLabel(term),
      classes: classSummaries,
      rows: rows,
      totalClasses: classes.length,
      totalStudents: rows.length,
      withTb: withTbAll.length,
      parishAvg: parishAvg,
      good: withTbAll.filter(function (r) {
        return r.tb >= 8;
      }).length,
      weak: withTbAll.filter(function (r) {
        return r.tb < 5;
      }).length,
      missing: rows.filter(function (r) {
        return r.missingCount > 0;
      }).length,
      byRank: byRank,
    };
  };

  GL.getParishFilterState = function getParishFilterState() {
    var termEl = document.getElementById("parishTerm");
    var classEl = document.getElementById("parishFilterClass");
    var nameEl = document.getElementById("parishFilterName");
    var sortEl = document.getElementById("parishSort");
    var rankEl = document.getElementById("parishFilterRank");
    return {
      term: termEl ? termEl.value : "hk1",
      classId: classEl ? classEl.value : "",
      name: nameEl ? GL.normName(nameEl.value) : "",
      sort: sortEl ? sortEl.value : "class",
      rank: rankEl ? rankEl.value : "",
    };
  };

  GL.filterParishRows = function filterParishRows(data, filter) {
    filter = filter || GL.getParishFilterState();
    var list = (data.rows || []).filter(function (r) {
      if (filter.classId && r.classId !== filter.classId) return false;
      if (filter.name) {
        var hay = GL.normName(
          r.name + " " + (r.maHV || "") + " " + r.className
        );
        if (hay.indexOf(filter.name) < 0) return false;
      }
      if (filter.rank) {
        if (filter.rank === "none" && r.tb != null) return false;
        if (filter.rank === "xs" && !(r.tb != null && r.tb >= 9)) return false;
        if (filter.rank === "g" && !(r.tb != null && r.tb >= 8 && r.tb < 9))
          return false;
        if (filter.rank === "k" && !(r.tb != null && r.tb >= 6.5 && r.tb < 8))
          return false;
        if (filter.rank === "tb" && !(r.tb != null && r.tb >= 5 && r.tb < 6.5))
          return false;
        if (filter.rank === "y" && !(r.tb != null && r.tb < 5)) return false;
        if (filter.rank === "good" && !(r.tb != null && r.tb >= 8)) return false;
        if (filter.rank === "weak" && !(r.tb != null && r.tb < 5)) return false;
        if (filter.rank === "missing" && r.missingCount === 0) return false;
      }
      return true;
    });

    var sort = filter.sort || "class";
    list.sort(function (a, b) {
      if (sort === "tb_desc") {
        if (a.tb == null && b.tb == null) return 0;
        if (a.tb == null) return 1;
        if (b.tb == null) return -1;
        return b.tb - a.tb;
      }
      if (sort === "tb_asc") {
        if (a.tb == null && b.tb == null) return 0;
        if (a.tb == null) return 1;
        if (b.tb == null) return -1;
        return a.tb - b.tb;
      }
      if (sort === "name") {
        return GL.normName(a.name).localeCompare(GL.normName(b.name), "vi");
      }
      // class (default): lớp rồi tên
      var c = GL.normName(a.className).localeCompare(
        GL.normName(b.className),
        "vi"
      );
      if (c !== 0) return c;
      return GL.normName(a.name).localeCompare(GL.normName(b.name), "vi");
    });

    return list;
  };

  GL.fillParishClassFilter = function fillParishClassFilter(data) {
    var sel = document.getElementById("parishFilterClass");
    if (!sel) return;
    var prev = sel.value;
    var opts =
      '<option value="">Tất cả lớp (' +
      (data.totalClasses || 0) +
      ")</option>";
    (data.classes || []).forEach(function (c) {
      opts +=
        '<option value="' +
        GL.escapeHtml(c.classId) +
        '">' +
        GL.escapeHtml(c.name) +
        (c.year ? " · " + GL.escapeHtml(c.year) : "") +
        " (" +
        c.total +
        ")</option>";
    });
    sel.innerHTML = opts;
    if (
      prev &&
      (data.classes || []).some(function (c) {
        return c.classId === prev;
      })
    ) {
      sel.value = prev;
    }
  };

  GL.renderParishSummary = function renderParishSummary(data) {
    var el = document.getElementById("parishSummary");
    if (!el) return;
    var br = data.byRank || {};
    el.innerHTML =
      '<div class="sum-item"><div class="n">' +
      data.totalClasses +
      '</div><div class="l">Lớp</div></div>' +
      '<div class="sum-item"><div class="n">' +
      data.totalStudents +
      '</div><div class="l">Học viên</div></div>' +
      '<div class="sum-item"><div class="n" style="color:var(--gold)">' +
      GL.fmt(data.parishAvg, 2) +
      '</div><div class="l">TB giáo xứ</div></div>' +
      '<div class="sum-item"><div class="n" style="color:var(--success)">' +
      data.good +
      '</div><div class="l">Giỏi trở lên</div></div>' +
      '<div class="sum-item"><div class="n" style="color:var(--danger)">' +
      data.weak +
      '</div><div class="l">Yếu (&lt;5)</div></div>' +
      '<div class="sum-item"><div class="n">' +
      data.missing +
      '</div><div class="l">Thiếu điểm</div></div>' +
      '<div class="parish-rank-bar" title="Phân bố xếp loại">' +
      '<span class="prb xs" style="flex:' +
      (br.xs || 0.01) +
      '" title="Xuất sắc: ' +
      br.xs +
      '">XS ' +
      br.xs +
      "</span>" +
      '<span class="prb g" style="flex:' +
      (br.g || 0.01) +
      '" title="Giỏi: ' +
      br.g +
      '">G ' +
      br.g +
      "</span>" +
      '<span class="prb k" style="flex:' +
      (br.k || 0.01) +
      '" title="Khá: ' +
      br.k +
      '">K ' +
      br.k +
      "</span>" +
      '<span class="prb tb" style="flex:' +
      (br.tb || 0.01) +
      '" title="TB: ' +
      br.tb +
      '">TB ' +
      br.tb +
      "</span>" +
      '<span class="prb y" style="flex:' +
      (br.y || 0.01) +
      '" title="Yếu: ' +
      br.y +
      '">Y ' +
      br.y +
      "</span>" +
      '<span class="prb none" style="flex:' +
      (br.none || 0.01) +
      '" title="Chưa đủ: ' +
      br.none +
      '">— ' +
      br.none +
      "</span>" +
      "</div>";
  };

  GL.renderParishClassTable = function renderParishClassTable(data) {
    var tbody = document.getElementById("parishClassTbody");
    if (!tbody) return;
    if (!data.classes || !data.classes.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="hint" style="text-align:center;padding:16px">Chưa có lớp nào.</td></tr>';
      return;
    }
    tbody.innerHTML = data.classes
      .map(function (c, i) {
        return (
          '<tr class="parish-class-row" data-class-id="' +
          GL.escapeHtml(c.classId) +
          '" title="Bấm để mở lớp này">' +
          "<td>" +
          (i + 1) +
          "</td>" +
          '<td class="name-col"><strong>' +
          GL.escapeHtml(c.name) +
          "</strong>" +
          (c.year
            ? '<div class="muted-sub">' + GL.escapeHtml(c.year) + "</div>"
            : "") +
          "</td>" +
          "<td>" +
          c.total +
          "</td>" +
          "<td>" +
          c.withTb +
          "</td>" +
          "<td><strong class=\"score-g\">" +
          GL.fmt(c.avg, 2) +
          "</strong></td>" +
          "<td>" +
          c.good +
          "</td>" +
          "<td>" +
          (c.weak ? '<span class="score-y">' + c.weak + "</span>" : "0") +
          " / " +
          c.missing +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  };

  GL.renderParishStudentTable = function renderParishStudentTable(filtered) {
    var tbody = document.getElementById("parishStudentTbody");
    var meta = document.getElementById("parishStudentMeta");
    if (meta) {
      meta.textContent =
        "Hiển thị " + filtered.length + " học viên (theo bộ lọc)";
    }
    if (!tbody) return;
    if (!filtered.length) {
      tbody.innerHTML =
        '<tr><td colspan="9" class="hint" style="text-align:center;padding:20px">Không có học viên khớp bộ lọc.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered
      .map(function (r, i) {
        var cl = r.rank || GL.classify(r.tb);
        return (
          '<tr class="parish-st-row" data-class-id="' +
          GL.escapeHtml(r.classId) +
          '" title="Bấm để mở lớp &amp; tìm HV">' +
          "<td>" +
          (i + 1) +
          "</td>" +
          '<td class="name-col">' +
          GL.escapeHtml(r.className) +
          "</td>" +
          '<td class="name-col">' +
          GL.escapeHtml(r.tenThanh || "—") +
          "</td>" +
          '<td class="name-col">' +
          GL.escapeHtml(r.hoDem || "—") +
          "</td>" +
          '<td class="name-col"><strong>' +
          GL.escapeHtml(r.ten || r.name || "—") +
          "</strong></td>" +
          "<td>" +
          GL.fmt(r.t1, 2) +
          "</td>" +
          "<td>" +
          GL.fmt(r.t2, 2) +
          "</td>" +
          "<td><strong class=\"" +
          cl.score +
          '">' +
          GL.fmt(r.tb, 2) +
          "</strong></td>" +
          '<td><span class="rank-pill ' +
          cl.rank +
          '">' +
          GL.escapeHtml(cl.label) +
          "</span>" +
          (r.missingCount
            ? '<div class="muted-sub">Thiếu: ' +
              GL.escapeHtml(r.missing.slice(0, 4).join(", ")) +
              (r.missing.length > 4 ? "…" : "") +
              "</div>"
            : "") +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  };

  GL.refreshParishOverview = function refreshParishOverview() {
    var filter = GL.getParishFilterState();
    var term = filter.term || "hk1";
    var data = GL.buildParishOverview(term);
    GL._parishData = data;

    GL.fillParishClassFilter(data);
    // restore class filter after refill
    var classEl = document.getElementById("parishFilterClass");
    if (classEl && filter.classId) classEl.value = filter.classId;

    filter = GL.getParishFilterState();
    var filtered = GL.filterParishRows(data, filter);

    var sub = document.getElementById("parishModalSub");
    if (sub) {
      sub.textContent =
        data.termLabel +
        " · " +
        data.totalClasses +
        " lớp · " +
        data.totalStudents +
        " học viên" +
        (typeof GL.isBanGL === "function" && GL.isBanGL()
          ? " (toàn giáo xứ)"
          : " (các lớp được gán)");
    }

    GL.renderParishSummary(data);
    GL.renderParishClassTable(data);
    GL.renderParishStudentTable(filtered);
  };

  GL.showParishModal = function showParishModal() {
    var termEl = document.getElementById("parishTerm");
    if (termEl && !termEl.dataset.userSet) {
      termEl.value =
        GL.activeTerm === "hk2" || GL.activeTerm === "year"
          ? GL.activeTerm
          : "hk1";
    }
    var nameEl = document.getElementById("parishFilterName");
    if (nameEl) nameEl.value = "";
    var rankEl = document.getElementById("parishFilterRank");
    if (rankEl) rankEl.value = "";
    var sortEl = document.getElementById("parishSort");
    if (sortEl) sortEl.value = "class";

    // tab mặc định
    GL.setParishTab("students");

    GL.refreshParishOverview();

    var modal = document.getElementById("parishModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  GL.closeParishModal = function closeParishModal() {
    var modal = document.getElementById("parishModal");
    if (modal) modal.classList.add("hidden");
    var anyOpen = document.querySelector(".modal-overlay:not(.hidden)");
    if (!anyOpen) document.body.style.overflow = "";
  };

  GL.setParishTab = function setParishTab(tab) {
    tab = tab === "classes" ? "classes" : "students";
    var btnSt = document.getElementById("parishTabStudents");
    var btnCl = document.getElementById("parishTabClasses");
    var paneSt = document.getElementById("parishPaneStudents");
    var paneCl = document.getElementById("parishPaneClasses");
    if (btnSt) btnSt.classList.toggle("active", tab === "students");
    if (btnCl) btnCl.classList.toggle("active", tab === "classes");
    if (paneSt) paneSt.classList.toggle("hidden", tab !== "students");
    if (paneCl) paneCl.classList.toggle("hidden", tab !== "classes");
  };

  /** Mở lớp từ tổng hợp (đóng modal, chuyển active class) */
  GL.openClassFromParish = function openClassFromParish(classId) {
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
    if (typeof GL.saveState === "function") {
      GL.saveState({ skipUndo: true });
    }
    GL.closeParishModal();
    if (typeof GL.render === "function") GL.render();
    GL.toast('Đã mở lớp "' + cls.name + '".');
  };

  /** Xuất Excel tổng hợp giáo xứ (danh sách đã lọc) */
  GL.exportParishExcel = function exportParishExcel() {
    if (typeof XLSX === "undefined") {
      GL.toast("Chưa tải thư viện Excel.", "err");
      return;
    }
    var filter = GL.getParishFilterState();
    var data = GL._parishData || GL.buildParishOverview(filter.term);
    var filtered = GL.filterParishRows(data, filter);

    var headers = [
      "STT",
      "Lớp",
      "Năm học",
      "Tên thánh",
      "Họ và tên đệm",
      "Tên",
      "Mã HV",
      "TB HK1",
      "TB HK2",
      "TB (" + data.termLabel + ")",
      "Xếp loại",
      "Thiếu điểm",
    ];
    var rows = filtered.map(function (r, i) {
      return [
        i + 1,
        r.className,
        r.classYear,
        r.tenThanh,
        r.hoDem,
        r.ten,
        r.maHV,
        r.t1 == null ? "" : Number(r.t1.toFixed(2)),
        r.t2 == null ? "" : Number(r.t2.toFixed(2)),
        r.tb == null ? "" : Number(r.tb.toFixed(2)),
        r.rank ? r.rank.label : "",
        r.missing.join(", "),
      ];
    });

    var classHeaders = [
      "STT",
      "Lớp",
      "Năm học",
      "Số HV",
      "Có TB",
      "TB lớp",
      "Giỏi+",
      "Yếu",
      "Thiếu điểm",
    ];
    var classRows = (data.classes || []).map(function (c, i) {
      return [
        i + 1,
        c.name,
        c.year,
        c.total,
        c.withTb,
        c.avg == null ? "" : Number(c.avg.toFixed(2)),
        c.good,
        c.weak,
        c.missing,
      ];
    });

    var wb = XLSX.utils.book_new();
    var ws1 = XLSX.utils.aoa_to_sheet([headers].concat(rows));
    XLSX.utils.book_append_sheet(wb, ws1, "Hoc vien");
    var ws2 = XLSX.utils.aoa_to_sheet([classHeaders].concat(classRows));
    XLSX.utils.book_append_sheet(wb, ws2, "Theo lop");

    var summary = [
      ["Tổng hợp giáo xứ"],
      ["Kỳ", data.termLabel],
      ["Số lớp", data.totalClasses],
      ["Số học viên", data.totalStudents],
      ["Có TB", data.withTb],
      ["TB giáo xứ", data.parishAvg == null ? "" : Number(data.parishAvg.toFixed(2))],
      ["Giỏi trở lên", data.good],
      ["Yếu (<5)", data.weak],
      ["Thiếu điểm", data.missing],
      [],
      ["Xuất lúc", new Date().toLocaleString("vi-VN")],
    ];
    var ws3 = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws3, "Tong hop");

    var fname =
      "Tong hop giao xu - " +
      data.termLabel.replace(/\s+/g, " ") +
      ".xlsx";
    if (typeof GL.downloadWorkbook === "function") {
      GL.downloadWorkbook(wb, fname);
    } else {
      XLSX.writeFile(wb, fname);
    }
    GL.toast("Đã xuất " + filtered.length + " HV · " + fname);
  };
})(window.GL = window.GL || {});
