/**
 * Tiện ích chung: format, parse, toast, map header import.
 */
(function (GL) {
  "use strict";

  /**
   * CSS trang in chuẩn: A4 dọc (portrait).
   * Dùng cho @media print trong app và cửa sổ popup in.
   */
  GL.A4_PAGE_CSS =
    "@page{size:A4 portrait;margin:12mm 10mm}" +
    "html,body{width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}";

  /**
   * Mở cửa sổ in với khổ A4 dọc.
   * @param {string} title
   * @param {string} bodyHtml
   * @param {string} [extraCss]
   * @returns {Window|null}
   */
  GL.openPrintWindow = function openPrintWindow(title, bodyHtml, extraCss) {
    var w = window.open("", "_blank");
    if (!w) {
      if (typeof GL.toast === "function") {
        GL.toast("Trình duyệt chặn popup in. Cho phép popup để in.", "err");
      }
      return null;
    }
    var css =
      GL.A4_PAGE_CSS +
      ";body{font-family:'Times New Roman',Times,Segoe UI,sans-serif;color:#111;margin:0;padding:0;line-height:1.45}" +
      "@media print{body{padding:0;margin:0}}" +
      (extraCss || "");
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" +
        String(title || "In")
          .replace(/</g, "")
          .replace(/>/g, "") +
        "</title><style>" +
        css +
        "</style></head><body>" +
        (bodyHtml || "") +
        "</body></html>"
    );
    w.document.close();
    w.focus();
    setTimeout(function () {
      try {
        w.print();
      } catch (e) {
        /* ignore */
      }
    }, 280);
    return w;
  };

  GL.uid = function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  GL.fmt = function fmt(n, digits) {
    if (digits == null) digits = 1;
    if (n == null || Number.isNaN(n)) return "—";
    var f = Number(n.toFixed(digits));
    return Number.isInteger(f) ? String(f) : f.toFixed(digits);
  };

GL.escapeHtml = function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "'");
  };

  GL.parseScore = function parseScore(raw) {
    var n = parseFloat(String(raw).replace(",", "."));
    if (Number.isNaN(n) || n < 0 || n > 10) return null;
    return Math.round(n * 100) / 100;
  };

  /** Map type → icon + class */
  var TOAST_META = {
    ok: { icon: "✓", label: "Thành công", cls: "toast-ok" },
    success: { icon: "✓", label: "Thành công", cls: "toast-ok" },
    err: { icon: "!", label: "Lỗi", cls: "toast-err" },
    error: { icon: "!", label: "Lỗi", cls: "toast-err" },
    warn: { icon: "⚠", label: "Chú ý", cls: "toast-warn" },
    warning: { icon: "⚠", label: "Chú ý", cls: "toast-warn" },
    info: { icon: "ℹ", label: "Thông tin", cls: "toast-info" },
  };

  GL._toastQueue = [];

  /**
   * Thông báo nổi (toast).
   * @param {string} msg
   * @param {string} [type] ok|err|warn|info
   * @param {{ duration?: number, title?: string }} [opts]
   */
  GL.toast = function toast(msg, type, opts) {
    opts = opts || {};
    type = type || "ok";
    if (type === "success") type = "ok";
    if (type === "error") type = "err";
    if (type === "warning") type = "warn";

    var meta = TOAST_META[type] || TOAST_META.ok;
    var host = document.getElementById("toastHost");
    if (!host) {
      // fallback 1 phần tử cũ
      var el = document.getElementById("toast");
      if (!el) return;
      el.textContent = msg;
      el.className = "toast show " + (type === "err" ? "err" : "ok");
      el.classList.remove("hidden");
      clearTimeout(GL.toast._t);
      GL.toast._t = setTimeout(function () {
        el.className = "toast hidden";
      }, opts.duration || 3200);
      return;
    }

    var duration = opts.duration != null ? opts.duration : type === "err" ? 4200 : 3400;
    var item = document.createElement("div");
    item.className = "toast-item " + meta.cls;
    item.setAttribute("role", type === "err" ? "alert" : "status");

    var title =
      opts.title ||
      (type === "err" || type === "warn" ? meta.label : "");

    item.innerHTML =
      '<div class="toast-item-icon" aria-hidden="true">' +
      meta.icon +
      "</div>" +
      '<div class="toast-item-body">' +
      (title
        ? '<div class="toast-item-title">' + GL.escapeHtml(title) + "</div>"
        : "") +
      '<div class="toast-item-msg">' +
      GL.escapeHtml(String(msg || "")) +
      "</div>" +
      "</div>" +
      '<button type="button" class="toast-item-close" aria-label="Đóng" title="Đóng">×</button>' +
      '<div class="toast-item-progress"></div>';

    host.appendChild(item);

    // animate in
    requestAnimationFrame(function () {
      item.classList.add("toast-item-show");
    });

    var closed = false;
    function closeToast() {
      if (closed) return;
      closed = true;
      item.classList.remove("toast-item-show");
      item.classList.add("toast-item-hide");
      setTimeout(function () {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 280);
    }

    var closeBtn = item.querySelector(".toast-item-close");
    if (closeBtn) closeBtn.addEventListener("click", closeToast);

    // progress bar
    var bar = item.querySelector(".toast-item-progress");
    if (bar && duration > 0) {
      bar.style.transitionDuration = duration + "ms";
      requestAnimationFrame(function () {
        bar.style.transform = "scaleX(0)";
      });
    }

    if (duration > 0) {
      setTimeout(closeToast, duration);
    }

    // tối đa 4 toast
    while (host.children.length > 4) {
      host.removeChild(host.children[0]);
    }
  };

  GL._dialogQueue = [];
  GL._dialogOpen = false;

  function normalizeDialogOpts(messageOrOpts, opts) {
    var o = {};
    if (typeof messageOrOpts === "string") {
      o.message = messageOrOpts;
      Object.assign(o, opts || {});
    } else {
      o = Object.assign({}, messageOrOpts || {});
    }
    return o;
  }

  function runDialog(o, resolve) {
    var overlay = document.getElementById("appDialog");
    var titleEl = document.getElementById("appDialogTitle");
    var msgEl = document.getElementById("appDialogMessage");
    var okBtn = document.getElementById("appDialogOk");
    var cancelBtn = document.getElementById("appDialogCancel");
    var iconEl = document.getElementById("appDialogIcon");
    var iconWrap = document.getElementById("appDialogIconWrap");
    var panel = overlay && overlay.querySelector(".dialog-panel");

    if (!overlay || !okBtn) {
      if (o.isPrompt) {
        resolve(window.prompt(o.message || "", o.defaultValue || ""));
      } else if (o.alertOnly) {
        window.alert(o.message);
        resolve(true);
      } else {
        resolve(window.confirm(o.message));
      }
      pumpDialogQueue();
      return;
    }

    GL._dialogOpen = true;

    var inputEl = document.getElementById("appDialogInput");

    if (titleEl) titleEl.textContent = o.title || "Xác nhận";
    if (msgEl) {
      msgEl.textContent = o.message || "";
      msgEl.style.whiteSpace = "pre-wrap";
    }
    okBtn.textContent = o.okText || (o.alertOnly ? "Đã hiểu" : o.isPrompt ? "Xong" : "Đồng ý");
    if (cancelBtn) {
      cancelBtn.textContent = o.cancelText || "Hủy";
      cancelBtn.classList.toggle("hidden", !!o.alertOnly);
    }

    if (o.isPrompt && inputEl) {
      inputEl.style.display = "block";
      inputEl.value = o.defaultValue || "";
      inputEl.placeholder = o.placeholder || "";
    } else if (inputEl) {
      inputEl.style.display = "none";
    }

    var kind = o.danger || o.type === "danger" ? "danger" : o.type || "confirm";
    if (o.alertOnly && kind === "confirm") kind = "info";

    var iconMap = {
      danger: "🗑",
      warn: "⚠",
      warning: "⚠",
      info: "ℹ",
      confirm: "?",
      ok: "✓",
    };
    if (iconEl) iconEl.textContent = iconMap[kind] || iconMap.confirm;
    if (iconWrap) iconWrap.className = "dialog-icon-wrap dialog-icon-" + kind;
    if (panel) panel.className = "modal-panel dialog-panel dialog-type-" + kind;

    okBtn.className =
      "btn " + (kind === "danger" ? "dialog-ok-danger" : "btn-primary");

    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    function cleanup() {
      okBtn.removeEventListener("click", onOk);
      if (cancelBtn) cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      if (inputEl) inputEl.style.display = "none";
    }

    function finish(val) {
      overlay.classList.add("hidden");
      var anyOpen = document.querySelector(".modal-overlay:not(.hidden)");
      if (!anyOpen) document.body.style.overflow = "";
      cleanup();
      GL._dialogOpen = false;
      resolve(val);
      setTimeout(pumpDialogQueue, 40);
    }

    function promptValue() {
      return inputEl ? String(inputEl.value || "").trim() || null : true;
    }

    function onOk() {
      finish(o.isPrompt ? promptValue() : true);
    }
    function onCancel() {
      finish(o.isPrompt ? null : false);
    }
    function onBackdrop(e) {
      if (e.target === overlay) finish(o.alertOnly ? true : o.isPrompt ? null : false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(o.alertOnly ? true : o.isPrompt ? null : false);
      } else if (e.key === "Enter" && o.isPrompt) {
        e.preventDefault();
        finish(promptValue());
      } else if (e.key === "Enter" && !o.isPrompt) {
        e.preventDefault();
        finish(true);
      }
    }

    okBtn.addEventListener("click", onOk);
    if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    setTimeout(function () {
      if (o.isPrompt && inputEl) inputEl.focus();
      else okBtn.focus();
    }, 30);
  }

  function pumpDialogQueue() {
    if (GL._dialogOpen) return;
    var next = GL._dialogQueue.shift();
    if (!next) return;
    runDialog(next.opts, next.resolve);
  }

  /**
   * Hộp thoại xác nhận đẹp (Promise&lt;boolean&gt;).
   * @param {string|object} messageOrOpts
   * @param {object} [opts]
   */
  GL.confirm = function confirmDialog(messageOrOpts, opts) {
    var o = normalizeDialogOpts(messageOrOpts, opts);
    o.title = o.title || "Xác nhận";
    o.okText = o.okText || "Đồng ý";
    o.cancelText = o.cancelText || "Hủy";
    o.type = o.type || (o.danger ? "danger" : "confirm");
    o.danger = !!o.danger || o.type === "danger";
    o.alertOnly = false;

    return new Promise(function (resolve) {
      GL._dialogQueue.push({ opts: o, resolve: resolve });
      pumpDialogQueue();
    });
  };

  /**
   * Hộp thoại thông báo (chỉ 1 nút).
   * @returns {Promise&lt;void&gt;}
   */
  GL.alert = function alertDialog(messageOrOpts, opts) {
    var o = normalizeDialogOpts(messageOrOpts, opts);
    o.title = o.title || "Thông báo";
    o.okText = o.okText || "Đã hiểu";
    o.type = o.type || "info";
    o.alertOnly = true;

    return new Promise(function (resolve) {
      GL._dialogQueue.push({
        opts: o,
        resolve: function () {
          resolve();
        },
      });
      pumpDialogQueue();
    });
  };

  /**
   * Hộp thoại nhập liệu (Promise&lt;string|null&gt;).
   * @param {string|object} messageOrOpts
   * @param {object} [opts]
   */
  GL.prompt = function promptDialog(messageOrOpts, opts) {
    var o = normalizeDialogOpts(messageOrOpts, opts);
    o.title = o.title || "Nhập thông tin";
    o.okText = o.okText || "Xong";
    o.cancelText = o.cancelText || "Hủy";
    o.isPrompt = true;

    return new Promise(function (resolve) {
      GL._dialogQueue.push({ opts: o, resolve: resolve });
      pumpDialogQueue();
    });
  };

  GL.normName = function normName(name) {
    var s = String(name || "");
    if (typeof s.normalize === "function") s = s.normalize("NFC");
    return s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  /** Ghép tên hiển thị: Tên thánh + Họ đệm + Tên (fallback name cũ) */
  GL.displayName = function displayName(st) {
    if (!st) return "";
    var parts = [st.tenThanh, st.hoDem, st.ten]
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
    return String(st.name || "").trim();
  };

  GL.normStudent = function normStudent(st) {
    return GL.normName(GL.displayName(st));
  };

  /** Chuẩn hóa object học viên (migrate bản cũ chỉ có name) */
  GL.ensureNameFields = function ensureNameFields(st) {
    if (!st) return st;
    st.tenThanh = st.tenThanh != null ? String(st.tenThanh) : "";
    st.hoDem = st.hoDem != null ? String(st.hoDem) : "";
    st.ten = st.ten != null ? String(st.ten) : "";
    if (st.ghiChu == null) st.ghiChu = "";
    else st.ghiChu = String(st.ghiChu);
    // Thông tin học viên
    if (GL.INFO_FIELDS) {
      GL.INFO_FIELDS.forEach(function (f) {
        if (st[f.key] == null) st[f.key] = "";
        else st[f.key] = String(st[f.key]);
      });
    }
    // Dữ liệu cũ: chỉ có name → giữ name làm fallback; không tự tách
    if (!st.tenThanh && !st.hoDem && !st.ten && st.name) {
      // để user tự sửa 3 cột; tạm để nguyên displayName đọc name
    }
    return st;
  };

  /** Tóm tắt 1 dòng thông tin HV (hiển thị nhanh) */
  GL.infoSummary = function infoSummary(st) {
    if (!st) return "";
    var parts = [];
    if (st.maHV) parts.push("Mã: " + st.maHV);
    if (st.ngaySinh) parts.push("NS: " + st.ngaySinh);
    if (st.gioiTinh) parts.push(st.gioiTinh);
    if (st.giaoXu) parts.push(st.giaoXu);
    if (st.phuHuynh) parts.push("PH: " + st.phuHuynh);
    if (st.sdt) parts.push(st.sdt);
    return parts.join(" · ");
  };

  GL.createStudent = function createStudent(fields) {
    fields = fields || {};
    // emptyScores / cloneScores có ở calc.js (load trước khi user thao tác)
    var empty = GL.emptyScores
      ? GL.emptyScores
      : function () {
          var s = {};
          GL.COLS.forEach(function (c) {
            s[c.key] = [];
          });
          return s;
        };
    var cloneBag = GL.cloneScores
      ? GL.cloneScores
      : function (src) {
          var out = empty();
          if (!src) return out;
          GL.COLS.forEach(function (c) {
            out[c.key] = Array.isArray(src[c.key]) ? src[c.key].slice() : [];
          });
          return out;
        };

    var scoresByTerm = { hk1: empty(), hk2: empty() };
    if (fields.scoresByTerm) {
      scoresByTerm.hk1 = cloneBag(fields.scoresByTerm.hk1);
      scoresByTerm.hk2 = cloneBag(fields.scoresByTerm.hk2);
    } else if (fields.scores) {
      var term =
        fields._term ||
        (typeof GL.activeTerm !== "undefined" && GL.activeTerm) ||
        "hk1";
      if (term !== "hk1" && term !== "hk2") term = "hk1";
      scoresByTerm[term] = cloneBag(fields.scores);
    }

    var base = {
      id: fields.id || GL.uid(),
      tenThanh: String(fields.tenThanh || "").trim(),
      hoDem: String(fields.hoDem || "").trim(),
      ten: String(fields.ten || "").trim(),
      name: String(fields.name || "").trim(),
      ghiChu: String(fields.ghiChu || "").trim(),
      scoresByTerm: scoresByTerm,
      learningLog: Array.isArray(fields.learningLog)
        ? fields.learningLog.slice()
        : [],
    };
    if (GL.INFO_FIELDS) {
      GL.INFO_FIELDS.forEach(function (f) {
        base[f.key] = String(fields[f.key] || "").trim();
      });
    }
    var st = GL.ensureNameFields(base);
    if (typeof GL.ensureStudentTerms === "function") {
      GL.ensureStudentTerms(st);
    }
    if (typeof GL.ensureLearningLog === "function") {
      GL.ensureLearningLog(st);
    }
    if (fields._lop != null && String(fields._lop).trim()) {
      st._lop = String(fields._lop).trim();
    }
    return st;
  };

  GL.normalizeHeader = function normalizeHeader(h) {
    return String(h ?? "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/\u00a0/g, " ")
      .replace(/[_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  GL.mapHeader = function mapHeader(h) {
    var n = GL.normalizeHeader(h);
    if (!n) return null;
    if (GL.HEADER_ALIASES[n]) return GL.HEADER_ALIASES[n];
    if (/đầu\s*giờ|dau\s*gio/.test(n)) return "dauGio";
    if (/15\s*(phút|phut|'|p)?/.test(n) && !/tb|trung/.test(n)) return "phut15";
    if (/(1\s*tiết|1\s*tiet|45\s*(phút|phut|'|p)?)/.test(n)) return "motTiet";
    if (/khảo\s*kinh|khao\s*kinh/.test(n)) return "khaoKinh";
    if (/đạo\s*đức|dao\s*duc/.test(n)) return "daoDuc";
    if (/^thi\b|thi\s*(học|hoc|hk|cuối|cuoi)/.test(n)) return "thi";
    if (/họ\s*tên|ho\s*ten|học\s*viên|hoc\s*vien|full\s*name/.test(n)) {
      return "fullName";
    }
    if (/tên\s*thánh|ten\s*thanh/.test(n)) return "tenThanh";
    if (/họ\s*và\s*tên\s*đệm|ho\s*va\s*ten\s*dem|họ\s*đệm|ho\s*dem|tên\s*đệm|ten\s*dem/.test(n)) {
      return "hoDem";
    }
    if (/^họ$|^ho$/.test(n)) return "hoDem";
    if (/^tên$|^ten$|tên\s*gọi|ten\s*goi/.test(n)) return "ten";
    if (/^lớp$|^lop$|tên\s*lớp|ten\s*lop|lớp\s*học|lop\s*hoc|khối|khoi/.test(n)) {
      return "lop";
    }
    if (/ghi\s*chú|ghi\s*chu|nhận\s*xét|nhan\s*xet|^note$|^notes$/.test(n)) {
      return "ghiChu";
    }
    if (/mã\s*học\s*viên|ma\s*hoc\s*vien|mã\s*hv|ma\s*hv|^mã$|^ma$/.test(n)) {
      return "maHV";
    }
    if (/ngày\s*sinh|ngay\s*sinh|năm\s*sinh|nam\s*sinh|birthday|dob/.test(n)) {
      return "ngaySinh";
    }
    if (/giới\s*tính|gioi\s*tinh|gender/.test(n)) return "gioiTinh";
    if (/giáo\s*xứ|giao\s*xu|địa\s*chỉ|dia\s*chi|address/.test(n)) {
      return "giaoXu";
    }
    if (/phụ\s*huynh|phu\s*huynh|bố\s*mẹ|bo\s*me/.test(n)) return "phuHuynh";
    if (/sđt|sdt|điện\s*thoại|dien\s*thoai|phone|tel/.test(n)) return "sdt";
    if (/^email$|e\s*mail/.test(n)) return "email";
    if (/ngày\s*nhập\s*học|ngay\s*nhap\s*hoc|vào\s*lớp|vao\s*lop/.test(n)) {
      return "ngayNhapHoc";
    }
    if (/stt|s[oố]\s*tt|^tt$|tb|x[eé]p/.test(n)) return "_skip";
    return null;
  };

  /** Parse ô Excel → mảng điểm (hỗ trợ "8,5" "8.5" "8;9") */
  GL.parseScoreCell = function parseScoreCell(val) {
    if (val == null || val === "") return [];
    if (typeof val === "number" && !Number.isNaN(val)) {
      var n = Math.round(val * 100) / 100;
      return n >= 0 && n <= 10 ? [n] : [];
    }
    var s = String(val).trim();
    if (!s) return [];
    if (/^\d+,\d+$/.test(s)) {
      var single = GL.parseScore(s);
      return single == null ? [] : [single];
    }
    var parts = s
      .split(/[;|]+|\s*,\s*(?=\d)/)
      .map(function (p) {
        return p.trim();
      })
      .filter(Boolean);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var sc = GL.parseScore(parts[i]);
      if (sc != null) out.push(sc);
    }
    return out;
  };
})(window.GL = window.GL || {});
