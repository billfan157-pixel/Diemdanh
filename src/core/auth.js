/**
 * Phân quyền local: Ban Giáo lý (admin) / Giáo lý viên (theo lớp).
 * PIN được băm bằng PBKDF2 (WebCrypto); không lưu PIN dạng đọc được.
 */
(function (GL) {
  "use strict";

  /** Hash DJB2 cũ — chỉ giữ để nhận dữ liệu bản trước rồi nâng cấp dần */
  function simpleHash(str) {
    var h = 5381;
    str = String(str || "");
    for (var i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  var PBKDF2_ITERATIONS = 150000;
  var PBKDF2_PREFIX = "pbkdf2";

  function bufToB64(buf) {
    var bytes = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function b64ToBuf(b64) {
    var s = atob(String(b64 || ""));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function subtleAvailable() {
    return !!(
      typeof crypto !== "undefined" &&
      crypto.subtle &&
      crypto.getRandomValues
    );
  }

  function pbkdf2Raw(pin, saltBytes, iterations) {
    return crypto.subtle
      .importKey(
        "raw",
        new TextEncoder().encode(String(pin)),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      )
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: "PBKDF2", salt: saltBytes, iterations: iterations, hash: "SHA-256" },
          key,
          256
        );
      });
  }

  /**
   * Băm PIN → "pbkdf2$<iterations>$<saltB64>$<hashB64>".
   * Máy không có WebCrypto (rất hiếm) → fallback hash cũ.
   * @returns {Promise<string>}
   */
  function hashPinAsync(pin) {
    pin = normalizePin(pin);
    if (!subtleAvailable()) return Promise.resolve(simpleHash(pin));
    var salt = crypto.getRandomValues(new Uint8Array(16));
    return pbkdf2Raw(pin, salt, PBKDF2_ITERATIONS).then(function (bits) {
      return (
        PBKDF2_PREFIX +
        "$" +
        PBKDF2_ITERATIONS +
        "$" +
        bufToB64(salt) +
        "$" +
        bufToB64(bits)
      );
    });
  }

  function isPbkdf2Hash(hash) {
    return (
      typeof hash === "string" && hash.indexOf(PBKDF2_PREFIX + "$") === 0
    );
  }

  /** Chuẩn hóa PIN khi so sánh / lưu (bỏ khoảng trắng 2 đầu) */
  function normalizePin(pin) {
    return String(pin == null ? "" : pin).trim();
  }

  /**
   * Kiểm tra PIN có khớp user không (async).
   * Hỗ trợ hash PBKDF2 mới + hash DJB2 / pinPlain của bản cũ.
   * Khớp bằng đường cũ → tự nâng cấp lên PBKDF2 và xóa pinPlain.
   * @returns {Promise<boolean>}
   */
  function verifyUserPin(user, pin) {
    if (!user) return Promise.resolve(false);
    pin = normalizePin(pin);
    if (!pin) return Promise.resolve(false);

    if (isPbkdf2Hash(user.pinHash)) {
      var parts = String(user.pinHash).split("$");
      if (parts.length !== 4 || !subtleAvailable()) {
        return Promise.resolve(false);
      }
      var iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
      return pbkdf2Raw(pin, b64ToBuf(parts[2]), iterations).then(function (bits) {
        return bufToB64(bits) === parts[3];
      });
    }

    // Dữ liệu cũ: DJB2 hoặc pinPlain
    var legacyOk =
      (user.pinHash && String(user.pinHash) === simpleHash(pin)) ||
      (user.pinPlain != null && String(user.pinPlain) === pin);
    if (!legacyOk) return Promise.resolve(false);
    // Nâng cấp hash + dọn pinPlain
    return hashPinAsync(pin).then(function (h) {
      user.pinHash = h;
      delete user.pinPlain;
      if (typeof GL.saveAuthStore === "function") GL.saveAuthStore();
      return true;
    });
  }

  GL.normalizePin = normalizePin;
  GL.verifyUserPin = verifyUserPin;
  GL.hashPinAsync = hashPinAsync;
  GL.isPbkdf2Hash = isPbkdf2Hash;

  function defaultAuth() {
    var adminId = "admin-" + Date.now().toString(36);
    return {
      version: 1,
      users: [
        {
          id: adminId,
          username: "admin",
          displayName: "Ban Giáo lý",
          role: "ban_gl",
          pinHash: simpleHash("1234"), // PIN mặc định — bị bắt đổi ngay lần đầu
          classIds: [], // rỗng = tất cả (ban_gl)
          active: true,
        },
      ],
    };
  }

  function loadAuth() {
    try {
      var raw = localStorage.getItem(GL.AUTH_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && Array.isArray(p.users) && p.users.length) return p;
      }
    } catch (e) {
      /* ignore */
    }
    var d = defaultAuth();
    localStorage.setItem(GL.AUTH_KEY, JSON.stringify(d));
    return d;
  }

  /** Dọn pinPlain khỏi store (dữ liệu bản cũ) — hash cũ vẫn đăng nhập được */
  function scrubPinPlain(store) {
    var changed = false;
    (store.users || []).forEach(function (u) {
      if (u && u.pinPlain != null) {
        // Giữ khả năng đăng nhập: nếu chưa có hash, sinh hash cũ từ plain
        if (!u.pinHash) u.pinHash = simpleHash(normalizePin(u.pinPlain));
        delete u.pinPlain;
        changed = true;
      }
    });
    return changed;
  }

  GL.authStore = loadAuth();
  if (scrubPinPlain(GL.authStore)) {
    localStorage.setItem(GL.AUTH_KEY, JSON.stringify(GL.authStore));
  }
  GL.scrubPinPlain = scrubPinPlain;

  GL.saveAuthStore = function saveAuthStore() {
    scrubPinPlain(GL.authStore);
    localStorage.setItem(GL.AUTH_KEY, JSON.stringify(GL.authStore));
  };

  GL.legacyHashPin = simpleHash;

  /** PIN mặc định / yếu (cần đổi) */
  GL.DEFAULT_WEAK_PINS = ["1234", "0000", "1111", "2222", "admin", "password"];

  /**
   * User hiện tại (hoặc user đưa vào) còn dùng PIN yếu / mặc định?
   */
  GL.userHasWeakPin = function userHasWeakPin(user) {
    user = user || (typeof GL.currentUser === "function" ? GL.currentUser() : null);
    if (!user) return false;
    if (user.pinIsWeak === true) return true;
    var weak = GL.DEFAULT_WEAK_PINS || ["1234"];
    for (var i = 0; i < weak.length; i++) {
      if (user.pinHash === simpleHash(weak[i])) return true;
      if (user.pinPlain != null && String(user.pinPlain) === weak[i]) return true;
    }
    return false;
  };

  function markPinStrength(user, pin) {
    var weak = GL.DEFAULT_WEAK_PINS || ["1234"];
    user.pinIsWeak = weak.indexOf(normalizePin(pin)) >= 0;
  }

  /** Bắt buộc đổi PIN sau đăng nhập (PIN yếu) */
  GL.mustChangePin = function mustChangePin() {
    return GL.userHasWeakPin(GL.currentUser());
  };

  GL.currentUser = function currentUser() {
    try {
      var sid = sessionStorage.getItem(GL.SESSION_KEY);
      if (!sid) {
        // fallback localStorage session (nhớ đăng nhập)
        sid = localStorage.getItem(GL.SESSION_KEY);
      }
      if (!sid) return null;
      return (
        GL.authStore.users.find(function (u) {
          return u.id === sid && u.active !== false;
        }) || null
      );
    } catch (e) {
      return null;
    }
  };

  GL.isLoggedIn = function isLoggedIn() {
    return !!GL.currentUser();
  };

  GL.isBanGL = function isBanGL() {
    var u = GL.currentUser();
    return !!(u && u.role === "ban_gl");
  };

  GL.isGLV = function isGLV() {
    var u = GL.currentUser();
    return !!(u && u.role === "glv");
  };

  GL.canAccessClass = function canAccessClass(classId) {
    var u = GL.currentUser();
    if (!u) return false;
    if (u.role === "ban_gl") return true;
    return (u.classIds || []).indexOf(classId) >= 0;
  };

  GL.canManageUsers = function canManageUsers() {
    return GL.isBanGL();
  };

  GL.canDeleteClass = function canDeleteClass() {
    return GL.isBanGL();
  };

  GL.canCreateClass = function canCreateClass() {
    return GL.isBanGL() || GL.isGLV();
  };

  /** Nhập file: chỉ Ban GL */
  GL.canImport = function canImport() {
    return GL.isBanGL();
  };

  /** Xuất điểm 1 lớp: mọi tài khoản đã đăng nhập */
  GL.canExport = function canExport() {
    return GL.isLoggedIn();
  };

  /** Xuất nhiều lớp 1 file: chỉ Ban GL */
  GL.canExportMultiClass = function canExportMultiClass() {
    return GL.isBanGL();
  };

  /** Chức năng chỉ admin (Ban GL): lịch sử, hệ số, sao lưu, mời họp PH */
  GL.requireBanGL = function requireBanGL(msg) {
    if (GL.isBanGL()) return true;
    if (typeof GL.toast === "function") {
      GL.toast(
        msg || "Chỉ tài khoản Ban Giáo lý (admin) được dùng chức năng này.",
        "err"
      );
    }
    return false;
  };

  /** Danh sách lớp user được xem */
  GL.visibleClasses = function visibleClasses() {
    var all = (GL.state && GL.state.classes) || [];
    var u = GL.currentUser();
    if (!u) return [];
    if (u.role === "ban_gl") return all.slice();
    return all.filter(function (c) {
      return (u.classIds || []).indexOf(c.id) >= 0;
    });
  };

  /** Đăng nhập (async — PBKDF2). @returns {Promise<{ok:boolean,user?:object,error?:string}>} */
  GL.login = function login(username, pin, remember) {
    username = String(username || "")
      .trim()
      .toLowerCase();
    pin = normalizePin(pin);
    var user = GL.authStore.users.find(function (u) {
      return (
        u.active !== false &&
        String(u.username || "").toLowerCase() === username
      );
    });
    if (!user) {
      return Promise.resolve({ ok: false, error: "Sai tài khoản hoặc PIN." });
    }
    return verifyUserPin(user, pin).then(function (ok) {
      if (!ok) return { ok: false, error: "Sai tài khoản hoặc PIN." };
      markPinStrength(user, pin);
      GL.saveAuthStore();
      sessionStorage.setItem(GL.SESSION_KEY, user.id);
      if (remember) localStorage.setItem(GL.SESSION_KEY, user.id);
      else localStorage.removeItem(GL.SESSION_KEY);
      return { ok: true, user: user };
    });
  };

  GL.logout = function logout() {
    sessionStorage.removeItem(GL.SESSION_KEY);
    localStorage.removeItem(GL.SESSION_KEY);
  };

  /** Tạo tài khoản (async — PBKDF2). @returns {Promise<{ok:boolean,user?:object,error?:string}>} */
  GL.createUser = function createUser(data) {
    if (!GL.canManageUsers()) {
      return Promise.resolve({ ok: false, error: "Không có quyền." });
    }
    var username = String(data.username || "")
      .trim()
      .toLowerCase();
    if (!username) {
      return Promise.resolve({ ok: false, error: "Nhập tên đăng nhập." });
    }
    if (
      GL.authStore.users.some(function (u) {
        return String(u.username).toLowerCase() === username;
      })
    ) {
      return Promise.resolve({ ok: false, error: "Tên đăng nhập đã tồn tại." });
    }
    var pin = normalizePin(data.pin);
    if (pin.length < 4) {
      return Promise.resolve({ ok: false, error: "PIN tối thiểu 4 ký tự." });
    }
    return hashPinAsync(pin).then(function (h) {
      var user = {
        id: GL.uid(),
        username: username,
        displayName: String(data.displayName || username).trim(),
        role: data.role === "ban_gl" ? "ban_gl" : "glv",
        pinHash: h,
        classIds: Array.isArray(data.classIds) ? data.classIds.slice() : [],
        active: true,
      };
      markPinStrength(user, pin);
      GL.authStore.users.push(user);
      GL.saveAuthStore();
      return { ok: true, user: user };
    });
  };

  /** Cập nhật tài khoản (async khi đổi PIN). @returns {Promise<{ok:boolean,user?:object,error?:string}>} */
  GL.updateUser = function updateUser(userId, patch) {
    if (!GL.canManageUsers()) {
      return Promise.resolve({ ok: false, error: "Không có quyền." });
    }
    var user = GL.authStore.users.find(function (u) {
      return u.id === userId;
    });
    if (!user) {
      return Promise.resolve({ ok: false, error: "Không tìm thấy user." });
    }

    // Đổi tên đăng nhập
    if (patch.username != null) {
      var un = String(patch.username || "")
        .trim()
        .toLowerCase();
      if (!un) {
        return Promise.resolve({ ok: false, error: "Tên đăng nhập không được trống." });
      }
      if (!/^[a-z0-9._-]{2,32}$/i.test(un)) {
        return Promise.resolve({
          ok: false,
          error: "Tên đăng nhập: 2–32 ký tự (chữ, số, . _ -).",
        });
      }
      var taken = GL.authStore.users.some(function (u) {
        return (
          u.id !== userId &&
          String(u.username || "").toLowerCase() === un
        );
      });
      if (taken) {
        return Promise.resolve({ ok: false, error: "Tên đăng nhập đã được dùng." });
      }
      user.username = un;
    }

    if (patch.displayName != null) {
      user.displayName = String(patch.displayName).trim() || user.username;
    }
    if (patch.role === "ban_gl" || patch.role === "glv") user.role = patch.role;
    if (Array.isArray(patch.classIds)) user.classIds = patch.classIds.slice();
    if (patch.active === false || patch.active === true) user.active = patch.active;

    if (patch.pin != null && String(patch.pin).length > 0) {
      var newPin = normalizePin(patch.pin);
      if (newPin.length < 4) {
        return Promise.resolve({ ok: false, error: "PIN mới tối thiểu 4 ký tự." });
      }
      var weakList = GL.DEFAULT_WEAK_PINS || ["1234"];
      if (weakList.indexOf(newPin) >= 0) {
        return Promise.resolve({
          ok: false,
          error: "PIN quá yếu (vd. 1234). Hãy chọn PIN khác.",
        });
      }
      return hashPinAsync(newPin).then(function (h) {
        user.pinHash = h;
        markPinStrength(user, newPin);
        user.pinChangedAt = new Date().toISOString();
        GL.saveAuthStore();
        return { ok: true, user: user };
      });
    }

    GL.saveAuthStore();
    return Promise.resolve({ ok: true, user: user });
  };

  /**
   * Xóa tài khoản (chỉ Ban GL).
   * Không xóa chính mình; phải còn ít nhất 1 Ban GL.
   */
  GL.deleteUser = function deleteUser(userId) {
    if (!GL.canManageUsers()) return { ok: false, error: "Không có quyền." };
    var me = GL.currentUser();
    if (me && me.id === userId) {
      return { ok: false, error: "Không thể xóa tài khoản đang đăng nhập." };
    }
    var user = GL.authStore.users.find(function (u) {
      return u.id === userId;
    });
    if (!user) return { ok: false, error: "Không tìm thấy user." };

    var banCount = GL.authStore.users.filter(function (u) {
      return u.role === "ban_gl" && u.active !== false;
    }).length;
    if (user.role === "ban_gl" && banCount <= 1) {
      return {
        ok: false,
        error: "Không thể xóa Ban GL cuối cùng. Hãy tạo Ban GL khác trước.",
      };
    }

    GL.authStore.users = GL.authStore.users.filter(function (u) {
      return u.id !== userId;
    });
    GL.saveAuthStore();
    return { ok: true };
  };

  /**
   * PIN không còn lưu dạng đọc được (bảo mật).
   * Quên PIN → Ban GL đặt PIN mới cho tài khoản.
   */
  GL.getUserPinPlain = function getUserPinPlain() {
    return null;
  };

  /**
   * Đổi PIN tài khoản đang đăng nhập (mọi vai trò).
   * @param {string} oldPin
   * @param {string} newPin
   * @param {string} confirmPin
   */
  GL.changeOwnPin = function changeOwnPin(oldPin, newPin, confirmPin) {
    var sessionUser = GL.currentUser();
    if (!sessionUser) {
      return Promise.resolve({ ok: false, error: "Chưa đăng nhập." });
    }
    // Luôn lấy bản trong authStore (tránh object session cũ / lệch sau sync)
    var user = GL.authStore.users.find(function (x) {
      return x.id === sessionUser.id;
    });
    if (!user) {
      return Promise.resolve({ ok: false, error: "Không tìm thấy tài khoản." });
    }

    oldPin = normalizePin(oldPin);
    newPin = normalizePin(newPin);
    confirmPin = normalizePin(confirmPin);

    if (!oldPin) {
      return Promise.resolve({
        ok: false,
        error: "Nhập PIN hiện tại (PIN đang dùng để đăng nhập).",
      });
    }
    if (newPin.length < 4) {
      return Promise.resolve({ ok: false, error: "PIN mới tối thiểu 4 ký tự." });
    }
    if (newPin !== confirmPin) {
      return Promise.resolve({ ok: false, error: "Hai ô PIN mới không khớp nhau." });
    }
    if (newPin === oldPin) {
      return Promise.resolve({ ok: false, error: "PIN mới phải khác PIN hiện tại." });
    }
    var weak = GL.DEFAULT_WEAK_PINS || ["1234"];
    if (weak.indexOf(newPin) >= 0) {
      return Promise.resolve({
        ok: false,
        error: "PIN quá yếu (vd. 1234). Hãy chọn PIN khác, khó đoán hơn.",
      });
    }

    return verifyUserPin(user, oldPin).then(function (ok) {
      if (!ok) {
        // Gợi ý rõ nếu user nhầm điền PIN mới vào ô cũ
        return verifyUserPin(user, newPin).then(function (newIsCurrent) {
          if (newIsCurrent) {
            return {
              ok: false,
              error:
                "Ô «PIN hiện tại» đang giống PIN mới. Hãy ghi PIN đang đăng nhập vào ô trên, PIN mới vào 2 ô dưới.",
            };
          }
          return {
            ok: false,
            error:
              "PIN hiện tại không đúng. Dùng đúng PIN lúc đăng nhập (không phải PIN mới).",
          };
        });
      }
      return hashPinAsync(newPin).then(function (h) {
        user.pinHash = h;
        markPinStrength(user, newPin);
        user.pinChangedAt = new Date().toISOString();
        GL.saveAuthStore();
        return { ok: true, user: user };
      });
    });
  };

  GL.ensureActiveClassAccessible = function ensureActiveClassAccessible() {
    if (!GL.state) return;
    var vis = GL.visibleClasses();
    if (!vis.length) {
      GL.state.activeClassId = null;
      return;
    }
    if (!GL.canAccessClass(GL.state.activeClassId)) {
      GL.state.activeClassId = vis[0].id;
      if (typeof GL.saveState === "function") {
        GL.saveState({ skipUndo: true });
      }
    }
  };

  /** In settings (giáo xứ…) */
  GL.getPrintSettings = function getPrintSettings() {
    try {
      var raw = localStorage.getItem(GL.PRINT_KEY);
      if (raw) return Object.assign(GL.defaultPrintSettings(), JSON.parse(raw));
    } catch (e) {
      /* ignore */
    }
    return GL.defaultPrintSettings();
  };

  GL.defaultPrintSettings = function defaultPrintSettings() {
    return {
      giaoHat: "Giáo hạt …",
      giaoXu: "Giáo xứ …",
      tieuDe: "BẢNG ĐIỂM GIÁO LÝ",
      namHoc: "",
      glvName: "",
      banGLName: "Trưởng Ban Giáo lý",
      footerNote: "Học viên / Phụ huynh giữ bản sao. Bản gốc lưu tại Ban Giáo lý.",
    };
  };

  GL.savePrintSettings = function savePrintSettings(s) {
    localStorage.setItem(GL.PRINT_KEY, JSON.stringify(s));
  };
})(window.GL = window.GL || {});
