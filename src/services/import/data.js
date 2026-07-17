/**
 * Import row normalization and class update logic.
 */
(function (GL) {
  "use strict";

GL.rowsToStudents = function rowsToStudents(matrix) {
    if (!matrix || matrix.length < 2) {
      throw new Error("File cần có tiêu đề + ít nhất 1 dòng học viên.");
    }
    var headerIdx = 0;
    var bestScore = -1;
    var r, c, score, cell;
    for (r = 0; r < Math.min(8, matrix.length); r++) {
      score = 0;
      var row = matrix[r] || [];
      for (c = 0; c < row.length; c++) {
        var m = GL.mapHeader(row[c]);
        if (m && m !== "_skip") score++;
      }
      if (score > bestScore) {
        bestScore = score;
        headerIdx = r;
      }
    }

    var colMap = (matrix[headerIdx] || []).map(GL.mapHeader);
    var students = [];

    for (r = headerIdx + 1; r < matrix.length; r++) {
      var dataRow = matrix[r] || [];
      var empty = dataRow.every(function (v) {
        return v == null || String(v).trim() === "";
      });
      if (empty) continue;

      var fullName = "";
      var tenThanh = "";
      var hoDem = "";
      var ten = "";
      var lop = "";
      var ghiChu = "";
      var info = {};
      var scores = GL.emptyScores();
      (GL.INFO_FIELDS || []).forEach(function (f) {
        info[f.key] = "";
      });

      for (c = 0; c < Math.max(dataRow.length, colMap.length); c++) {
        var key = colMap[c];
        if (!key || key === "_skip") continue;
        var val = dataRow[c];
        if (key === "fullName" || key === "name") {
          var s = String(val ?? "").trim();
          if (s) fullName = s;
        } else if (key === "tenThanh") tenThanh = String(val ?? "").trim();
        else if (key === "hoDem" || key === "ho") {
          hoDem = String(val ?? "").trim();
        } else if (key === "ten" || key === "tenOnly") {
          ten = String(val ?? "").trim();
        } else if (key === "lop") {
          lop = String(val ?? "").trim();
        } else if (key === "ghiChu") {
          ghiChu = String(val ?? "").trim();
        } else if (Object.prototype.hasOwnProperty.call(info, key)) {
          info[key] = String(val ?? "").trim();
        } else if (scores[key]) {
          scores[key] = scores[key].concat(GL.parseScoreCell(val));
        }
      }

      // Chỉ có cột Họ tên gộp → để legacy name (hiển thị), 3 cột rỗng để user tách sau
      if (!tenThanh && !hoDem && !ten && fullName) {
        if (/^(stt|tt|họ tên|ho ten|học viên)$/i.test(fullName)) continue;
        students.push(
          GL.createStudent(
            Object.assign(
              {
                name: fullName,
                scores: scores,
                _lop: lop,
                ghiChu: ghiChu,
              },
              info
            )
          )
        );
        continue;
      }

      var display = [tenThanh, hoDem, ten].filter(Boolean).join(" ").trim();
      if (!display) continue;
      if (/^(stt|tt|họ tên|ho ten|học viên)$/i.test(display)) continue;

      students.push(
        GL.createStudent(
          Object.assign(
            {
              tenThanh: tenThanh,
              hoDem: hoDem,
              ten: ten,
              scores: scores,
              _lop: lop,
              ghiChu: ghiChu,
            },
            info
          )
        )
      );
    }

    if (!students.length) {
      throw new Error("Không tìm thấy học viên trong file.");
    }
    return students;
  };

  /** Dự đoán số thêm / cập nhật theo mode (không ghi dữ liệu) */
  GL.previewImportStats = function previewImportStats(incoming, mode) {
    var cls = GL.activeClass();
    var added = 0;
    var updated = 0;
    var withScores = 0;

    incoming.forEach(function (inc) {
      GL.ensureStudentTerms(inc);
      var bag = GL.getScores(inc);
      var hasAny = GL.COLS.some(function (col) {
        return bag[col.key] && bag[col.key].length;
      });
      if (hasAny) withScores++;

      if (mode === "replace" || mode === "append") {
        added++;
      } else if (cls) {
        var found = cls.students.find(function (s) {
          return GL.normStudent(s) === GL.normStudent(inc);
        });
        if (found) updated++;
        else added++;
      } else {
        added++;
      }
    });

    return {
      total: incoming.length,
      added: added,
      updated: updated,
      withScores: withScores,
      nameOnly: incoming.length - withScores,
    };
  };

  /**
   * Nhập danh sách HV vào một lớp (không lưu state — caller lưu 1 lần).
   * @param {object} cls
   * @param {Array} incoming
   * @param {string} mode merge|append|replace
   * @param {string} importTerm hk1|hk2
   */
  GL.applyImportToClass = function applyImportToClass(
    cls,
    incoming,
    mode,
    importTerm
  ) {
    if (!cls) throw new Error("Chưa chọn lớp.");
    if (!mode) mode = "merge";
    importTerm = importTerm || "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";

    var added = 0;
    var updated = 0;
    incoming = incoming || [];

    if (mode === "replace") {
      cls.students = incoming.map(function (inc) {
        GL.ensureStudentTerms(inc);
        return inc;
      });
      added = incoming.length;
    } else if (mode === "append") {
      incoming.forEach(function (inc) {
        GL.ensureStudentTerms(inc);
        cls.students.push(inc);
      });
      added = incoming.length;
    } else {
      incoming.forEach(function (inc) {
        GL.ensureStudentTerms(inc);
        var found = cls.students.find(function (s) {
          return GL.normStudent(s) === GL.normStudent(inc);
        });
        if (!found) {
          GL.ensureNameFields(inc);
          cls.students.push(inc);
          added++;
        } else {
          GL.ensureStudentTerms(found);
          if (inc.tenThanh || inc.hoDem || inc.ten) {
            if (inc.tenThanh) found.tenThanh = inc.tenThanh;
            if (inc.hoDem) found.hoDem = inc.hoDem;
            if (inc.ten) found.ten = inc.ten;
            if (inc.tenThanh || inc.hoDem || inc.ten) found.name = "";
          }
          if (inc.ghiChu) found.ghiChu = String(inc.ghiChu).trim();
          (GL.INFO_FIELDS || []).forEach(function (f) {
            if (inc[f.key]) found[f.key] = String(inc[f.key]).trim();
          });
          var bag = GL.getScores(found, importTerm);
          var src = GL.getScores(inc, importTerm);
          GL.COLS.forEach(function (col) {
            var before = (bag[col.key] || []).slice();
            var add = src[col.key] || [];
            if (!add.length) return;
            bag[col.key] = before.concat(add);
            if (typeof GL.logScoreColumnChange === "function") {
              var prevTerm = GL.activeTerm;
              GL.activeTerm = importTerm;
              GL.logScoreColumnChange(
                found,
                col.key,
                before,
                bag[col.key],
                "import"
              );
              GL.activeTerm = prevTerm;
            }
          });
          updated++;
        }
      });
    }

    cls.students.forEach(function (st) {
      GL.ensureNameFields(st);
      GL.ensureStudentTerms(st);
    });
    GL.touchClass(cls);

    return {
      added: added,
      updated: updated,
      total: incoming.length,
      term: importTerm,
      classId: cls.id,
      className: cls.name,
      created: false,
    };
  };

  GL.applyImport = function applyImport(incoming, mode, importTerm) {
    var cls = GL.activeClass();
    if (!cls) throw new Error("Chưa chọn lớp.");
    if (!mode) {
      var modeEl =
        document.getElementById("importPreviewMode") ||
        document.getElementById("importMode");
      mode = modeEl ? modeEl.value : "merge";
    }
    importTerm =
      importTerm ||
      (GL._pendingImport && GL._pendingImport.importTerm) ||
      GL.activeTerm ||
      "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";

    var res = GL.applyImportToClass(cls, incoming, mode, importTerm);
    if (typeof GL.setUndoLabel === "function") GL.setUndoLabel("Nhập file điểm");
    GL.saveState();
    GL.render();
    return res;
  };

  /** Clone 1 dòng pending → student sẵn sàng ghi (kèm điểm theo kỳ) */
  GL.cloneImportStudent = function cloneImportStudent(st, importTerm) {
    GL.ensureStudentTerms(st);
    var infoCopy = {};
    (GL.INFO_FIELDS || []).forEach(function (f) {
      infoCopy[f.key] = st[f.key] || "";
    });
    var created = GL.createStudent(
      Object.assign(
        {
          tenThanh: st.tenThanh,
          hoDem: st.hoDem,
          ten: st.ten,
          name: st.name,
          ghiChu: st.ghiChu || "",
          scores: GL.cloneScores(GL.getScores(st, importTerm)),
          _term: importTerm,
        },
        infoCopy
      )
    );
    // giữ tên lớp file (không lưu vào state student, chỉ dùng lúc phân lớp)
    created._lop = st._lop || "";
    return created;
  };

  /**
   * Nhóm học viên đã chọn theo tên lớp trong file (_lop).
   * Dòng không có lớp → khóa "" (fallback).
   */
  GL.groupImportStudentsByLop = function groupImportStudentsByLop(students) {
    var map = {};
    var order = [];
    (students || []).forEach(function (st) {
      var lop = String(st._lop || "").trim();
      var key = lop || "";
      if (!map[key]) {
        map[key] = { lop: lop, students: [] };
        order.push(key);
      }
      map[key].students.push(st);
    });
    return order.map(function (k) {
      return map[k];
    });
  };

  /**
   * Tìm hoặc tạo lớp theo tên (không đổi active nếu opts.keepActive).
   * @param {string} lopName
   * @param {{ keepActive?: boolean, year?: string }} opts
   */
  GL.findOrCreateClassByName = function findOrCreateClassByName(lopName, opts) {
    opts = opts || {};
    lopName = String(lopName || "").trim();
    if (!lopName) throw new Error("Thiếu tên lớp.");

    var existing = GL.findAppClassByName(lopName);
    if (existing) {
      if (!opts.keepActive) {
        GL.state.activeClassId = existing.id;
      }
      return { cls: existing, created: false };
    }

    if (typeof GL.canCreateClass === "function" && !GL.canCreateClass()) {
      throw new Error(
        'Không có quyền tạo lớp "' + lopName + '". Liên hệ Ban Giáo lý.'
      );
    }

    var year = opts.year != null ? String(opts.year).trim() : "";
    if (!year && typeof GL.getPrintSettings === "function") {
      var ps = GL.getPrintSettings();
      if (ps && ps.namHoc) year = ps.namHoc;
    }

    var cls = GL.createClass(lopName, year);
    GL.state.classes.push(cls);
    if (!opts.keepActive) {
      GL.state.activeClassId = cls.id;
    }

    var u = typeof GL.currentUser === "function" ? GL.currentUser() : null;
    if (u && u.role === "glv") {
      u.classIds = u.classIds || [];
      if (u.classIds.indexOf(cls.id) < 0) {
        u.classIds.push(cls.id);
        if (typeof GL.saveAuthStore === "function") GL.saveAuthStore();
      }
    }

    return { cls: cls, created: true };
  };

  /**
   * Nhập nhiều lớp: phân HV theo cột Lớp; tự tạo lớp nếu chưa có.
   * Dòng không có lớp → lớp active (hoặc lớp đầu tiên vừa tạo).
   */
  GL.applyImportByLopGroups = function applyImportByLopGroups(
    selected,
    mode,
    importTerm
  ) {
    if (!mode) {
      var modeEl =
        document.getElementById("importPreviewMode") ||
        document.getElementById("importMode");
      mode = modeEl ? modeEl.value : "merge";
    }
    importTerm =
      importTerm ||
      (GL._pendingImport && GL._pendingImport.importTerm) ||
      GL.activeTerm ||
      "hk1";
    if (importTerm !== "hk1" && importTerm !== "hk2") importTerm = "hk1";

    var groups = GL.groupImportStudentsByLop(selected);
    var withLop = groups.filter(function (g) {
      return !!g.lop;
    });
    var without = groups.filter(function (g) {
      return !g.lop;
    });

    if (!withLop.length) {
      // Không có cột Lớp / mọi dòng trống → hành vi cũ: 1 lớp
      var single = GL.activeClass();
      if (!single) throw new Error("Chưa có lớp đích để nhập.");
      var clones0 = selected.map(function (st) {
        return GL.cloneImportStudent(st, importTerm);
      });
      var r0 = GL.applyImportToClass(single, clones0, mode, importTerm);
      if (typeof GL.setUndoLabel === "function") {
        GL.setUndoLabel("Nhập file điểm");
      }
      GL.saveState();
      GL.render();
      return {
        multi: false,
        added: r0.added,
        updated: r0.updated,
        total: r0.total,
        term: importTerm,
        classesTouched: 1,
        classesCreated: 0,
        perClass: [r0],
        targetLabel: single.name,
      };
    }

    var perClass = [];
    var totalAdded = 0;
    var totalUpdated = 0;
    var classesCreated = 0;
    var prevActive = GL.state.activeClassId;
    var firstClassId = null;

    withLop.forEach(function (g) {
      var fr = GL.findOrCreateClassByName(g.lop, { keepActive: true });
      if (fr.created) classesCreated++;
      if (!firstClassId) firstClassId = fr.cls.id;
      var clones = g.students.map(function (st) {
        return GL.cloneImportStudent(st, importTerm);
      });
      var res = GL.applyImportToClass(fr.cls, clones, mode, importTerm);
      res.created = fr.created;
      perClass.push(res);
      totalAdded += res.added;
      totalUpdated += res.updated;
    });

    // Dòng không có tên lớp
    if (without.length && without[0].students.length) {
      var fallback =
        GL.activeClass() ||
        (firstClassId && GL.getClassById
          ? GL.getClassById(firstClassId)
          : null) ||
        (GL.state.classes && GL.state.classes[0]) ||
        null;
      if (!fallback) {
        throw new Error(
          "Có " +
            without[0].students.length +
            " HV không có cột Lớp và chưa có lớp đích."
        );
      }
      var clonesFb = without[0].students.map(function (st) {
        return GL.cloneImportStudent(st, importTerm);
      });
      var resFb = GL.applyImportToClass(
        fallback,
        clonesFb,
        mode === "replace" ? "merge" : mode, // không replace cả lớp bằng phần thiếu lớp
        importTerm
      );
      resFb.fallback = true;
      perClass.push(resFb);
      totalAdded += resFb.added;
      totalUpdated += resFb.updated;
    }

    // Active: lớp đầu tiên trong file, hoặc giữ lớp trước
    if (firstClassId) {
      GL.state.activeClassId = firstClassId;
    } else if (prevActive) {
      GL.state.activeClassId = prevActive;
    }

    if (typeof GL.setUndoLabel === "function") {
      GL.setUndoLabel(
        "Nhập file · " +
          withLop.length +
          " lớp" +
          (classesCreated ? " (+" + classesCreated + " mới)" : "")
      );
    }
    GL.saveState();
    GL.render();

    var names = perClass
      .map(function (p) {
        return p.className + (p.created ? " ★" : "");
      })
      .join(", ");

    return {
      multi: true,
      added: totalAdded,
      updated: totalUpdated,
      total: selected.length,
      term: importTerm,
      classesTouched: perClass.length,
      classesCreated: classesCreated,
      perClass: perClass,
      targetLabel: names,
    };
  };
})(window.GL = window.GL || {});
