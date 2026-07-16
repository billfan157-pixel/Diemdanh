/**
 * Mở khóa Face ID / Touch ID / vân tay qua WebAuthn (platform authenticator).
 * Cần HTTPS hoặc localhost — không chạy ổn định với file://
 */
(function (GL) {
  "use strict";

  function bufToB64(buf) {
    var bytes = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64ToBuf(b64) {
    b64 = String(b64 || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var s = atob(b64);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out.buffer;
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(GL.BIO_KEY || "giao-ly-bio-v1");
      if (raw) {
        var p = JSON.parse(raw);
        if (p && Array.isArray(p.creds)) return p;
      }
    } catch (e) {
      /* ignore */
    }
    return { version: 1, creds: [] };
  }

  function saveStore(store) {
    localStorage.setItem(
      GL.BIO_KEY || "giao-ly-bio-v1",
      JSON.stringify(store)
    );
  }

  function randomChallenge() {
    var c = new Uint8Array(32);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(c);
    else {
      for (var i = 0; i < 32; i++) c[i] = (Math.random() * 256) | 0;
    }
    return c;
  }

  function rpId() {
    var h = location.hostname || "";
    if (!h || h === "localhost" || h === "127.0.0.1") return h || undefined;
    return h;
  }

  /** Trình duyệt / thiết bị có hỗ trợ sinh trắc platform? */
  GL.bioIsSupported = function bioIsSupported() {
    return !!(
      window.PublicKeyCredential &&
      typeof navigator.credentials !== "undefined" &&
      typeof navigator.credentials.create === "function" &&
      typeof navigator.credentials.get === "function" &&
      window.isSecureContext
    );
  };

  GL.bioIsPlatformAvailable = function bioIsPlatformAvailable() {
    if (!GL.bioIsSupported()) return Promise.resolve(false);
    if (
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
    ) {
      return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(
        function () {
          return false;
        }
      );
    }
    return Promise.resolve(true);
  };

  GL.bioListCreds = function bioListCreds() {
    return loadStore().creds.slice();
  };

  GL.bioHasAny = function bioHasAny() {
    return loadStore().creds.length > 0;
  };

  GL.bioIsEnabledForUser = function bioIsEnabledForUser(userId) {
    if (!userId) return false;
    return loadStore().creds.some(function (c) {
      return c.userId === userId;
    });
  };

  /** Ghi session sau khi xác thực sinh trắc */
  GL.loginWithUserId = function loginWithUserId(userId, remember) {
    var user =
      (GL.authStore.users || []).find(function (u) {
        return u.id === userId && u.active !== false;
      }) || null;
    if (!user) return { ok: false, error: "Tài khoản không còn tồn tại." };
    sessionStorage.setItem(GL.SESSION_KEY, user.id);
    if (remember !== false) localStorage.setItem(GL.SESSION_KEY, user.id);
    else localStorage.removeItem(GL.SESSION_KEY);
    return { ok: true, user: user };
  };

  /**
   * Đăng ký Face ID / vân tay cho user đang đăng nhập.
   * @returns {Promise<{ok:boolean, error?:string}>}
   */
  GL.bioRegister = function bioRegister() {
    return new Promise(function (resolve) {
      if (!GL.bioIsSupported()) {
        resolve({
          ok: false,
          error:
            "Thiết bị/trình duyệt không hỗ trợ Face ID · vân tay. Cần HTTPS (vd. GitHub Pages) hoặc localhost.",
        });
        return;
      }
      var user = typeof GL.currentUser === "function" ? GL.currentUser() : null;
      if (!user) {
        resolve({ ok: false, error: "Hãy đăng nhập bằng PIN trước." });
        return;
      }

      var userIdBytes = new TextEncoder().encode(String(user.id));
      var pubKey = {
        challenge: randomChallenge(),
        rp: {
          name: "Sổ Điểm Giáo Lý",
          id: rpId(),
        },
        user: {
          id: userIdBytes,
          name: String(user.username || user.id),
          displayName: String(user.displayName || user.username || "User"),
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
          requireResidentKey: false,
        },
        timeout: 90000,
        attestation: "none",
      };
      // Bỏ rp.id nếu empty (file://)
      if (!pubKey.rp.id) delete pubKey.rp.id;

      navigator.credentials
        .create({ publicKey: pubKey })
        .then(function (cred) {
          if (!cred || !cred.rawId) {
            resolve({ ok: false, error: "Không tạo được khóa sinh trắc." });
            return;
          }
          var store = loadStore();
          // Một user / máy: thay credential cũ
          store.creds = store.creds.filter(function (c) {
            return c.userId !== user.id;
          });
          store.creds.push({
            userId: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            credentialId: bufToB64(cred.rawId),
            createdAt: new Date().toISOString(),
          });
          saveStore(store);
          resolve({ ok: true, user: user });
        })
        .catch(function (err) {
          var name = (err && err.name) || "";
          var msg = (err && err.message) || String(err || "");
          if (name === "NotAllowedError") {
            resolve({
              ok: false,
              error: "Đã hủy hoặc thiết bị từ chối sinh trắc.",
            });
          } else if (name === "InvalidStateError") {
            resolve({
              ok: false,
              error: "Khóa đã tồn tại trên thiết bị. Thử tắt rồi bật lại.",
            });
          } else if (name === "SecurityError") {
            resolve({
              ok: false,
              error:
                "Cần mở app qua HTTPS (GitHub Pages) hoặc localhost — không dùng file://",
            });
          } else {
            resolve({
              ok: false,
              error: "Không đăng ký được: " + (msg || name || "lỗi"),
            });
          }
        });
    });
  };

  /**
   * Mở khóa bằng Face ID / vân tay.
   * @returns {Promise<{ok:boolean, user?:object, error?:string}>}
   */
  GL.bioLogin = function bioLogin(remember) {
    return new Promise(function (resolve) {
      if (!GL.bioIsSupported()) {
        resolve({
          ok: false,
          error: "Thiết bị không hỗ trợ hoặc chưa dùng HTTPS.",
        });
        return;
      }
      var store = loadStore();
      if (!store.creds.length) {
        resolve({
          ok: false,
          error: "Chưa bật Face ID / vân tay. Đăng nhập PIN rồi bật trong menu.",
        });
        return;
      }

      var allow = store.creds.map(function (c) {
        return {
          type: "public-key",
          id: b64ToBuf(c.credentialId),
          transports: ["internal"],
        };
      });

      var opts = {
        challenge: randomChallenge(),
        allowCredentials: allow,
        userVerification: "required",
        timeout: 90000,
      };
      var id = rpId();
      if (id) opts.rpId = id;

      navigator.credentials
        .get({ publicKey: opts })
        .then(function (assertion) {
          if (!assertion || !assertion.rawId) {
            resolve({ ok: false, error: "Xác thực thất bại." });
            return;
          }
          var idB64 = bufToB64(assertion.rawId);
          var match = store.creds.find(function (c) {
            return c.credentialId === idB64;
          });
          // Một số trình duyệt so sánh id khác encoding — fallback 1 cred
          if (!match && store.creds.length === 1) match = store.creds[0];
          if (!match) {
            resolve({
              ok: false,
              error: "Không khớp khóa đã lưu. Đăng nhập PIN và bật lại.",
            });
            return;
          }
          var res = GL.loginWithUserId(match.userId, remember !== false);
          resolve(res);
        })
        .catch(function (err) {
          var name = (err && err.name) || "";
          if (name === "NotAllowedError") {
            resolve({ ok: false, error: "Đã hủy hoặc sinh trắc không khớp." });
          } else if (name === "SecurityError") {
            resolve({
              ok: false,
              error: "Cần HTTPS (GitHub Pages) — không mở bằng file://",
            });
          } else {
            resolve({
              ok: false,
              error:
                "Không mở khóa được: " +
                ((err && err.message) || name || "lỗi"),
            });
          }
        });
    });
  };

  /** Tắt sinh trắc cho user hiện tại (hoặc userId) */
  GL.bioRevoke = function bioRevoke(userId) {
    userId =
      userId ||
      (typeof GL.currentUser === "function" && GL.currentUser()
        ? GL.currentUser().id
        : null);
    if (!userId) return { ok: false, error: "Chưa đăng nhập." };
    var store = loadStore();
    var before = store.creds.length;
    store.creds = store.creds.filter(function (c) {
      return c.userId !== userId;
    });
    saveStore(store);
    return {
      ok: true,
      removed: before - store.creds.length,
    };
  };

  /** Nhãn nút theo thiết bị */
  GL.bioLabel = function bioLabel() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return "Face ID / Touch ID";
    if (/Android/i.test(ua)) return "Vân tay / khuôn mặt";
    if (/Mac/i.test(ua)) return "Touch ID";
    if (/Windows/i.test(ua)) return "Windows Hello";
    return "Face ID / vân tay";
  };
})(window.GL = window.GL || {});
