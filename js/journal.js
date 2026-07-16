/**
 * Nhật ký theo dõi học tập (MVP) — không điểm danh / chuyên cần.
 */
(function (GL) {
  "use strict";

  GL.ensureLearningLog = function ensureLearningLog(st) {
    if (!st) return st;
    if (!Array.isArray(st.learningLog)) st.learningLog = [];
    return st;
  };

  GL.logTypeMeta = function logTypeMeta(key) {
    return (
      (GL.LOG_TYPES || []).find(function (t) {
        return t.key === key;
      }) || { key: key || "ghiChu", label: key || "Ghi chú", short: "Ghi chú" }
    );
  };

  GL.logLevelMeta = function logLevelMeta(key) {
    return (
      (GL.LOG_LEVELS || []).find(function (l) {
        return l.key === key;
      }) || { key: "neu", label: "Trung tính", short: "·" }
    );
  };

  /** Format ngày YYYY-MM-DD → dd/mm/yyyy */
  GL.formatLogDate = function formatLogDate(isoDay) {
    if (!isoDay) return "—";
    var p = String(isoDay).split("-");
    if (p.length === 3) return p[2] + "/" + p[1] + "/" + p[0];
    return String(isoDay);
  };

  GL.todayISODate = function todayISODate() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return (
      d.getFullYear() +
      "-" +
      (m < 10 ? "0" : "") +
      m +
      "-" +
      (day < 10 ? "0" : "") +
      day
    );
  };

  /**
   * Thêm mục nhật ký cho HV.
   * @returns {{ ok: boolean, entry?: object, error?: string }}
   */
  GL.addLearningLog = function addLearningLog(student, opts) {
    opts = opts || {};
    if (!student) return { ok: false, error: "Không có học viên." };
    GL.ensureLearningLog(student);
    var text = String(opts.text || "").trim();
    var type = opts.type || "ghiChu";
    var typeOk = (GL.LOG_TYPES || []).some(function (t) {
      return t.key === type;
    });
    if (!typeOk) type = "ghiChu";
    var level = opts.level || "";
    if (!level) {
      var tm = GL.logTypeMeta(type);
      level = tm.defaultLevel || "neu";
    }
    var levelOk = (GL.LOG_LEVELS || []).some(function (l) {
      return l.key === level;
    });
    if (!levelOk) level = "neu";
    if (!text && type === "ghiChu") {
      return { ok: false, error: "Nhập nội dung ghi chú." };
    }
    if (!text) {
      text = GL.logTypeMeta(type).label;
    }
    var date = String(opts.date || GL.todayISODate()).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = GL.todayISODate();

    var user =
      typeof GL.currentUser === "function" ? GL.currentUser() : null;
    var entry = {
      id: typeof GL.uid === "function" ? GL.uid() : String(Date.now()),
      date: date,
      type: type,
      level: level,
      text: text.slice(0, 500),
      byUserId: user ? user.id : "",
      byName: user
        ? user.displayName || user.username || ""
        : "Không rõ",
      at: new Date().toISOString(),
    };
    student.learningLog.unshift(entry);
    // giới hạn 200 mục / HV
    if (student.learningLog.length > 200) {
      student.learningLog = student.learningLog.slice(0, 200);
    }
    return { ok: true, entry: entry };
  };

  GL.deleteLearningLog = function deleteLearningLog(student, entryId) {
    if (!student || !entryId) return false;
    GL.ensureLearningLog(student);
    var before = student.learningLog.length;
    student.learningLog = student.learningLog.filter(function (e) {
      return e.id !== entryId;
    });
    return student.learningLog.length < before;
  };

  /**
   * Cờ cần quan tâm từ điểm + nhật ký (không dùng chuyên cần).
   * @returns {{ level: 'high'|'mid'|'none', reasons: string[], negCount: number, logCount: number, tb: number|null }}
   */
  GL.studentAttention = function studentAttention(st, cls, term) {
    term = term || GL.activeTerm || "hk1";
    GL.ensureLearningLog(st);
    var weights = (cls && cls.weights) || GL.defaultWeights();
    var tb =
      typeof GL.studentTBContext === "function"
        ? GL.studentTBContext(st, weights, term)
        : null;

    var logs = st.learningLog || [];
    // 120 ngày gần nhất hoặc cả kỳ — dùng 120 ngày
    var cutoff = Date.now() - 120 * 24 * 3600 * 1000;
    var recent = logs.filter(function (e) {
      var t = e.at ? Date.parse(e.at) : Date.parse(e.date || "");
      return !t || t >= cutoff;
    });
    var negCount = recent.filter(function (e) {
      return e.level === "neg";
    }).length;
    var canThiep = recent.filter(function (e) {
      return e.type === "canThiep";
    }).length;
    var hocBaiNeg = recent.filter(function (e) {
      return e.type === "hocBai" && e.level === "neg";
    }).length;

    var reasons = [];
    var level = "none";

    if (tb != null && tb < 5) {
      reasons.push("TB " + GL.fmt(tb, 2) + " (yếu)");
      level = "high";
    }
    if (hocBaiNeg >= 2) {
      reasons.push(hocBaiNeg + " lần học bài cần lưu ý");
      if (level === "none") level = "mid";
      if (hocBaiNeg >= 3) level = "high";
    }
    if (negCount >= 2 && level === "none") {
      reasons.push(negCount + " ghi chú cần lưu ý");
      level = "mid";
    }
    if (negCount >= 3) {
      if (reasons.indexOf(negCount + " ghi chú cần lưu ý") < 0) {
        reasons.push(negCount + " ghi chú cần lưu ý");
      }
      level = "high";
    }
    if (canThiep >= 1) {
      reasons.push("Đang / đã can thiệp (" + canThiep + ")");
      if (level === "none") level = "mid";
    }

    return {
      level: level,
      reasons: reasons,
      negCount: negCount,
      logCount: logs.length,
      recentCount: recent.length,
      tb: tb,
    };
  };

  GL.attentionBadgeHtml = function attentionBadgeHtml(att) {
    if (!att || att.level === "none") return "";
    var title = (att.reasons || []).join(" · ") || "Cần quan tâm";
    if (att.level === "high") {
      return (
        '<span class="att-badge att-high" title="' +
        GL.escapeHtml(title) +
        '">🔴 Cần quan tâm</span>'
      );
    }
    return (
      '<span class="att-badge att-mid" title="' +
      GL.escapeHtml(title) +
      '">🟡 Theo dõi</span>'
    );
  };

  GL.renderLogEntryHtml = function renderLogEntryHtml(entry, stId) {
    var tm = GL.logTypeMeta(entry.type);
    var lm = GL.logLevelMeta(entry.level);
    return (
      '<div class="log-entry log-level-' +
      GL.escapeHtml(entry.level || "neu") +
      '" data-log-id="' +
      GL.escapeHtml(entry.id) +
      '">' +
      '<div class="log-entry-top">' +
      '<span class="log-date">' +
      GL.escapeHtml(GL.formatLogDate(entry.date)) +
      "</span>" +
      '<span class="log-type-pill">' +
      GL.escapeHtml(tm.short) +
      "</span>" +
      '<span class="log-level-pill">' +
      GL.escapeHtml(lm.short + " " + lm.label) +
      "</span>" +
      '<button type="button" class="log-del" data-del-log data-sid="' +
      GL.escapeHtml(stId) +
      '" data-log-id="' +
      GL.escapeHtml(entry.id) +
      '" title="Xóa ghi chú">×</button>' +
      "</div>" +
      '<div class="log-text">' +
      GL.escapeHtml(entry.text || "") +
      "</div>" +
      (entry.byName
        ? '<div class="log-by">· ' + GL.escapeHtml(entry.byName) + "</div>"
        : "") +
      "</div>"
    );
  };

  /** Cột điểm còn thiếu của 1 HV (kỳ hiện tại; year → thiếu TB HK1/HK2) */
  GL.studentMissingColsList = function studentMissingColsList(st, term) {
    term = term || GL.activeTerm || "hk1";
    GL.ensureStudentTerms(st);
    if (term === "year") {
      var miss = [];
      // dùng weights mặc định chỉ để check có TB không — caller truyền cls tốt hơn
      return miss;
    }
    var bag = GL.getScores(st, term === "year" ? "hk1" : term);
    return (GL.COLS || []).filter(function (c) {
      return !(bag[c.key] && bag[c.key].length);
    });
  };

  GL.studentMissingForClass = function studentMissingForClass(st, cls, term) {
    term = term || GL.activeTerm || "hk1";
    GL.ensureStudentTerms(st);
    if (term === "year") {
      var out = [];
      var t1 = GL.studentTB(st, cls.weights, "hk1");
      var t2 = GL.studentTB(st, cls.weights, "hk2");
      if (t1 == null) out.push({ key: "hk1", label: "TB HK1", short: "HK1" });
      if (t2 == null) out.push({ key: "hk2", label: "TB HK2", short: "HK2" });
      return out;
    }
    var bag = GL.getScores(st, term);
    return (GL.COLS || []).filter(function (c) {
      return !(bag[c.key] && bag[c.key].length);
    });
  };

  /**
   * View gộp: Thiếu điểm + Nhật ký theo dõi.
   * @param {{ onlyAttention?: boolean, onlyMissing?: boolean }} opts
   */
  GL.renderViewJournal = function renderViewJournal(cls, list, opts) {
    opts = opts || {};
    var onlyAtt = !!opts.onlyAttention;
    var onlyMiss = !!opts.onlyMissing;
    var term = GL.activeTerm || "hk1";

    var missCounts = {};
    if (term === "year") {
      missCounts.hk1 = 0;
      missCounts.hk2 = 0;
    } else {
      (GL.COLS || []).forEach(function (c) {
        missCounts[c.key] = 0;
      });
    }

    var complete = 0;
    var incomplete = 0;
    var attHigh = 0;
    var attMid = 0;

    var rows = list.map(function (item) {
      var st = item.s;
      GL.ensureLearningLog(st);
      var att = GL.studentAttention(st, cls, term);
      var missing = GL.studentMissingForClass(st, cls, term);
      if (missing.length === 0) complete++;
      else {
        incomplete++;
        missing.forEach(function (c) {
          if (missCounts[c.key] != null) missCounts[c.key]++;
          else missCounts[c.key] = 1;
        });
      }
      if (att.level === "high") attHigh++;
      else if (att.level === "mid") attMid++;
      return { st: st, i: item.i, att: att, missing: missing };
    });

    rows = rows.filter(function (r) {
      if (onlyAtt && r.att.level === "none") return false;
      if (onlyMiss && r.missing.length === 0) return false;
      return true;
    });

    // ưu tiên: thiếu nhiều / cần quan tâm
    rows.sort(function (a, b) {
      var rank = { high: 0, mid: 1, none: 2 };
      var dAtt = (rank[a.att.level] || 2) - (rank[b.att.level] || 2);
      if (dAtt) return dAtt;
      var dM = b.missing.length - a.missing.length;
      if (dM) return dM;
      return GL.normName(GL.displayName(a.st)).localeCompare(
        GL.normName(GL.displayName(b.st)),
        "vi"
      );
    });

    var colStats =
      term === "year"
        ? [
            { key: "hk1", short: "HK1", n: missCounts.hk1 || 0 },
            { key: "hk2", short: "HK2", n: missCounts.hk2 || 0 },
          ]
        : (GL.COLS || []).map(function (c) {
            return { key: c.key, short: c.short, n: missCounts[c.key] || 0 };
          });

    var summaryBar =
      '<div class="journal-summary-bar track-summary">' +
      '<span class="jsum"><strong>' +
      list.length +
      "</strong> HV</span>" +
      '<span class="jsum" style="color:var(--danger)">⚠️ <strong>' +
      incomplete +
      "</strong> thiếu điểm</span>" +
      '<span class="jsum" style="color:var(--success)">✓ <strong>' +
      complete +
      "</strong> đủ điểm</span>" +
      '<span class="jsum att-high-t">🔴 <strong>' +
      attHigh +
      "</strong> cần quan tâm</span>" +
      '<span class="jsum att-mid-t">🟡 <strong>' +
      attMid +
      "</strong> theo dõi</span>" +
      "</div>" +
      '<div class="missing-summary track-miss-cols">' +
      colStats
        .map(function (c) {
          return (
            '<div class="miss-stat"><div class="n" style="color:' +
            (c.n ? "var(--danger)" : "var(--success)") +
            '">' +
            c.n +
            '</div><div class="l">Thiếu ' +
            GL.escapeHtml(c.short) +
            "</div></div>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="track-filters">' +
      '<label class="jsum-check"><input type="checkbox" id="journalOnlyMissing"' +
      (onlyMiss ? " checked" : "") +
      " /> Chỉ thiếu điểm</label>" +
      '<label class="jsum-check"><input type="checkbox" id="journalOnlyAttention"' +
      (onlyAtt ? " checked" : "") +
      " /> Chỉ cần quan tâm / theo dõi</label>" +
      "</div>";

    if (!rows.length) {
      return (
        summaryBar +
        '<div class="empty" style="margin-top:12px"><strong>Không có học viên khớp bộ lọc.</strong></div>'
      );
    }

    var cards = rows
      .map(function (r) {
        var st = r.st;
        var att = r.att;
        var missing = r.missing;
        var logs = (st.learningLog || []).slice(0, 5);
        var more = Math.max(0, (st.learningLog || []).length - logs.length);
        var logsHtml = logs.length
          ? logs
              .map(function (e) {
                return GL.renderLogEntryHtml(e, st.id);
              })
              .join("")
          : '<p class="hint" style="margin:6px 0 0">Chưa có nhật ký. Bấm «+ Ghi chú».</p>';

        var missTags =
          missing.length === 0
            ? '<span class="ok-tag">Đủ điểm / đủ kỳ</span>'
            : missing
                .map(function (c) {
                  return (
                    '<span class="miss-tag">' +
                    GL.escapeHtml(c.label || c.short) +
                    "</span>"
                  );
                })
                .join("");

        return (
          '<article class="journal-card student' +
          (missing.length ? " has-miss" : "") +
          '" data-id="' +
          st.id +
          '">' +
          '<div class="journal-card-head">' +
          '<div class="journal-card-title">' +
          '<span class="stt-badge">' +
          (r.i + 1) +
          "</span>" +
          "<div><strong>" +
          GL.escapeHtml(GL.displayName(st)) +
          "</strong>" +
          '<div class="journal-card-meta">' +
          (att.tb != null
            ? "TB: <strong class=\"" +
              GL.classify(att.tb).score +
              '">' +
              GL.fmt(att.tb, 2) +
              "</strong>"
            : "TB: —") +
          " · " +
          att.logCount +
          " ghi chú" +
          (att.reasons.length
            ? " · " + GL.escapeHtml(att.reasons.join("; "))
            : "") +
          "</div>" +
          '<div class="miss-tags" style="margin-top:6px">' +
          missTags +
          "</div>" +
          "</div>" +
          GL.attentionBadgeHtml(att) +
          "</div>" +
          '<button type="button" class="btn btn-primary" data-add-log data-sid="' +
          st.id +
          '" style="padding:6px 12px;font-size:0.82rem">+ Ghi chú</button>' +
          "</div>" +
          '<div class="journal-logs">' +
          logsHtml +
          (more
            ? '<p class="hint">… và ' + more + " ghi chú cũ hơn</p>"
            : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    return summaryBar + '<div class="journal-list">' + cards + "</div>";
  };

  /** Mở modal thêm nhật ký */
  GL.openJournalLogModal = function openJournalLogModal(studentId) {
    var cls = GL.activeClass();
    if (!cls) {
      GL.toast("Chọn lớp trước.", "err");
      return;
    }
    var st = cls.students.find(function (s) {
      return s.id === studentId;
    });
    if (!st) {
      GL.toast("Không tìm thấy học viên.", "err");
      return;
    }

    var sidEl = document.getElementById("journalSid");
    var nameEl = document.getElementById("journalStudentName");
    var dateEl = document.getElementById("journalDate");
    var typeEl = document.getElementById("journalType");
    var levelEl = document.getElementById("journalLevel");
    var textEl = document.getElementById("journalText");
    var errEl = document.getElementById("journalError");

    if (sidEl) sidEl.value = st.id;
    if (nameEl) nameEl.textContent = GL.displayName(st);
    if (dateEl) dateEl.value = GL.todayISODate();
    if (typeEl) {
      if (!typeEl.options.length || typeEl.dataset.built !== "1") {
        typeEl.innerHTML = (GL.LOG_TYPES || [])
          .map(function (t) {
            return (
              '<option value="' +
              t.key +
              '">' +
              GL.escapeHtml(t.label) +
              "</option>"
            );
          })
          .join("");
        typeEl.dataset.built = "1";
      }
      typeEl.value = "hocBai";
    }
    if (levelEl) {
      if (!levelEl.options.length || levelEl.dataset.built !== "1") {
        levelEl.innerHTML = (GL.LOG_LEVELS || [])
          .map(function (l) {
            return (
              '<option value="' +
              l.key +
              '">' +
              GL.escapeHtml(l.short + " " + l.label) +
              "</option>"
            );
          })
          .join("");
        levelEl.dataset.built = "1";
      }
      var def = GL.logTypeMeta(typeEl ? typeEl.value : "hocBai").defaultLevel;
      levelEl.value = def || "neg";
    }
    if (textEl) textEl.value = "";
    if (errEl) {
      errEl.classList.add("hidden");
      errEl.textContent = "";
    }

    var modal = document.getElementById("journalLogModal");
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
    setTimeout(function () {
      if (textEl) textEl.focus();
    }, 40);
  };

  GL.closeJournalLogModal = function closeJournalLogModal() {
    var modal = document.getElementById("journalLogModal");
    if (modal) modal.classList.add("hidden");
    var any = document.querySelector(".modal-overlay:not(.hidden)");
    if (!any) document.body.style.overflow = "";
  };

  GL.saveJournalLogFromModal = function saveJournalLogFromModal() {
    var cls = GL.activeClass();
    if (!cls) return false;
    var sid = document.getElementById("journalSid").value;
    var st = cls.students.find(function (s) {
      return s.id === sid;
    });
    if (!st) {
      GL.toast("Không tìm thấy học viên.", "err");
      return false;
    }
    var res = GL.addLearningLog(st, {
      date: document.getElementById("journalDate").value,
      type: document.getElementById("journalType").value,
      level: document.getElementById("journalLevel").value,
      text: document.getElementById("journalText").value,
    });
    if (!res.ok) {
      var errEl = document.getElementById("journalError");
      if (errEl) {
        errEl.textContent = res.error || "Không lưu được.";
        errEl.classList.remove("hidden");
      }
      GL.toast(res.error || "Không lưu được.", "err");
      return false;
    }
    if (typeof GL.setUndoLabel === "function") {
      GL.setUndoLabel("Nhật ký: " + GL.displayName(st));
    }
    GL.touchClass(cls);
    GL.saveState();
    GL.closeJournalLogModal();
    GL.toast("Đã ghi nhật ký cho " + GL.displayName(st));
    if (typeof GL.renderStudents === "function") GL.renderStudents(cls);
    if (typeof GL.renderStats === "function") GL.renderStats(cls);
    return true;
  };
})(window.GL = window.GL || {});
