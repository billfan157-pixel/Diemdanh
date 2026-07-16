/**
 * Phân quyền local: Ban Giáo lý (admin) / Giáo lý viên (theo lớp).
 * Lưu trên máy — PIN đơn giản (không phải bảo mật cấp cao).
 */
(function (GL) {
  "use strict";

  function simpleHash(str) {
    var h = 5381;
    str = String(str || "");
    for (var i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

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
          pinHash: simpleHash("1234"),
          pinPlain: "1234", // để admin xem/đặt lại (app local)
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

  GL.authStore = loadAuth();

  GL.saveAuthStore = function saveAuthStore() {
    localStorage.setItem(GL.AUTH_KEY, JSON.stringify(GL.authStore));
  };

  GL.hashPin = simpleHash;

  /** PIN mặc định / yếu (cần đổi) */
  GL.DEFAULT_WEAK_PINS = ["1234", "0000", "1111", "2222", "admin", "password"];

  /**
   * User hiện tại (hoặc user đưa vào) còn dùng PIN yếu / mặc định?
   */
  GL.userHasWeakPin = function userHasWeakPin(user) {
    user = user || (typeof GL.currentUser === "function" ? GL.currentUser() : null);
    if (!user) return false;
    var weak = GL.DEFAULT_WEAK_PINS || ["1234"];
    for (var i = 0; i < weak.length; i++) {
      if (user.pinHash === simpleHash(weak[i])) return true;
      if (user.pinPlain != null && String(user.pinPlain) === weak[i]) return true;
    }
    return false;
  };

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

  GL.login = function login(username, pin, remember) {
    username = String(username || "")
      .trim()
      .toLowerCase();
    pin = String(pin || "");
    var user = GL.authStore.users.find(function (u) {
      return (
        u.active !== false &&
        String(u.username || "").toLowerCase() === username
      );
    });
    if (!user) return { ok: false, error: "Sai tài khoản hoặc PIN." };
    if (user.pinHash !== simpleHash(pin)) {
      return { ok: false, error: "Sai tài khoản hoặc PIN." };
    }
    // Tài khoản cũ: lưu PIN dạng xem (admin) sau lần đăng nhập đúng đầu tiên
    if (!user.pinPlain) {
      user.pinPlain = pin;
      GL.saveAuthStore();
    }
    sessionStorage.setItem(GL.SESSION_KEY, user.id);
    if (remember) localStorage.setItem(GL.SESSION_KEY, user.id);
    else localStorage.removeItem(GL.SESSION_KEY);
    return { ok: true, user: user };
  };

  GL.logout = function logout() {
    sessionStorage.removeItem(GL.SESSION_KEY);
    localStorage.removeItem(GL.SESSION_KEY);
  };

  GL.createUser = function createUser(data) {
    if (!GL.canManageUsers()) return { ok: false, error: "Không có quyền." };
    var username = String(data.username || "")
      .trim()
      .toLowerCase();
    if (!username) return { ok: false, error: "Nhập tên đăng nhập." };
    if (
      GL.authStore.users.some(function (u) {
        return String(u.username).toLowerCase() === username;
      })
    ) {
      return { ok: false, error: "Tên đăng nhập đã tồn tại." };
    }
    var pin = String(data.pin || "");
    if (pin.length < 4) return { ok: false, error: "PIN tối thiểu 4 ký tự." };
    var user = {
      id: GL.uid(),
      username: username,
      displayName: String(data.displayName || username).trim(),
      role: data.role === "ban_gl" ? "ban_gl" : "glv",
      pinHash: simpleHash(pin),
      pinPlain: pin, // admin có thể xem (app local, không phải bảo mật cao)
      classIds: Array.isArray(data.classIds) ? data.classIds.slice() : [],
      active: true,
    };
    GL.authStore.users.push(user);
    GL.saveAuthStore();
    return { ok: true, user: user };
  };

  GL.updateUser = function updateUser(userId, patch) {
    if (!GL.canManageUsers()) return { ok: false, error: "Không có quyền." };
    var user = GL.authStore.users.find(function (u) {
      return u.id === userId;
    });
    if (!user) return { ok: false, error: "Không tìm thấy user." };

    // Đổi tên đăng nhập
    if (patch.username != null) {
      var un = String(patch.username || "")
        .trim()
        .toLowerCase();
      if (!un) return { ok: false, error: "Tên đăng nhập không được trống." };
      if (!/^[a-z0-9._-]{2,32}$/i.test(un)) {
        return {
          ok: false,
          error: "Tên đăng nhập: 2–32 ký tự (chữ, số, . _ -).",
        };
      }
      var taken = GL.authStore.users.some(function (u) {
        return (
          u.id !== userId &&
          String(u.username || "").toLowerCase() === un
        );
      });
      if (taken) return { ok: false, error: "Tên đăng nhập đã được dùng." };
      user.username = un;
    }

    if (patch.displayName != null) {
      user.displayName = String(patch.displayName).trim() || user.username;
    }
    if (patch.role === "ban_gl" || patch.role === "glv") user.role = patch.role;
    if (Array.isArray(patch.classIds)) user.classIds = patch.classIds.slice();
    if (patch.pin != null && String(patch.pin).length > 0) {
      var newPin = String(patch.pin);
      if (newPin.length < 4) {
        return { ok: false, error: "PIN mới tối thiểu 4 ký tự." };
      }
      var weakList = GL.DEFAULT_WEAK_PINS || ["1234"];
      if (weakList.indexOf(newPin) >= 0) {
        return {
          ok: false,
          error: "PIN quá yếu (vd. 1234). Hãy chọn PIN khác.",
        };
      }
      user.pinHash = simpleHash(newPin);
      user.pinPlain = newPin;
      user.pinChangedAt = new Date().toISOString();
    }
    if (patch.active === false || patch.active === true) user.active = patch.active;
    GL.saveAuthStore();
    return { ok: true, user: user };
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

  /** PIN dạng xem được (admin). Tài khoản cũ chưa có pinPlain → null */
  GL.getUserPinPlain = function getUserPinPlain(userId) {
    if (!GL.canManageUsers()) return null;
    var user = GL.authStore.users.find(function (u) {
      return u.id === userId;
    });
    if (!user) return null;
    if (user.pinPlain != null && String(user.pinPlain).length) {
      return String(user.pinPlain);
    }
    return null;
  };

  /**
   * Đổi PIN tài khoản đang đăng nhập (mọi vai trò).
   * @param {string} oldPin
   * @param {string} newPin
   * @param {string} confirmPin
   */
  GL.changeOwnPin = function changeOwnPin(oldPin, newPin, confirmPin) {
    var u = GL.currentUser();
    if (!u) return { ok: false, error: "Chưa đăng nhập." };
    oldPin = String(oldPin || "");
    newPin = String(newPin || "");
    confirmPin = String(confirmPin || "");
    if (!oldPin) return { ok: false, error: "Nhập PIN hiện tại." };
    if (u.pinHash !== simpleHash(oldPin)) {
      return { ok: false, error: "PIN hiện tại không đúng." };
    }
    if (newPin.length < 4) {
      return { ok: false, error: "PIN mới tối thiểu 4 ký tự." };
    }
    if (newPin !== confirmPin) {
      return { ok: false, error: "Xác nhận PIN mới không khớp." };
    }
    if (newPin === oldPin) {
      return { ok: false, error: "PIN mới phải khác PIN hiện tại." };
    }
    var user = GL.authStore.users.find(function (x) {
      return x.id === u.id;
    });
    if (!user) return { ok: false, error: "Không tìm thấy tài khoản." };
    // Không cho đặt lại PIN yếu
    var weak = GL.DEFAULT_WEAK_PINS || ["1234"];
    if (weak.indexOf(newPin) >= 0) {
      return {
        ok: false,
        error: "PIN quá yếu (vd. 1234). Hãy chọn PIN khác, khó đoán hơn.",
      };
    }
    user.pinHash = simpleHash(newPin);
    user.pinPlain = newPin;
    user.pinChangedAt = new Date().toISOString();
    GL.saveAuthStore();
    return { ok: true, user: user };
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
