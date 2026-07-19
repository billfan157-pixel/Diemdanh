/**
 * Sổ Điểm GL — Core Utilities v2
 * format, toast, confirm, escapeHtml, normName, displayName, normStudent, import header mapping, uid
 * Auto-generated IIFE wrapper
 */
(function (GL) {
  "use strict";

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
      .replace(/"/g, "\"")
      .replace(/'/g, "'");
  };

  GL.parseScore = function parseScore(raw) {
    var n = parseFloat(String(raw).replace(",", "."));
    if (Number.isNaN(n) || n < 0 || n > 10) return null;
    return Math.round(n * 100) / 100;
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
    if (!st) return;
    if (st.tenThanh == null && st.hoDem == null && st.ten == null) {
      if (st.name) {
        var parts = String(st.name).trim().split(/\s+/);
        if (parts.length === 1) {
          st.ten = parts[0];
        } else if (parts.length === 2) {
          st.hoDem = parts[0];
          st.ten = parts[1];
        } else {
          st.tenThanh = parts[0];
          st.hoDem = parts.slice(1, -1).join(" ");
          st.ten = parts[parts.length - 1];
        }
      }
    }
    if (st.tenThanh == null) st.tenThanh = "";
    if (st.hoDem == null) st.hoDem = "";
    if (st.ten == null) st.ten = "";
  };

  /** Đảm bảo có scoresByTerm */
  GL.ensureStudentTerms = function ensureStudentTerms(st) {
    if (!st.scoresByTerm) st.scoresByTerm = { hk1: {}, hk2: {} };
    if (!st.scoresByTerm.hk1) st.scoresByTerm.hk1 = {};
    if (!st.scoresByTerm.hk2) st.scoresByTerm.hk2 = {};
  };

  /** Đảm bảo learningLog */
  GL.ensureLearningLog = function ensureLearningLog(st) {
    if (!Array.isArray(st.learningLog)) st.learningLog = [];
  };

  /** Header mapping cho import */
  GL.HEADER_ALIASES = {
    "ten thánh": "tenThanh",
    "họ đệm": "hoDem",
    "ten thanh": "tenThanh",
    "ho dem": "hoDem",
    hoten: "fullName",
    "họ tên": "fullName",
    "học viên": "fullName",
    "tên": "ten",
    "lop": "lop",
    "lớp": "lop",
    "ma hoc vien": "maHV",
    "mã học viên": "maHV",
    "ngay sinh": "ngaySinh",
    "ngày sinh": "ngaySinh",
    "gioi tinh": "gioiTinh",
    "giới tính": "gioiTinh",
    "ten phu huynh": "tenPhuHuynh",
    "tên phụ huynh": "tenPhuHuynh",
    "sdt": "sdt",
    "sđt": "sdt",
    "dia chi": "diaChi",
    "địa chỉ": "diaChi",
    email: "email",
  };

  GL.normalizeHeader = function normalizeHeader(h) {
    return String(h || "")
      .normalize("NFC")
      .toLowerCase()
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
    if (/^email$|e\s*mail/.test(n)) return "email";
    if (/sđt|sdt|điện\s*thoại|dien\s*thoai|phone|tel/.test(n)) return "sdt";
    if (/ngày\s*nhập\s*học|ngay\s*nhap\s*hoc|vào\s*lớp|vao\s*lop/.test(n)) {
      return "ngayNhapHoc";
    }
    if (/stt|số\s*tt|^tt$|tb|x[eé]p/.test(n)) return "_skip";
    return null;
  };

  /** Parse ô Excel -> mảng điểm (hỗ trợ "8,5" "8.5" "8;9") */
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
      var parsed = GL.parseScore(parts[i]);
      if (parsed != null) out.push(parsed);
    }
    return out;
  };

  GL.rowsToStudents = function rowsToStudents(rows, headerMap, opts) {
    opts = opts || {};
    var importTerm = opts.importTerm || "hk1";
    var importMode = opts.importMode || "merge"; // merge | append | replace
    var students = [];
    var errors = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || Object.keys(row).length === 0) continue;

      var st = {};
      var hasData = false;

      // Map name fields
      if (headerMap.fullName) {
        var full = String(row[headerMap.fullName] || "").trim();
        if (full) {
          var parts = full.split(/\s+/);
          if (parts.length === 1) {
            st.ten = parts[0];
          } else if (parts.length === 2) {
            st.hoDem = parts[0];
            st.ten = parts[1];
          } else {
            st.tenThanh = parts[0];
            st.hoDem = parts.slice(1, -1).join(" ");
            st.ten = parts[parts.length - 1];
          }
          hasData = true;
        }
      } else {
        if (headerMap.tenThanh) {
          st.tenThanh = String(row[headerMap.tenThanh] || "").trim();
          if (st.tenThanh) hasData = true;
        }
        if (headerMap.hoDem) {
          st.hoDem = String(row[headerMap.hoDem] || "").trim();
          if (st.hoDem) hasData = true;
        }
        if (headerMap.ten) {
          st.ten = String(row[headerMap.ten] || "").trim();
          if (st.ten) hasData = true;
        }
      }

      // Info fields
      var infoFields = ["maHV", "ngaySinh", "gioiTinh", "tenPhuHuynh", "sdt", "diaChi", "email"];
      for (var j = 0; j < infoFields.length; j++) {
        var key = infoFields[j];
        if (headerMap[key]) {
          st[key] = String(row[headerMap[key]] || "").trim();
          if (st[key]) hasData = true;
        }
      }

      if (!hasData) {
        errors.push({ row: i + 1, reason: "Không có dữ liệu tên" });
        continue;
      }

      GL.ensureNameFields(st);
      GL.ensureStudentTerms(st);
      GL.ensureLearningLog(st);

      // Parse scores
      var scoreCols = ["khaoKinh", "thuocBai", "chuyenCan", "baiTap", "thaiDo", "kiemTra"];
      for (var k = 0; k < scoreCols.length; k++) {
        var col = scoreCols[k];
        if (headerMap[col]) {
          var val = row[headerMap[col]];
          if (val != null && val !== "") {
            var scores = GL.parseScoreCell(val);
            if (scores.length) {
              st.scoresByTerm[importTerm][col] = scores;
            }
          }
        }
      }

      students.push(st);
    }

    return { students: students, errors: errors };
  };

  GL.buildFullBackup = function buildFullBackup() {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      state: GL.state,
      auth: GL.authStore,
      printSettings: GL.getPrintSettings ? GL.getPrintSettings() : {},
    };
  };

  GL.restoreFullBackup = function restoreFullBackup(backup, mode) {
    if (!backup || backup.version == null) return { ok: false, reason: "File backup không hợp lệ" };
    if (mode === "replace") {
      GL.state = backup.state;
      GL.authStore = backup.auth;
      if (backup.printSettings && typeof GL.applyPrintSettings === "function") {
        GL.applyPrintSettings(backup.printSettings);
      }
    } else {
      // merge logic - simplified
      if (backup.state) GL.state = backup.state;
      if (backup.auth) GL.authStore = backup.auth;
    }
    GL.saveState({ skipUndo: true });
    return { ok: true };
  };

  GL.uid = function uid() {
    return "id_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };

  /** Toast thông báo */
  GL.toast = function toast(msg, type) {
    var host = document.getElementById("toastHost");
    if (!host) return;
    var meta = {
      err: { cls: "toast-err", icon: "⚠", label: "Lỗi" },
      warn: { cls: "toast-warn", icon: "⚠", label: "Cảnh báo" },
      ok: { cls: "toast-ok", icon: "✓", label: "Thành công" },
      info: { cls: "toast-info", icon: "ℹ", label: "Thông báo" },
    };
    type = type || "info";
    var m = meta[type] || meta.info;
    var duration = arguments[2] != null ? arguments[2] : type === "err" ? 4200 : 3400;

    var item = document.createElement("div");
    item.className = "toast-item " + m.cls;
    item.setAttribute("role", type === "err" ? "alert" : "status");

    var title = arguments[1] && arguments[1].title ? arguments[1].title : (type === "err" || type === "warn" ? m.label : "");

    item.innerHTML =
      '<div class="toast-item-icon" aria-hidden="true">' +
      m.icon +
      "</div>" +
      '<div class="toast-item-body">' +
      (title ? '<div class="toast-item-title">' + GL.escapeHtml(title) + "</div>" : "") +
      '<div class="toast-item-msg">' +
      GL.escapeHtml(String(msg || "")) +
      "</div>" +
      "</div>" +
      '<button type="button" class="toast-item-close" aria-label="Đóng" title="Đóng">×</button>' +
      '<div class="toast-item-progress"></div>';

    host.appendChild(item);

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

    if (duration > 0) {
      setTimeout(closeToast, duration);
    }

    item.querySelector(".toast-item-close").addEventListener("click", closeToast);

    requestAnimationFrame(function () {
      item.classList.add("toast-item-show");
    });

    var bar = item.querySelector(".toast-item-progress");
    if (bar && duration > 0) {
      bar.style.transitionDuration = duration + "ms";
      requestAnimationFrame(function () {
        bar.style.transform = "scaleX(0)";
      });
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
   * Hộp thoại xác nhận đẹp (Promise<boolean>).
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
    o.isPrompt = false;

    return new Promise(function (resolve) {
      GL._dialogQueue.push({ opts: o, resolve: resolve });
      pumpDialogQueue();
    });
  };

  /**
   * Hộp thoại thông báo (chỉ 1 nút).
   * @returns {Promise<void>}
   */
  GL.alert = function alertDialog(messageOrOpts, opts) {
    var o = normalizeDialogOpts(messageOrOpts, opts);
    o.title = o.title || "Thông báo";
    o.okText = o.okText || "Đã hiểu";
    o.type = o.type || "info";
    o.alertOnly = true;
    o.isPrompt = false;

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
   * Hộp thoại nhập liệu (Promise<string|null>).
   * @param {string|object} messageOrOpts
   * @param {object} [opts]
   */
  GL.prompt = function promptDialog(messageOrOpts, opts) {
    var o = normalizeDialogOpts(messageOrOpts, opts);
    o.title = o.title || "Nhập thông tin";
    o.okText = o.okText || "Xong";
    o.cancelText = o.cancelText || "Hủy";
    o.isPrompt = true;
    o.alertOnly = false;

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
    if (!st) return;
    if (st.tenThanh == null && st.hoDem == null && st.ten == null) {
      if (st.name) {
        var parts = String(st.name).trim().split(/\s+/);
        if (parts.length === 1) {
          st.ten = parts[0];
        } else if (parts.length === 2) {
          st.hoDem = parts[0];
          st.ten = parts[1];
        } else {
          st.tenThanh = parts[0];
          st.hoDem = parts.slice(1, -1).join(" ");
          st.ten = parts[parts.length - 1];
        }
      }
    }
    if (st.tenThanh == null) st.tenThanh = "";
    if (st.hoDem == null) st.hoDem = "";
    if (st.ten == null) st.ten = "";
  };

  /** Đảm bảo có scoresByTerm */
  GL.ensureStudentTerms = function ensureStudentTerms(st) {
    if (!st.scoresByTerm) st.scoresByTerm = { hk1: {}, hk2: {} };
    if (!st.scoresByTerm.hk1) st.scoresByTerm.hk1 = {};
    if (!st.scoresByTerm.hk2) st.scoresByTerm.hk2 = {};
  };

  /** Đảm bảo learningLog */
  GL.ensureLearningLog = function ensureLearningLog(st) {
    if (!Array.isArray(st.learningLog)) st.learningLog = [];
  };

  /** Header mapping cho import */
  GL.HEADER_ALIASEES = {
    "ten thánh": "tenThanh",
    "họ đệm": "hoDem",
    "ten thanh": "tenThanh",
    "ho dem": "hoDem",
    hoten: "fullName",
    "họ tên": "fullName",
    "học viên": "fullName",
    "tên": "ten",
    "lop": "lop",
    "lớp": "lop",
    "ma hoc vien": "maHV",
    "mã học viên": "maHV",
    "ngay sinh": "ngaySinh",
    "ngày sinh": "ngaySinh",
    "gioi tinh": "gioiTinh",
    "giới tính": "gioiTinh",
    "ten phu huynh": "tenPhuHuynh",
    "tên phụ huynh": "tenPhuHuynh",
    "sdt": "sdt",
    "sđt": "sdt",
    "dia chi": "diaChi",
    "địa chỉ": "diaChi",
    email: "email",
  };

  GL.normalizeHeader = function normalizeHeader(h) {
    return String(h || "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  GL.mapHeader = function mapHeader(h) {
    var n = GL.normalizeHeader(h);
    if (!n) return null;
    if (GL.HEADER_ALIASEES[n]) return GL.HEADER_ALIASEES[n];
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
    if (/^email$|e\s*mail/.test(n)) return "email";
    if (/sđt|sdt|điện\s*thoại|dien\s*thoai|phone|tel/.test(n)) return "sdt";
    if (/ngày\s*nhập\s*học|ngay\s*nhap\s*hoc|vào\s*lớp|vao\s*lop/.test(n)) {
      return "ngayNhapHoc";
    }
    if (/stt|s[oố]\s*tt|^tt$|tb|x[eé]p/.test(n)) return "_skip";
    return null;
  };

  /** Parse ô Excel -> mảng điểm (hỗ trợ "8,5" "8.5" "8;9") */
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
      var parsed = GL.parseScore(parts[i]);
      if (parsed != null) out.push(parsed);
    }
    return out;
  };

  GL.rowsToStudents = function rowsToStudents(rows, headerMap, opts) {
    opts = opts || {};
    var importTerm = opts.importTerm || "hk1";
    var importMode = opts.importMode || "merge"; // merge | append | replace
    var students = [];
    var errors = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || Object.keys(row).length === 0) continue;

      var st = {};
      var hasData = false;

      // Map name fields
      if (headerMap.fullName) {
        var full = String(row[headerMap.fullName] || "").trim();
        if (full) {
          var parts = full.split(/\s+/);
          if (parts.length === 1) {
            st.ten = parts[0];
          } else if (parts.length === 2) {
            st.hoDem = parts[0];
            st.ten = parts[1];
          } else {
            st.tenThanh = parts[0];
            st.hoDem = parts.slice(1, -1).join(" ");
            st.ten = parts[parts.length - 1];
          }
          hasData = true;
        }
      } else {
        if (headerMap.tenThanh) {
          st.tenThanh = String(row[headerMap.tenThanh] || "").trim();
          if (st.tenThanh) hasData = true;
        }
        if (headerMap.hoDem) {
          st.hoDem = String(row[headerMap.hoDem] || "").trim();
          if (st.hoDem) hasData = true;
        }
        if (headerMap.ten) {
          st.ten = String(row[headerMap.ten] || "").trim();
          if (st.ten) hasData = true;
        }
      }

      // Info fields
      var infoFields = ["maHV", "ngaySinh", "gioiTinh", "tenPhuHuynh", "sdt", "diaChi", "email"];
      for (var j = 0; j < infoFields.length; j++) {
        var key = infoFields[j];
        if (headerMap[key]) {
          st[key] = String(row[headerMap[key]] || "").trim();
          if (st[key]) hasData = true;
        }
      }

      if (!hasData) {
        errors.push({ row: i + 1, reason: "Không có dữ liệu tên" });
        continue;
      }

      GL.ensureNameFields(st);
      GL.ensureStudentTerms(st);
      GL.ensureLearningLog(st);

      // Parse scores
      var scoreCols = ["khaoKinh", "thuocBai", "chuyenCan", "baiTap", "thaiDo", "kiemTra"];
      for (var k = 0; k < scoreCols.length; k++) {
        var col = scoreCols[k];
        if (headerMap[col]) {
          var val = row[headerMap[col]];
          if (val != null && val !== "") {
            var scores = GL.parseScoreCell(val);
            if (scores.length) {
              st.scoresByTerm[importTerm][col] = scores;
            }
          }
        }
      }

      students.push(st);
    }

    return { students: students, errors: errors };
  };

  GL.buildFullBackup = function buildFullBackup() {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      state: GL.state,
      auth: GL.authStore,
      printSettings: GL.getPrintSettings ? GL.getPrintSettings() : {},
    };
  };

  GL.restoreFullBackup = function restoreFullBackup(backup, mode) {
    if (!backup || backup.version == null) return { ok: false, reason: "File backup không hợp lệ" };
    if (mode === "replace") {
      GL.state = backup.state;
      GL.authStore = backup.auth;
      if (backup.printSettings && typeof GL.applyPrintSettings === "function") {
        GL.applyPrintSettings(backup.printSettings);
      }
    } else {
      // merge logic - simplified
      if (backup.state) GL.state = backup.state;
      if (backup.auth) GL.authStore = backup.auth;
    }
    GL.saveState({ skipUndo: true });
    return { ok: true };
  };

  GL.uid = function uid() {
    return "id_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };
})(window.GL = window.GL || {});