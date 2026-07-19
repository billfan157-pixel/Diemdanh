/**
 * Thư mời họp phụ huynh — mẫu soạn sẵn.
 * Loại: điểm thấp · không học bài · vi phạm · đầu năm
 */
(function (GL) {
  "use strict";

  GL.INVITE_TYPES = [
    {
      key: "dauNam",
      label: "Họp phụ huynh đầu năm",
      short: "Đầu năm",
      autoSelect: "none",
      defaultSubject: "Thư mời họp phụ huynh đầu năm học",
      defaultReason:
        "nhằm thông báo chương trình giáo lý năm học mới, quy định lớp học, lịch sinh hoạt và phối hợp đồng hành cùng các em trong hành trình đức tin.",
    },
    {
      key: "diemThap",
      label: "Điểm thấp / kết quả học tập chưa đạt",
      short: "Điểm thấp",
      autoSelect: "weak",
      defaultSubject: "Thư mời họp phụ huynh (về kết quả học giáo lý)",
      defaultReason:
        "để cùng trao đổi về kết quả học tập giáo lý hiện tại của em còn thấp / chưa đạt yêu cầu, tìm hướng kèm cặp và nâng đỡ em trong thời gian tới.",
    },
    {
      key: "khongHocBai",
      label: "Nhiều lần không học bài / thiếu chuyên cần",
      short: "Không học bài",
      autoSelect: "note",
      defaultSubject: "Thư mời họp phụ huynh (về việc học bài & chuyên cần)",
      defaultReason:
        "để trao đổi về tình trạng em nhiều lần không học bài / chuẩn bị bài chưa đầy đủ, ảnh hưởng đến tiến độ lớp; kính mong quý phụ huynh phối hợp nhắc nhở và đồng hành cùng em.",
    },
    {
      key: "viPham",
      label: "Vi phạm nội quy / kỷ luật lớp",
      short: "Vi phạm",
      autoSelect: "note",
      defaultSubject: "Thư mời họp phụ huynh (về kỷ luật lớp)",
      defaultReason:
        "để thông báo và cùng bàn biện pháp giáo dục liên quan đến hành vi / vi phạm nội quy lớp của em, với tinh thần yêu thương và xây dựng.",
    },
  ];

  function formatDateVN(d) {
    if (!d) return "… giờ, ngày … tháng … năm …";
    try {
      var dt = typeof d === "string" ? new Date(d) : d;
      if (isNaN(dt.getTime())) return String(d);
      var h = dt.getHours();
      var m = dt.getMinutes();
      var time =
        (h < 10 ? "0" : "") +
        h +
        ":" +
        (m < 10 ? "0" : "") +
        m;
      return (
        time +
        " giờ, ngày " +
        dt.getDate() +
        " tháng " +
        (dt.getMonth() + 1) +
        " năm " +
        dt.getFullYear()
      );
    } catch (e) {
      return String(d);
    }
  }

  GL.getInviteType = function getInviteType(key) {
    return (
      GL.INVITE_TYPES.find(function (t) {
        return t.key === key;
      }) || GL.INVITE_TYPES[0]
    );
  };

  /** Gợi ý HV theo loại thư */
  GL.suggestStudentsForInvite = function suggestStudentsForInvite(cls, typeKey, term) {
    term = term || GL.activeTerm || "hk1";
    if (term === "year") term = "year";
    var type = GL.getInviteType(typeKey);
    var list = (cls.students || []).map(function (st, i) {
      return {
        st: st,
        i: i,
        name: GL.displayName(st),
        tb: GL.studentTBContext(st, cls.weights, term === "year" ? "year" : term),
        ghiChu: (st.ghiChu || "").toLowerCase(),
      };
    });

    if (type.autoSelect === "weak") {
      return list
        .filter(function (r) {
          return r.tb != null && r.tb < 6.5;
        })
        .sort(function (a, b) {
          return a.tb - b.tb;
        });
    }
    if (type.autoSelect === "note") {
      var keys =
        typeKey === "viPham"
          ? ["vi phạm", "phạt", "kỷ luật", "nội quy", "hư", "đánh", "chửi"]
          : [
              "không học",
              "chưa học",
              "thiếu bài",
              "không bài",
              "chuyên cần",
              "vắng",
              "trễ",
              "lười",
            ];
      return list.filter(function (r) {
        if (!r.ghiChu) return false;
        return keys.some(function (k) {
          return r.ghiChu.indexOf(k) >= 0;
        });
      });
    }
    // đầu năm: không auto tick
    return list;
  };

  /**
   * Soạn 1 thư mời
   * @param {object} opts
   */
  GL.buildInviteLetterHtml = function buildInviteLetterHtml(opts) {
    opts = opts || {};
    var ps =
      typeof GL.getPrintSettings === "function"
        ? GL.getPrintSettings()
        : {};
    var type = GL.getInviteType(opts.typeKey || "dauNam");
    var st = opts.student || null;
    var cls = opts.cls || GL.activeClass() || { name: "…" };
    var studentName = st
      ? GL.displayName(st)
      : opts.studentName || "……………………………………";
    var parentName =
      (st && st.phuHuynh) || opts.parentName || "Quý Phụ huynh";
    var tbText = "";
    if (st && opts.showTb !== false) {
      var term = opts.term || GL.activeTerm || "hk1";
      var tb = GL.studentTBContext(st, cls.weights, term);
      if (tb != null) {
        tbText =
          " (điểm TB " +
          GL.termLabel(term) +
          ": <strong>" +
          GL.fmt(tb, 2) +
          "</strong>)";
      }
    }

    var subject = opts.subject || type.defaultSubject;
    var reason = opts.reason || type.defaultReason;
    var extra = opts.extraNote || (st && st.ghiChu) || "";
    var timeStr = opts.timeText || formatDateVN(opts.datetime);
    var place = opts.place || "Phòng học giáo lý / Hội trường giáo xứ";
    var contact = opts.contact || ps.glvName || "Giáo lý viên phụ trách";

    var today = new Date();
    var dateLine =
      "Ngày " +
      today.getDate() +
      " tháng " +
      (today.getMonth() + 1) +
      " năm " +
      today.getFullYear();

    return (
      '<article class="invite-letter">' +
      '<div class="invite-header">' +
      "<div>" +
      GL.escapeHtml(ps.giaoHat || "Giáo hạt …") +
      "<br><strong>" +
      GL.escapeHtml(ps.giaoXu || "Giáo xứ …") +
      "</strong><br>Ban Giáo lý</div>" +
      '<div class="invite-header-right"><em>' +
      dateLine +
      "</em></div>" +
      "</div>" +
      '<h2 class="invite-title">' +
      GL.escapeHtml(subject) +
      "</h2>" +
      '<p class="invite-to">Kính gửi: <strong>' +
      GL.escapeHtml(parentName) +
      "</strong>" +
      (st && st.sdt
        ? " &nbsp;·&nbsp; ĐT: " + GL.escapeHtml(st.sdt)
        : "") +
      "</p>" +
      "<p>Ban Giáo lý " +
      GL.escapeHtml(ps.giaoXu || "giáo xứ") +
      " trân trọng kính mời quý phụ huynh của em học viên:</p>" +
      '<p class="invite-student"><strong>' +
      GL.escapeHtml(studentName) +
      "</strong>" +
      (cls.name ? " — Lớp <strong>" + GL.escapeHtml(cls.name) + "</strong>" : "") +
      tbText +
      "</p>" +
      "<p>" +
      reason +
      "</p>" +
      (extra
        ? "<p><em>Ghi chú thêm:</em> " + GL.escapeHtml(extra) + "</p>"
        : "") +
      "<p><strong>Thời gian:</strong> " +
      GL.escapeHtml(timeStr) +
      "<br><strong>Địa điểm:</strong> " +
      GL.escapeHtml(place) +
      "</p>" +
      "<p>Rất mong quý phụ huynh sắp xếp thời gian đến dự đầy đủ để việc đồng hành giáo dục đức tin cho các em đạt hiệu quả.</p>" +
      "<p>Xin chân thành cảm ơn quý phụ huynh.</p>" +
      '<div class="invite-sign">' +
      "<div><p>TM. Ban Giáo lý</p><p class=\"sign-space\"></p><p><strong>" +
      GL.escapeHtml(ps.banGLName || "Trưởng Ban Giáo lý") +
      "</strong></p></div>" +
      "<div><p>Giáo lý viên</p><p class=\"sign-space\"></p><p><strong>" +
      GL.escapeHtml(contact) +
      "</strong></p></div>" +
      "</div>" +
      (ps.footerNote
        ? '<p class="invite-footer">' + GL.escapeHtml(ps.footerNote) + "</p>"
        : "") +
      "</article>"
    );
  };

  GL.renderInviteStudentChecks = function renderInviteStudentChecks(cls, typeKey, term) {
    var box = document.getElementById("inviteStudentList");
    if (!box || !cls) return;
    var suggested = GL.suggestStudentsForInvite(cls, typeKey, term);
    var suggestIds = {};
    suggested.forEach(function (r) {
      suggestIds[r.st.id] = true;
    });
    var type = GL.getInviteType(typeKey);
    var autoTick = type.autoSelect === "weak" || type.autoSelect === "note";

    box.innerHTML = (cls.students || [])
      .map(function (st, i) {
        var name = GL.displayName(st);
        var tb = GL.studentTBContext(
          st,
          cls.weights,
          term === "year" ? "year" : term || "hk1"
        );
        var checked = autoTick && suggestIds[st.id];
        var badge =
          tb != null
            ? ' <span class="hint">TB ' + GL.fmt(tb, 2) + "</span>"
            : "";
        var note =
          st.ghiChu
            ? ' <span class="hint" title="' +
              GL.escapeHtml(st.ghiChu) +
              '">· có ghi chú</span>'
            : "";
        return (
          '<label class="invite-st-row">' +
          '<input type="checkbox" class="invite-st-cb" value="' +
          st.id +
          '"' +
          (checked ? " checked" : "") +
          " /> " +
          "<span>" +
          (i + 1) +
          ". " +
          GL.escapeHtml(name) +
          badge +
          note +
          "</span></label>"
        );
      })
      .join("") || '<p class="hint">Lớp chưa có học viên.</p>';

    var hint = document.getElementById("inviteAutoHint");
    if (hint) {
      if (type.autoSelect === "weak") {
        hint.textContent =
          "Đã gợi ý tick các em TB < 6.5 (theo kỳ đang chọn bên dưới). Bạn có thể tick thêm/bớt.";
      } else if (type.key === "khongHocBai") {
        hint.textContent =
          "Gợi ý từ ghi chú có từ khóa: không học bài, chuyên cần, vắng… — có thể tick tay.";
      } else if (type.key === "viPham") {
        hint.textContent =
          "Gợi ý từ ghi chú có từ khóa: vi phạm, kỷ luật, nội quy… — có thể tick tay.";
      } else {
        hint.textContent =
          "Họp đầu năm: chọn từng em hoặc «Chọn tất cả» để in hàng loạt.";
      }
    }
  };

  GL.getSelectedInviteStudents = function getSelectedInviteStudents(cls) {
    var ids = [];
    document.querySelectorAll(".invite-st-cb:checked").forEach(function (cb) {
      ids.push(cb.value);
    });
    return (cls.students || []).filter(function (st) {
      return ids.indexOf(st.id) >= 0;
    });
  };

  GL.buildInvitePreview = function buildInvitePreview() {
    var cls = GL.activeClass();
    if (!cls) {
      GL.toast("Chọn lớp trước.", "err");
      return "";
    }
    var typeKey =
      (document.querySelector('input[name="inviteType"]:checked') || {})
        .value || "dauNam";
    var termEl = document.getElementById("inviteTerm");
    var term = termEl ? termEl.value : "hk1";
    var subject = document.getElementById("inviteSubject").value.trim();
    var reason = document.getElementById("inviteReason").value.trim();
    var place = document.getElementById("invitePlace").value.trim();
    var datetime = document.getElementById("inviteDatetime").value;
    var timeText = document.getElementById("inviteTimeText").value.trim();
    var extra = document.getElementById("inviteExtra").value.trim();
    var showTb = document.getElementById("inviteShowTb").checked;

    var selected = GL.getSelectedInviteStudents(cls);
    var type = GL.getInviteType(typeKey);

    // Đầu năm không bắt buộc chọn HV → 1 thư chung
    if (!selected.length && typeKey === "dauNam") {
      return GL.buildInviteLetterHtml({
        typeKey: typeKey,
        cls: cls,
        studentName: "các em học viên lớp " + cls.name,
        parentName: "Quý Phụ huynh học viên",
        subject: subject || type.defaultSubject,
        reason: reason || type.defaultReason,
        place: place,
        datetime: datetime,
        timeText: timeText,
        extraNote: extra,
        showTb: false,
        term: term,
      });
    }

    if (!selected.length) {
      return (
        '<p class="hint" style="padding:24px;text-align:center">Chọn ít nhất một học viên (hoặc dùng mẫu họp đầu năm không cần chọn từng em).</p>'
      );
    }

    return selected
      .map(function (st) {
        return GL.buildInviteLetterHtml({
          typeKey: typeKey,
          cls: cls,
          student: st,
          subject: subject || type.defaultSubject,
          reason: reason || type.defaultReason,
          place: place,
          datetime: datetime,
          timeText: timeText,
          extraNote: extra,
          showTb: showTb,
          term: term,
        });
      })
      .join('<div class="invite-page-break"></div>');
  };

  GL.refreshInvitePreview = function refreshInvitePreview() {
    var box = document.getElementById("invitePreview");
    if (!box) return;
    box.innerHTML = GL.buildInvitePreview();
  };

  GL.showInviteModal = function showInviteModal() {
    if (typeof GL.requireBanGL === "function" && !GL.requireBanGL()) return;
    var cls = GL.activeClass();
    if (!cls) {
      GL.toast("Chọn lớp trước.", "err");
      return;
    }
    var typeKey =
      (document.querySelector('input[name="inviteType"]:checked') || {})
        .value || "dauNam";
    var type = GL.getInviteType(typeKey);
    var termEl = document.getElementById("inviteTerm");
    if (termEl) {
      termEl.value =
        GL.activeTerm === "hk2" || GL.activeTerm === "year"
          ? GL.activeTerm
          : "hk1";
    }
    var subj = document.getElementById("inviteSubject");
    var reason = document.getElementById("inviteReason");
    if (subj && !subj.dataset.touched) subj.value = type.defaultSubject;
    if (reason && !reason.dataset.touched) reason.value = type.defaultReason;

    var place = document.getElementById("invitePlace");
    var ps = GL.getPrintSettings ? GL.getPrintSettings() : {};
    if (place && !place.value) {
      place.value = "Phòng học giáo lý — " + (ps.giaoXu || "Giáo xứ");
    }

    GL.renderInviteStudentChecks(
      cls,
      typeKey,
      termEl ? termEl.value : "hk1"
    );
    GL.refreshInvitePreview();

    var modal = document.getElementById("inviteModal");
    if (modal) modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  GL.printInvites = function printInvites() {
    var html = GL.buildInvitePreview();
    if (!html || html.indexOf("Chọn ít nhất") >= 0) {
      GL.toast("Chưa có nội dung thư để in.", "err");
      return;
    }
    // Ghi nhật ký cho các HV được chọn
    var cls = GL.activeClass();
    var classId = cls ? cls.id : "";
    var typeKey =
      (document.querySelector('input[name="inviteType"]:checked') || {}).value || "dauNam";
    var checkedStudents = document.querySelectorAll(".invite-st-cb:checked");
    var loggedCount = 0;
    if (typeof GL.logInviteSent === "function" && cls) {
      checkedStudents.forEach(function (cb) {
        var sid = cb.value;
        if (sid) {
          var entry = GL.logInviteSent(sid, classId, typeKey);
          if (entry) loggedCount++;
        }
      });
    }
    if (loggedCount > 0) {
      GL.toast("Đã ghi nhật ký " + loggedCount + " thư mời PH.");
    }

    var inviteCss =
      "body{font-family:'Times New Roman',Times,serif;color:#111;padding:8mm;line-height:1.55;font-size:12.5pt;box-sizing:border-box}" +
      ".invite-letter{max-width:100%;width:100%;margin:0 auto 8mm;page-break-after:always;break-after:page}" +
      ".invite-letter:last-child{page-break-after:auto;break-after:auto}" +
      ".invite-header{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px;font-size:11pt}" +
      ".invite-title{text-align:center;font-size:14pt;text-transform:uppercase;margin:14px 0}" +
      ".invite-to{margin:10px 0}" +
      ".invite-student{margin:10px 0 14px;padding:6px 10px;background:#f8fafc;border-left:3px solid #2563eb}" +
      ".invite-sign{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px;text-align:center;page-break-inside:avoid}" +
      ".sign-space{height:56px}" +
      ".invite-footer{text-align:center;font-size:9.5pt;color:#555;margin-top:16px;font-style:italic}" +
      ".invite-page-break{page-break-after:always;height:0}" +
      "@media print{body{padding:0}}";
    if (typeof GL.openPrintWindow === "function") {
      GL.openPrintWindow("Thu moi hop phu huynh", html, inviteCss);
    } else {
      var w = window.open("", "_blank");
      if (!w) {
        GL.toast("Trình duyệt chặn popup. Cho phép popup để in.", "err");
        return;
      }
      w.document.write(
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Thu moi hop phu huynh</title><style>" +
          (GL.A4_PAGE_CSS || "@page{size:A4 portrait;margin:12mm 10mm}") +
          inviteCss +
          "</style></head><body>" +
          html +
          "</body></html>"
      );
      w.document.close();
      w.focus();
      setTimeout(function () {
        w.print();
      }, 300);
    }
  };
})(window.GL = window.GL || {});
