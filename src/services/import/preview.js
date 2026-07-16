/**
 * Import preview, filters, target-class selection and confirmation.
 */
(function (GL) {
  "use strict";

/** @type {{ students: Array, fileName: string, selected: boolean[], hasLop: boolean } | null} */
  GL._pendingImport = null;

  GL.closeImportPreview = function closeImportPreview() {
    GL._pendingImport = null;
    var modal = document.getElementById("importPreviewModal");
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
    var nameFilter = document.getElementById("importFilterName");
    var lopFilter = document.getElementById("importFilterLop");
    if (nameFilter) nameFilter.value = "";
    if (lopFilter) lopFilter.innerHTML = '<option value="">Tất cả lớp</option>';
  };

  /** So khớp lớp file ↔ bộ lọc (không phân biệt hoa thường, gọn khoảng trắng) */
  GL.matchLopFilter = function matchLopFilter(lopValue, filterValue) {
    if (!filterValue) return true;
    return GL.normName(lopValue || "") === GL.normName(filterValue);
  };

  /** Tìm lớp trong app theo tên (khớp với cột Lớp trong file) */
  GL.findAppClassByName = function findAppClassByName(name) {
    if (!name || !GL.state || !GL.state.classes) return null;
    var n = GL.normName(name);
    return (
      GL.state.classes.find(function (c) {
        return GL.normName(c.name) === n;
      }) || null
    );
  };

  /**
   * Tạo lớp mới từ tên filter import (nếu chưa có).
   * Gán cho GLV hiện tại nếu cần; chọn làm lớp active.
   */
  GL.createClassFromFilterName = function createClassFromFilterName(lopName, yearOpt) {
    lopName = String(lopName || "").trim();
    if (!lopName) throw new Error("Chưa chọn tên lớp filter.");
    var fr = GL.findOrCreateClassByName(lopName, {
      year: yearOpt,
      keepActive: false,
    });
    if (fr.created) {
      if (typeof GL.setUndoLabel === "function") {
        GL.setUndoLabel('Tạo lớp "' + lopName + '"');
      }
      if (typeof GL.saveState === "function") GL.saveState();
    } else if (typeof GL.saveState === "function") {
      GL.saveState({ skipUndo: true });
    }
    return fr.cls;
  };

  /** Cập nhật nút «Tạo lớp từ filter» + trạng thái lớp app */
  GL.updateImportCreateClassUI = function updateImportCreateClassUI() {
    var btn = document.getElementById("importCreateClassBtn");
    var status = document.getElementById("importClassStatus");
    var filter = GL.getImportFilterState();
    var lop = filter.lop;
    var pending = GL._pendingImport;

    if (!btn) return;

    if (!lop) {
      btn.classList.add("hidden");
      btn.disabled = true;
      if (status) {
        if (pending && pending.hasLop) {
          // Đếm lớp trong file (các dòng đang chọn / tất cả pending)
          var selected = GL.getSelectedImportStudents
            ? GL.getSelectedImportStudents()
            : pending.students || [];
          var groups = GL.groupImportStudentsByLop(selected);
          var named = groups.filter(function (g) {
            return !!g.lop;
          });
          var missing = 0;
          var existingN = 0;
          named.forEach(function (g) {
            if (GL.findAppClassByName(g.lop)) existingN++;
            else missing++;
          });
          status.innerHTML =
            '🌐 <strong>Tất cả lớp</strong> — xác nhận nhập sẽ <strong>tự xếp HV vào đúng lớp</strong> theo cột Lớp trong file' +
            (named.length
              ? " · " +
                named.length +
                " lớp (" +
                existingN +
                " đã có" +
                (missing
                  ? ", <em>tự tạo " + missing + " lớp mới</em>"
                  : "") +
                ")"
              : "") +
            ".";
        } else {
          var cur = GL.activeClass();
          status.innerHTML = cur
            ? 'Đích nhập: lớp app <strong>' +
              GL.escapeHtml(cur.name) +
              "</strong> (file không có cột Lớp — mọi HV vào lớp này)"
            : "File không có cột Lớp · cần có ít nhất 1 lớp trong app.";
        }
      }
      return;
    }

    var existing = GL.findAppClassByName(lop);
    var canCreate =
      typeof GL.canCreateClass !== "function" || GL.canCreateClass();

    if (existing) {
      btn.classList.add("hidden");
      btn.disabled = true;
      if (status) {
        var isActive = existing.id === GL.state.activeClassId;
        status.innerHTML =
          '✓ Lớp <strong>' +
          GL.escapeHtml(lop) +
          "</strong> đã có trong app" +
          (isActive
            ? " <em>(đang chọn — sẽ nhập vào đây)</em>"
            : " — khi xác nhận sẽ <strong>chuyển sang lớp này</strong> để nhập");
      }
    } else {
      btn.classList.remove("hidden");
      btn.disabled = !canCreate;
      btn.textContent = "＋ Tạo lớp «" + lop + "»";
      if (status) {
        status.innerHTML = canCreate
          ? '⚠️ Lớp <strong>' +
            GL.escapeHtml(lop) +
            "</strong> <em>chưa có</em> trong app. Bấm <strong>Tạo lớp</strong> hoặc xác nhận nhập sẽ được hỏi tạo lớp mới đúng tên filter."
          : '⚠️ Lớp <strong>' +
            GL.escapeHtml(lop) +
            "</strong> chưa có — bạn <em>không có quyền</em> tạo lớp. Liên hệ Ban Giáo lý.";
      }
    }
  };

  /** Cập nhật phụ đề / chip meta «lớp đích» trong modal import */
  GL.refreshImportTargetClassUI = function refreshImportTargetClassUI() {
    var cls = GL.activeClass();
    var pending = GL._pendingImport;
    if (!cls || !pending) return;

    var term = pending.importTerm || GL.activeTerm || "hk1";
    var sub = document.getElementById("importPreviewSub");
    if (sub) {
      sub.textContent =
        "Nhập vào " + GL.termLabel(term) + ' · lớp "' + cls.name + '"';
    }

    var meta = document.getElementById("importPreviewMeta");
    if (meta) {
      var appChip = meta.querySelector(".chip-meta-app");
      if (appChip) {
        appChip.textContent = "📚 App: " + cls.name;
      } else {
        // fallback: rebuild meta chip list if structure changed
        var chips = meta.querySelectorAll(".chip-meta");
        if (chips.length >= 2) {
          chips[1].textContent = "📚 App: " + cls.name;
        }
      }
      var hvChip = meta.querySelector(".chip-meta-hv");
      if (hvChip) {
        hvChip.textContent = "Hiện có " + cls.students.length + " HV";
      }
    }

    if (typeof GL.refreshImportPreviewActions === "function") {
      GL.refreshImportPreviewActions();
    }
  };

  /**
   * Bấm nút «Tạo lớp từ filter»: tạo (hoặc chọn) lớp đúng tên filter.
   * @returns {object|null} lớp đã chọn
   */
  GL.createImportClassFromFilter = function createImportClassFromFilter() {
    var filter = GL.getImportFilterState();
    var lop = filter.lop;
    if (!lop) {
      GL.toast("Hãy chọn lớp trong bộ lọc trước.", "err");
      return null;
    }
    try {
      var existed = GL.findAppClassByName(lop);
      var cls = GL.createClassFromFilterName(lop);
      GL.updateImportCreateClassUI();
      GL.refreshImportTargetClassUI();
      if (typeof GL.renderClassList === "function") GL.renderClassList();
      if (existed) {
        GL.toast('Đã chuyển sang lớp "' + cls.name + '".');
      } else {
        GL.toast('Đã tạo lớp mới "' + cls.name + '" — sẽ nhập vào lớp này.');
      }
      return cls;
    } catch (err) {
      console.error(err);
      GL.toast(err.message || "Không tạo được lớp.", "err");
      return null;
    }
  };

  /**
   * Trước khi xác nhận import (Promise&lt;boolean&gt;).
   * - Filter 1 lớp → chuyển/tạo lớp đó
   * - Filter «Tất cả» + có cột Lớp → multi-class (tự tạo khi xác nhận)
   * - Không có cột Lớp → cần lớp active
   */
  GL.ensureImportTargetClass = function ensureImportTargetClass(
    selectedCount,
    selectedStudents
  ) {
    var filter = GL.getImportFilterState();
    var lop = filter.lop;
    var n = selectedCount != null ? selectedCount : 0;
    var pending = GL._pendingImport;
    var selected =
      selectedStudents ||
      (typeof GL.getSelectedImportStudents === "function"
        ? GL.getSelectedImportStudents()
        : []);

    function ok(v) {
      return Promise.resolve(!!v);
    }

    if (lop) {
      var existing = GL.findAppClassByName(lop);
      if (existing) {
        if (existing.id !== GL.state.activeClassId) {
          GL.state.activeClassId = existing.id;
          if (typeof GL.saveState === "function") {
            GL.saveState({ skipUndo: true });
          }
        }
        return ok(true);
      }

      return GL.confirm({
        title: "Tạo lớp mới?",
        message:
          'Lớp "' +
          lop +
          '" chưa có trong app.\n\nTạo lớp mới đúng tên filter và nhập ' +
          n +
          " học viên đã chọn vào lớp đó?",
        type: "warn",
        okText: "Tạo & nhập",
        cancelText: "Hủy",
      }).then(function (yes) {
        if (!yes) return false;
        try {
          GL.createClassFromFilterName(lop);
          return true;
        } catch (err) {
          console.error(err);
          GL.toast(err.message || "Không tạo được lớp.", "err");
          return false;
        }
      });
    }

    // === Tất cả lớp ===
    var hasLopCol = pending && pending.hasLop;
    var groups = GL.groupImportStudentsByLop(selected);
    var named = groups.filter(function (g) {
      return !!g.lop;
    });

    if (hasLopCol && named.length) {
      var toCreate = named.filter(function (g) {
        return !GL.findAppClassByName(g.lop);
      });
      if (toCreate.length) {
        if (typeof GL.canCreateClass === "function" && !GL.canCreateClass()) {
          GL.toast(
            "Có " +
              toCreate.length +
              " lớp chưa có nhưng bạn không có quyền tạo lớp.",
            "err"
          );
          return ok(false);
        }
        var list = toCreate
          .slice(0, 12)
          .map(function (g) {
            return '• "' + g.lop + '" (' + g.students.length + " HV)";
          })
          .join("\n");
        if (toCreate.length > 12) {
          list += "\n… và " + (toCreate.length - 12) + " lớp nữa";
        }
        return GL.confirm({
          title: "Nhập tất cả lớp",
          message:
            "Sẽ tự xếp HV vào đúng lớp theo file.\nTạo mới " +
            toCreate.length +
            " lớp chưa có:\n\n" +
            list,
          type: "info",
          okText: "Tiếp tục nhập",
          cancelText: "Hủy",
        });
      }
      return ok(true);
    }

    if (GL.activeClass()) return ok(true);

    GL.toast(
      "Chưa có lớp đích. Tạo lớp ở cột trái, hoặc dùng file có cột Lớp.",
      "err"
    );
    return ok(false);
  };

  GL.getImportFilterState = function getImportFilterState() {
    var lopEl = document.getElementById("importFilterLop");
    var nameEl = document.getElementById("importFilterName");
    return {
      lop: lopEl ? lopEl.value : "",
      name: nameEl ? GL.normName(nameEl.value) : "",
    };
  };

  /** Dòng có khớp bộ lọc đang chọn không */
  GL.studentMatchesImportFilter = function studentMatchesImportFilter(st, filter) {
    filter = filter || GL.getImportFilterState();
    if (!GL.matchLopFilter(st._lop, filter.lop)) return false;
    if (filter.name) {
      if (GL.normStudent(st).indexOf(filter.name) < 0) return false;
    }
    return true;
  };

  GL.getVisibleImportIndices = function getVisibleImportIndices() {
    var pending = GL._pendingImport;
    if (!pending) return [];
    var filter = GL.getImportFilterState();
    var out = [];
    pending.students.forEach(function (st, i) {
      if (GL.studentMatchesImportFilter(st, filter)) out.push(i);
    });
    return out;
  };

  GL.getSelectedImportStudents = function getSelectedImportStudents() {
    var pending = GL._pendingImport;
    if (!pending) return [];
    return pending.students.filter(function (_, i) {
      return pending.selected[i];
    });
  };

  /** Chỉ tick các dòng đang hiện theo filter */
  GL.selectVisibleImportRows = function selectVisibleImportRows() {
    var pending = GL._pendingImport;
    if (!pending) return;
    var visible = {};
    GL.getVisibleImportIndices().forEach(function (i) {
      visible[i] = true;
    });
    pending.selected = pending.students.map(function (_, i) {
      return !!visible[i];
    });
    var tbody = document.getElementById("importPreviewTbody");
    if (tbody) {
      Array.prototype.forEach.call(
        tbody.querySelectorAll(".import-row-cb"),
        function (cb) {
          var idx = Number(cb.getAttribute("data-idx"));
          cb.checked = !!pending.selected[idx];
        }
      );
    }
    GL.applyImportPreviewFilter();
  };

  /** Ẩn/hiện dòng theo filter + cập nhật summary */
  GL.applyImportPreviewFilter = function applyImportPreviewFilter() {
    var pending = GL._pendingImport;
    if (!pending) return;
    var filter = GL.getImportFilterState();

    // Filter lớp đã có trong app → chuyển lớp đích ngay (preview «Tác động» chính xác)
    if (filter.lop) {
      var matched = GL.findAppClassByName(filter.lop);
      if (matched && matched.id !== GL.state.activeClassId) {
        GL.state.activeClassId = matched.id;
        if (typeof GL.saveState === "function") {
          GL.saveState({ skipUndo: true });
        }
        GL.refreshImportTargetClassUI();
        if (typeof GL.renderClassList === "function") GL.renderClassList();
      }
    }

    GL.updateImportCreateClassUI();
    var tbody = document.getElementById("importPreviewTbody");
    var visibleCount = 0;
    var selectedVisible = 0;

    if (tbody) {
      Array.prototype.forEach.call(tbody.querySelectorAll("tr"), function (tr) {
        var idx = Number(tr.getAttribute("data-idx"));
        var st = pending.students[idx];
        var match = st && GL.studentMatchesImportFilter(st, filter);
        tr.classList.toggle("row-filtered-out", !match);
        tr.classList.toggle("row-off", !pending.selected[idx]);
        if (match) {
          visibleCount++;
          if (pending.selected[idx]) selectedVisible++;
        }
      });
    }

    var hint = document.getElementById("importFilterHint");
    if (hint) {
      if (!pending.hasLop) {
        hint.innerHTML =
          "File <strong>không có cột Lớp</strong> — lọc theo lớp không dùng được. Dùng lọc theo tên hoặc chọn tay.";
      } else if (filter.lop) {
        hint.innerHTML =
          "Đang lọc lớp <strong>" +
          GL.escapeHtml(filter.lop) +
          "</strong> · hiện " +
          visibleCount +
          "/" +
          pending.students.length +
          " dòng · nhập vào <em>một lớp</em> đó (tự tạo nếu chưa có).";
      } else {
        hint.innerHTML =
          "<strong>Tất cả lớp</strong>: xác nhận sẽ tự xếp HV vào đúng lớp theo cột Lớp; lớp chưa có → <em>tự tạo</em>. " +
          "Hoặc chọn 1 lớp trong danh sách để chỉ nhập lớp đó.";
      }
    }

    GL.refreshImportPreviewSummary(visibleCount, selectedVisible);
  };

  GL.refreshImportPreviewSummary = function refreshImportPreviewSummary(
    visibleCount,
    selectedVisible
  ) {
    var pending = GL._pendingImport;
    if (!pending) return;
    var modeEl = document.getElementById("importPreviewMode");
    var mode = modeEl ? modeEl.value : "merge";
    var selected = GL.getSelectedImportStudents();
    var stats = GL.previewImportStats(selected, mode);

    if (visibleCount == null) {
      visibleCount = GL.getVisibleImportIndices().length;
    }

    var sum = document.getElementById("importPreviewSummary");
    if (sum) {
      sum.innerHTML =
        '<div class="sum-item"><div class="n">' +
        pending.students.length +
        '</div><div class="l">Trong file</div></div>' +
        '<div class="sum-item"><div class="n">' +
        visibleCount +
        '</div><div class="l">Đang hiện</div></div>' +
        '<div class="sum-item"><div class="n ok">' +
        stats.total +
        '</div><div class="l">Đã chọn nhập</div></div>' +
        '<div class="sum-item"><div class="n ok">' +
        stats.added +
        '</div><div class="l">' +
        (mode === "replace" ? "Sẽ ghi vào lớp" : "Thêm mới") +
        "</div></div>" +
        '<div class="sum-item"><div class="n warn">' +
        stats.updated +
        '</div><div class="l">Cập nhật</div></div>' +
        '<div class="sum-item"><div class="n">' +
        stats.withScores +
        '</div><div class="l">Có điểm</div></div>';
    }

    var confirmBtn = document.getElementById("importPreviewConfirm");
    if (confirmBtn) {
      confirmBtn.disabled = selected.length === 0;
      confirmBtn.textContent =
        selected.length === 0
          ? "Chưa chọn dòng nào"
          : "✓ Xác nhận nhập " + selected.length + " học viên";
    }

    var tbody = document.getElementById("importPreviewTbody");
    if (tbody) {
      Array.prototype.forEach.call(tbody.querySelectorAll("tr"), function (tr) {
        var idx = Number(tr.getAttribute("data-idx"));
        tr.classList.toggle("row-off", !pending.selected[idx]);
      });
    }

    // Select-all chỉ áp cho dòng đang hiện
    var allCb = document.getElementById("importSelectAll");
    if (allCb) {
      var visible = GL.getVisibleImportIndices();
      if (!visible.length) {
        allCb.checked = false;
        allCb.indeterminate = false;
      } else {
        var allOn = visible.every(function (i) {
          return pending.selected[i];
        });
        var someOn = visible.some(function (i) {
          return pending.selected[i];
        });
        allCb.checked = allOn;
        allCb.indeterminate = someOn && !allOn;
      }
    }
  };

  GL.collectLopValues = function collectLopValues(students) {
    var map = {};
    students.forEach(function (st) {
      var lop = String(st._lop || "").trim();
      if (lop) map[lop] = (map[lop] || 0) + 1;
    });
    return Object.keys(map)
      .sort(function (a, b) {
        return a.localeCompare(b, "vi");
      })
      .map(function (lop) {
        return { lop: lop, count: map[lop] };
      });
  };

  /** Chọn mặc định lớp trùng tên lớp app (nếu có trong file) */
  GL.pickDefaultLopFilter = function pickDefaultLopFilter(lopList, className) {
    if (!lopList.length || !className) return "";
    var target = GL.normName(className);
    for (var i = 0; i < lopList.length; i++) {
      if (GL.normName(lopList[i].lop) === target) return lopList[i].lop;
    }
    // khớp một phần: "Thiếu nhi 1A" trong "Lớp Thiếu nhi 1A"
    for (var j = 0; j < lopList.length; j++) {
      var n = GL.normName(lopList[j].lop);
      if (n.indexOf(target) >= 0 || target.indexOf(n) >= 0) return lopList[j].lop;
    }
    return "";
  };

  GL.showImportPreview = function showImportPreview(students, fileName) {
    // Import là chức năng toàn app — không bắt buộc đang mở bảng điểm lớp
    var cls = GL.activeClass();
    var displayCls = cls || {
      name: "(chưa chọn lớp đích)",
      students: [],
      year: "",
    };

    var lopList = GL.collectLopValues(students);
    var hasLop = lopList.length > 0;
    var defaultLop = GL.pickDefaultLopFilter(
      lopList,
      cls ? cls.name : ""
    );

    // Ưu tiên: chọn trong modal Xuất/Nhập → kỳ đang xem
    var mainTermEl = document.getElementById("importTerm");
    var importTermEl = document.getElementById("importPreviewTerm");
    var importTerm =
      (mainTermEl && mainTermEl.value) ||
      (importTermEl && importTermEl.value) ||
      GL.activeTerm ||
      "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";
    if (importTermEl) importTermEl.value = importTerm;

    // Gắn điểm import vào đúng học kỳ
    students.forEach(function (st) {
      if (st.scores && !st.scoresByTerm) {
        var flat = st.scores;
        st.scoresByTerm = {
          hk1: GL.emptyScores(),
          hk2: GL.emptyScores(),
        };
        st.scoresByTerm[importTerm] = GL.cloneScores(flat);
        delete st.scores;
      } else if (st.scoresByTerm) {
        // nếu createStudent đã ghi vào activeTerm khác → chuyển sang importTerm
        var a = GL.getScores(st, "hk1");
        var b = GL.getScores(st, "hk2");
        var has1 = GL.COLS.some(function (c) {
          return a[c.key] && a[c.key].length;
        });
        var has2 = GL.COLS.some(function (c) {
          return b[c.key] && b[c.key].length;
        });
        if (importTerm === "hk2" && has1 && !has2) {
          st.scoresByTerm.hk2 = GL.cloneScores(a);
          st.scoresByTerm.hk1 = GL.emptyScores();
        } else if (importTerm === "hk1" && has2 && !has1) {
          st.scoresByTerm.hk1 = GL.cloneScores(b);
          st.scoresByTerm.hk2 = GL.emptyScores();
        }
      }
      GL.ensureStudentTerms(st);
    });

    GL._pendingImport = {
      students: students,
      fileName: fileName || "file",
      selected: students.map(function () {
        return true;
      }),
      hasLop: hasLop,
      importTerm: importTerm,
    };

    var mainMode = document.getElementById("importMode");
    var previewMode = document.getElementById("importPreviewMode");
    if (mainMode && previewMode) previewMode.value = mainMode.value;

    var sub = document.getElementById("importPreviewSub");
    if (sub) {
      sub.textContent =
        "Nhập vào " +
        GL.termLabel(importTerm) +
        (cls
          ? ' · lớp đích "' + cls.name + '"'
          : " · chọn/tạo lớp đích (filter Lớp hoặc tạo lớp)");
    }

    var meta = document.getElementById("importPreviewMeta");
    if (meta) {
      meta.innerHTML =
        '<span class="chip-meta">📄 ' +
        GL.escapeHtml(fileName) +
        "</span>" +
        '<span class="chip-meta chip-meta-app">📚 App: ' +
        GL.escapeHtml(displayCls.name) +
        "</span>" +
        '<span class="chip-meta">👥 ' +
        students.length +
        " dòng file</span>" +
        (hasLop
          ? '<span class="chip-meta">🏷️ ' + lopList.length + " lớp trong file</span>"
          : '<span class="chip-meta">⚠️ Không có cột Lớp</span>') +
        '<span class="chip-meta chip-meta-hv">Hiện có ' +
        displayCls.students.length +
        " HV</span>";
    }

    // Dropdown filter lớp
    var lopSelect = document.getElementById("importFilterLop");
    if (lopSelect) {
      lopSelect.innerHTML =
        '<option value="">Tất cả lớp (' +
        students.length +
        ")</option>" +
        lopList
          .map(function (item) {
            return (
              '<option value="' +
              GL.escapeHtml(item.lop) +
              '">' +
              GL.escapeHtml(item.lop) +
              " (" +
              item.count +
              ")</option>"
            );
          })
          .join("");
      lopSelect.disabled = !hasLop;
      lopSelect.value = defaultLop || "";
    }

    var nameFilter = document.getElementById("importFilterName");
    if (nameFilter) nameFilter.value = "";

    var thead = document.getElementById("importPreviewThead");
    if (thead) {
      thead.innerHTML =
        "<tr>" +
        '<th style="width:36px"></th>' +
        '<th style="width:40px">STT</th>' +
        (hasLop ? "<th>Lớp</th>" : "") +
        GL.NAME_FIELDS.map(function (nf) {
          return '<th class="name-col">' + nf.short + "</th>";
        }).join("") +
        GL.COLS.map(function (c) {
          return "<th>" + c.short + "</th>";
        }).join("") +
        "<th>Tác động</th>" +
        "</tr>";
    }

    var tbody = document.getElementById("importPreviewTbody");
    if (tbody) {
      tbody.innerHTML = students
        .map(function (st, i) {
          var mode = previewMode ? previewMode.value : "merge";
          var action = "new";
          var actionLabel = "Thêm mới";
          if (mode === "replace") {
            action = "replace";
            actionLabel = "Thay thế";
          } else if (mode === "append") {
            action = "append";
            actionLabel = "Thêm dòng";
          } else if (cls && cls.students) {
            var found = cls.students.find(function (s) {
              return GL.normStudent(s) === GL.normStudent(st);
            });
            if (found) {
              action = "update";
              actionLabel = "Cập nhật";
            }
          }

          var nameCells = GL.NAME_FIELDS.map(function (nf) {
            var val = st[nf.key] || "";
            if (!val && nf.key === "hoDem" && !st.tenThanh && !st.ten && st.name) {
              val = st.name;
            }
            return (
              '<td class="name-col" title="' +
              GL.escapeHtml(val) +
              '">' +
              GL.escapeHtml(val || "—") +
              "</td>"
            );
          }).join("");

          var bag = GL.getScores(st, GL._pendingImport.importTerm || GL.activeTerm);
          var cells = GL.COLS.map(function (col) {
            var scores = bag[col.key] || [];
            if (!scores.length) {
              return '<td class="miss-cell">—</td>';
            }
            return "<td>" + scores.map(GL.fmt).join("; ") + "</td>";
          }).join("");

          var lopCell = hasLop
            ? '<td class="name-col" style="font-weight:600;color:var(--text2)">' +
              GL.escapeHtml(st._lop || "—") +
              "</td>"
            : "";

          return (
            '<tr data-idx="' +
            i +
            '" data-lop="' +
            GL.escapeHtml(st._lop || "") +
            '">' +
            '<td><input type="checkbox" class="import-row-cb" data-idx="' +
            i +
            '" checked /></td>' +
            "<td>" +
            (i + 1) +
            "</td>" +
            lopCell +
            nameCells +
            cells +
            '<td><span class="action-pill ' +
            action +
            '">' +
            actionLabel +
            "</span></td>" +
            "</tr>"
          );
        })
        .join("");
    }

    // Nếu auto-match được lớp app → chỉ chọn dòng lớp đó
    if (defaultLop) {
      GL.selectVisibleImportRows();
    } else {
      GL.applyImportPreviewFilter();
    }

    var modal = document.getElementById("importPreviewModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    if (defaultLop) {
      GL.toast('Đã lọc sẵn lớp "' + defaultLop + '" (trùng tên lớp app).');
    }
  };

  /** Cập nhật nhãn "Tác động" khi đổi mode */
  GL.refreshImportPreviewActions = function refreshImportPreviewActions() {
    var pending = GL._pendingImport;
    if (!pending) return;
    var cls = GL.activeClass(); // có thể null — mọi dòng = Thêm mới
    var modeEl = document.getElementById("importPreviewMode");
    var mode = modeEl ? modeEl.value : "merge";
    var tbody = document.getElementById("importPreviewTbody");
    if (!tbody) return;

    Array.prototype.forEach.call(tbody.querySelectorAll("tr"), function (tr) {
      var idx = Number(tr.getAttribute("data-idx"));
      var st = pending.students[idx];
      if (!st) return;
      var action = "new";
      var actionLabel = "Thêm mới";
      if (mode === "replace") {
        action = "replace";
        actionLabel = "Thay thế";
      } else if (mode === "append") {
        action = "append";
        actionLabel = "Thêm dòng";
      } else if (cls && cls.students) {
        var found = cls.students.find(function (s) {
          return GL.normStudent(s) === GL.normStudent(st);
        });
        if (found) {
          action = "update";
          actionLabel = "Cập nhật";
        }
      }
      var pill = tr.querySelector(".action-pill");
      if (pill) {
        pill.className = "action-pill " + action;
        pill.textContent = actionLabel;
      }
    });

    GL.applyImportPreviewFilter();
  };

  GL.confirmImportPreview = function confirmImportPreview() {
    if (typeof GL.canImport === "function" && !GL.canImport()) {
      GL.toast("Chỉ Ban Giáo lý (admin) được xác nhận nhập file.", "err");
      return;
    }
    var pending = GL._pendingImport;
    if (!pending) return;

    var selected = GL.getSelectedImportStudents();
    if (!selected.length) {
      GL.toast("Chọn ít nhất 1 học viên để nhập.", "err");
      return;
    }

    var modeEl = document.getElementById("importPreviewMode");
    var mode = modeEl ? modeEl.value : "merge";
    var filter = GL.getImportFilterState();
    var importTerm = pending.importTerm || GL.activeTerm || "hk1";
    var groups = GL.groupImportStudentsByLop(selected);
    var namedGroups = groups.filter(function (g) {
      return !!g.lop;
    });
    var multiMode = !filter.lop && pending.hasLop && namedGroups.length > 0;
    var fileName = pending.fileName;

    function runImport() {
      try {
        var res;
        if (multiMode) {
          res = GL.applyImportByLopGroups(selected, mode, importTerm);
        } else {
          var target = GL.activeClass();
          if (!target) {
            GL.toast("Chưa có lớp đích để nhập.", "err");
            return;
          }
          var toImport = selected.map(function (st) {
            return GL.cloneImportStudent(st, importTerm);
          });
          res = GL.applyImport(toImport, mode, importTerm);
          res.multi = false;
          res.targetLabel = target.name;
          res.classesTouched = 1;
          res.classesCreated = 0;
        }

        GL.closeImportPreview();

        if (typeof GL.setActiveTerm === "function") {
          GL.setActiveTerm(importTerm);
        }

        var mainMode = document.getElementById("importMode");
        if (mainMode) mainMode.value = mode;

        var summaryLabel = res.multi
          ? res.classesTouched +
            " lớp" +
            (res.classesCreated
              ? " (tạo mới " + res.classesCreated + ")"
              : "")
          : res.targetLabel || "";

        var nameEl = document.getElementById("importFileName");
        if (nameEl) {
          nameEl.textContent =
            "✓ " +
            fileName +
            " → " +
            GL.termLabel(importTerm) +
            " · " +
            summaryLabel +
            " — +" +
            res.added +
            " mới, " +
            res.updated +
            " cập nhật";
        }

        if (res.multi) {
          GL.toast(
            "Đã nhập " +
              res.total +
              " HV vào " +
              res.classesTouched +
              " lớp" +
              (res.classesCreated
                ? " (tự tạo " + res.classesCreated + " lớp mới)"
                : "") +
              " · " +
              GL.termLabel(importTerm) +
              " (+" +
              res.added +
              " mới, " +
              res.updated +
              " cập nhật)"
          );
        } else {
          GL.toast(
            "Đã nhập " +
              res.total +
              ' HV vào lớp "' +
              (res.targetLabel || "") +
              '" · ' +
              GL.termLabel(importTerm) +
              " (+" +
              res.added +
              " mới, " +
              res.updated +
              " cập nhật)"
          );
        }
        GL.render();
      } catch (err) {
        console.error(err);
        GL.toast(err.message || "Không nhập được.", "err");
      }
    }

    function afterTargetOk() {
      if (mode === "replace") {
        if (multiMode) {
          return GL.confirm({
            title: "Thay thế nhiều lớp?",
            message:
              "Chế độ Thay thế + Tất cả lớp:\nMỗi lớp trong file sẽ bị thay danh sách HV bằng các dòng thuộc lớp đó (" +
              namedGroups.length +
              " lớp · " +
              selected.length +
              " HV).",
            danger: true,
            okText: "Thay thế & nhập",
            cancelText: "Hủy",
          }).then(function (ok) {
            if (ok) runImport();
          });
        }
        var cls = GL.activeClass();
        if (cls && cls.students.length) {
          return GL.confirm({
            title: "Thay thế lớp?",
            message:
              "Thay thế toàn bộ " +
              cls.students.length +
              ' HV của lớp "' +
              cls.name +
              '" bằng ' +
              selected.length +
              " dòng đã chọn?",
            danger: true,
            okText: "Thay thế",
            cancelText: "Hủy",
          }).then(function (ok) {
            if (ok) runImport();
          });
        }
      }
      runImport();
    }

    GL.ensureImportTargetClass(selected.length, selected).then(function (ok) {
      if (!ok) return;
      afterTargetOk();
    });
  };
})(window.GL = window.GL || {});
