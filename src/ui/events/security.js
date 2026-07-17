/**
 * User, PIN, biometric, transfer and login event bindings.
 */
(function (GL) {
  "use strict";

GL.bindSecurityEvents = function bindSecurityEvents() {
    var openModal = GL.openModal;
    var closeModal = GL.closeModal;
    var showLogin = GL.showLogin;
    var showAppIfLoggedIn = GL.showAppIfLoggedIn;
    // Users admin
    function renderUsersModal() {
      var list = document.getElementById("usersList");
      var checks = document.getElementById("newUserClasses");
      if (checks) {
        checks.innerHTML = (GL.state.classes || [])
          .map(function (c) {
            return (
              '<label class="check-all"><input type="checkbox" class="new-user-class" value="' +
              c.id +
              '" /> ' +
              GL.escapeHtml(c.name) +
              (c.year ? " (" + GL.escapeHtml(c.year) + ")" : "") +
              "</label>"
            );
          })
          .join("") || '<p class="hint">Chưa có lớp nào.</p>';
      }
      if (list) {
        var me = GL.currentUser && GL.currentUser();
        list.innerHTML = GL.authStore.users
          .map(function (u) {
            var classes = (u.classIds || [])
              .map(function (id) {
                var c = GL.state.classes.find(function (x) {
                  return x.id === id;
                });
                return c ? c.name : id;
              })
              .join(", ");
            var pinShow = null; // PIN không còn lưu dạng đọc được
            return (
              '<div class="user-row">' +
              "<div><strong>" +
              GL.escapeHtml(u.displayName) +
              '</strong> <span class="hint">@' +
              GL.escapeHtml(u.username) +
              "</span><br><span class=\"hint\">" +
              (u.role === "ban_gl" ? "Ban GL" : "GLV") +
              (classes ? " · " + GL.escapeHtml(classes) : "") +
              (u.active === false ? " · <em>đã khóa</em>" : "") +
              (me && me.id === u.id ? " · <em>đang đăng nhập</em>" : "") +
              "</span>" +
              (pinShow
                ? '<div class="user-pin-badge" title="PIN (admin xem)">PIN: ' +
                  GL.escapeHtml(pinShow) +
                  "</div>"
                : '<div class="hint" style="margin-top:4px">PIN: <em>đã mã hóa — quên PIN thì đặt PIN mới</em></div>') +
              "</div>" +
              '<div class="user-row-actions">' +
              '<button type="button" class="btn btn-ghost" data-toggle-user="' +
              u.id +
              '">' +
              (u.active === false ? "Mở khóa" : "Khóa") +
              "</button>" +
              '<button type="button" class="btn btn-ghost" data-edit-user="' +
              u.id +
              '">Sửa</button>' +
              (me && me.id === u.id
                ? ""
                : '<button type="button" class="btn btn-danger-soft" data-del-user="' +
                  u.id +
                  '">Xóa</button>') +
              "</div></div>"
            );
          })
          .join("");
      }
    }

    document.getElementById("openUsersModal").addEventListener("click", function () {
      if (!GL.canManageUsers()) {
        GL.toast("Chỉ Ban Giáo lý.", "err");
        return;
      }
      renderUsersModal();
      openModal("usersModal");
    });
    ["usersModalClose", "usersModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("usersModal");
      });
    });
    document.getElementById("usersModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("usersModal");
    });
    document.getElementById("createUserBtn").addEventListener("click", function () {
      var classIds = [];
      document.querySelectorAll(".new-user-class:checked").forEach(function (cb) {
        classIds.push(cb.value);
      });
      GL.createUser({
        username: document.getElementById("newUserName").value,
        displayName: document.getElementById("newUserDisplay").value,
        pin: document.getElementById("newUserPin").value,
        role: document.getElementById("newUserRole").value,
        classIds: classIds,
      }).then(function (res) {
        if (!res.ok) {
          GL.toast(res.error, "err");
          return;
        }
        document.getElementById("newUserName").value = "";
        document.getElementById("newUserDisplay").value = "";
        document.getElementById("newUserPin").value = "";
        GL.toast("Đã tạo tài khoản " + res.user.username);
        renderUsersModal();
      });
    });
    document.getElementById("usersList").addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      var tog = t.closest("[data-toggle-user]");
      if (tog) {
        var uid = tog.getAttribute("data-toggle-user");
        var user = GL.authStore.users.find(function (u) {
          return u.id === uid;
        });
        if (!user) return;
        GL.updateUser(uid, { active: user.active === false }).then(function (resT) {
          if (!resT.ok) {
            GL.toast(resT.error || "Không cập nhật được.", "err");
            return;
          }
          renderUsersModal();
          GL.toast(
            user.active === false
              ? "Đã mở khóa tài khoản."
              : "Đã khóa tài khoản."
          );
        });
        return;
      }
      var ed = t.closest("[data-edit-user]");
      if (ed) {
        openEditUserModal(ed.getAttribute("data-edit-user"));
        return;
      }
      var del = t.closest("[data-del-user]");
      if (del) {
        confirmDeleteUser(del.getAttribute("data-del-user"));
      }
    });

    function fillEditUserPinView(u) {
      var view = document.getElementById("editUserPinView");
      var hint = document.getElementById("editUserPinHint");
      if (!view) return;
      view.dataset.plain = "";
      view.dataset.hidden = "1";
      view.value = "(đã mã hóa — không xem được)";
      if (hint) {
        hint.textContent =
          "PIN được mã hóa một chiều để bảo mật. Quên PIN → đặt PIN mới bên dưới.";
      }
    }

    function openEditUserModal(userId) {
      if (!GL.canManageUsers()) {
        GL.toast("Chỉ Ban Giáo lý.", "err");
        return;
      }
      var u = GL.authStore.users.find(function (x) {
        return x.id === userId;
      });
      if (!u) return;
      document.getElementById("editUserId").value = u.id;
      document.getElementById("editUserUsername").value = u.username || "";
      document.getElementById("editUserDisplay").value = u.displayName || "";
      document.getElementById("editUserPin").value = "";
      document.getElementById("editUserPin2").value = "";
      fillEditUserPinView(u);
      var errEl = document.getElementById("editUserError");
      if (errEl) {
        errEl.classList.add("hidden");
        errEl.textContent = "";
      }
      document.getElementById("editUserSub").textContent =
        (u.role === "ban_gl" ? "Ban Giáo lý" : "Giáo lý viên") +
        " · sửa tên đăng nhập / PIN / lớp";
      var wrap = document.getElementById("editUserClassesWrap");
      var box = document.getElementById("editUserClasses");
      if (u.role === "glv") {
        if (wrap) wrap.classList.remove("hidden");
        if (box) {
          var assigned = u.classIds || [];
          box.innerHTML = (GL.state.classes || [])
            .map(function (c) {
              var on = assigned.indexOf(c.id) >= 0;
              return (
                '<label class="check-all"><input type="checkbox" class="edit-user-class" value="' +
                GL.escapeHtml(c.id) +
                '"' +
                (on ? " checked" : "") +
                " /> " +
                GL.escapeHtml(c.name) +
                (c.year ? " · " + GL.escapeHtml(c.year) : "") +
                "</label>"
              );
            })
            .join("") || '<p class="hint">Chưa có lớp nào.</p>';
        }
      } else {
        if (wrap) wrap.classList.add("hidden");
        if (box) box.innerHTML = "";
      }
      // Không cho xóa chính mình
      var delBtn = document.getElementById("editUserDelete");
      var me = GL.currentUser && GL.currentUser();
      if (delBtn) {
        delBtn.disabled = !!(me && me.id === u.id);
        delBtn.title =
          me && me.id === u.id
            ? "Không xóa tài khoản đang đăng nhập"
            : "Xóa tài khoản này";
      }
      openModal("editUserModal");
      setTimeout(function () {
        var el = document.getElementById("editUserUsername");
        if (el) el.focus();
      }, 40);
    }

    function closeEditUserModal() {
      closeModal("editUserModal");
    }

    function confirmDeleteUser(userId) {
      if (!GL.canManageUsers()) return;
      var u = GL.authStore.users.find(function (x) {
        return x.id === userId;
      });
      if (!u) return;
      GL.confirm({
        title: "Xóa tài khoản?",
        message:
          'Xóa vĩnh viễn tài khoản "' +
          (u.displayName || u.username) +
          '" (@' +
          u.username +
          ")?\n\nKhông thể hoàn tác.",
        danger: true,
        okText: "Xóa tài khoản",
        cancelText: "Hủy",
      }).then(function (ok) {
        if (!ok) return;
        var res = GL.deleteUser(userId);
        if (!res.ok) {
          GL.toast(res.error || "Không xóa được.", "err");
          return;
        }
        closeEditUserModal();
        GL.toast("Đã xóa @" + u.username);
        renderUsersModal();
      });
    }

    ["editUserClose", "editUserCancel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeEditUserModal);
    });
    var editUserModal = document.getElementById("editUserModal");
    if (editUserModal) {
      editUserModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeEditUserModal();
      });
    }

    var pinToggle = document.getElementById("editUserPinToggle");
    if (pinToggle) {
      pinToggle.addEventListener("click", function () {
        var view = document.getElementById("editUserPinView");
        if (!view) return;
        var plain = view.dataset.plain || "";
        if (!plain) {
          GL.toast("PIN đã mã hóa — không xem được. Quên PIN thì đặt PIN mới.", "warn");
          return;
        }
        if (view.dataset.hidden === "1") {
          view.value = plain;
          view.dataset.hidden = "0";
          pinToggle.textContent = "🙈";
        } else {
          view.value = "••••••••";
          view.dataset.hidden = "1";
          pinToggle.textContent = "👁";
        }
      });
    }
    var pinCopy = document.getElementById("editUserPinCopy");
    if (pinCopy) {
      pinCopy.addEventListener("click", function () {
        var view = document.getElementById("editUserPinView");
        var plain = view && view.dataset.plain;
        if (!plain) {
          GL.toast("PIN đã mã hóa — không sao chép được.", "err");
          return;
        }
        function ok() {
          GL.toast("Đã sao chép PIN.");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(plain).then(ok).catch(function () {
            window.prompt("Sao chép PIN:", plain);
          });
        } else {
          window.prompt("Sao chép PIN:", plain);
        }
      });
    }

    var editUserDelete = document.getElementById("editUserDelete");
    if (editUserDelete) {
      editUserDelete.addEventListener("click", function () {
        var id = document.getElementById("editUserId").value;
        confirmDeleteUser(id);
      });
    }

    var editUserSave = document.getElementById("editUserSave");
    if (editUserSave) {
      editUserSave.addEventListener("click", function () {
        var id = document.getElementById("editUserId").value;
        var u = GL.authStore.users.find(function (x) {
          return x.id === id;
        });
        if (!u) return;
        var pin = document.getElementById("editUserPin").value;
        var pin2 = document.getElementById("editUserPin2").value;
        var errEl = document.getElementById("editUserError");
        function showErr(msg) {
          if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
          }
          GL.toast(msg, "err");
        }
        if (pin || pin2) {
          if (pin.length < 4) {
            showErr("PIN mới tối thiểu 4 ký tự.");
            return;
          }
          if (pin !== pin2) {
            showErr("Hai lần nhập PIN mới không khớp.");
            return;
          }
        }
        var patch = {
          username: document.getElementById("editUserUsername").value.trim(),
          displayName: document.getElementById("editUserDisplay").value.trim(),
        };
        if (pin) patch.pin = pin;
        if (u.role === "glv") {
          var classIds = [];
          document
            .querySelectorAll(".edit-user-class:checked")
            .forEach(function (cb) {
              classIds.push(cb.value);
            });
          patch.classIds = classIds;
        }
        GL.updateUser(id, patch).then(function (res) {
          if (!res.ok) {
            showErr(res.error || "Không lưu được.");
            return;
          }
          closeEditUserModal();
          GL.toast("Đã cập nhật @" + res.user.username);
          renderUsersModal();
        });
      });
    }

    // Đổi PIN tài khoản đang đăng nhập
    function openChangePinModal() {
      var u = GL.currentUser && GL.currentUser();
      if (!u) {
        GL.toast("Chưa đăng nhập.", "err");
        return;
      }
      var info = document.getElementById("changePinUser");
      if (info) {
        info.innerHTML =
          "Tài khoản: <strong>" +
          GL.escapeHtml(u.displayName || u.username) +
          "</strong> (@" +
          GL.escapeHtml(u.username) +
          ")";
      }
      ["pinOld", "pinNew", "pinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = "";
      });
      var err = document.getElementById("changePinError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      openModal("changePinModal");
      setTimeout(function () {
        var el = document.getElementById("pinOld");
        if (el) el.focus();
      }, 40);
    }
    GL.openChangePinModal = openChangePinModal;

    function closeChangePinModal() {
      closeModal("changePinModal");
    }
    ["changePinClose", "changePinCancel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeChangePinModal);
    });
    var changePinModal = document.getElementById("changePinModal");
    if (changePinModal) {
      changePinModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeChangePinModal();
      });
    }
    var changePinSave = document.getElementById("changePinSave");
    if (changePinSave) {
      changePinSave.addEventListener("click", function () {
        var oldP = document.getElementById("pinOld").value;
        var newP = document.getElementById("pinNew").value;
        var newP2 = document.getElementById("pinNew2").value;
        GL.changeOwnPin(oldP, newP, newP2).then(function (res) {
          var err = document.getElementById("changePinError");
          if (!res.ok) {
            if (err) {
              err.textContent = res.error || "Không đổi được PIN.";
              err.classList.remove("hidden");
            }
            GL.toast(res.error || "Không đổi được PIN.", "err");
            return;
          }
          closeChangePinModal();
          GL.toast("Đã đổi PIN thành công. Lần sau đăng nhập bằng PIN mới.");
          // Đẩy cloud ngay để máy khác / điện thoại không còn PIN cũ
          if (typeof GL.cloudPush === "function" && GL.isSupabaseConfigured()) {
            GL.cloudPush({ force: true, silent: true }).then(function (r) {
              if (r && r.ok) {
                /* ok */
              } else if (r && r.error) {
                GL.toast(
                  "PIN đã đổi trên máy này; chưa đẩy cloud: " + r.error,
                  "warn"
                );
              }
            });
          }
        });
      });
      // Enter trong ô PIN
      ["pinOld", "pinNew", "pinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") {
            ev.preventDefault();
            changePinSave.click();
          }
        });
      });
    }

    // Bắt buộc đổi PIN yếu
    function openForcePinModal() {
      var u = GL.currentUser && GL.currentUser();
      if (!u) return;
      var info = document.getElementById("forcePinUser");
      if (info) {
        info.innerHTML =
          "Tài khoản <strong>" +
          GL.escapeHtml(u.displayName || u.username) +
          "</strong> (@" +
          GL.escapeHtml(u.username) +
          ") đang dùng PIN dễ đoán. Hãy đổi ngay để bảo vệ sổ điểm.";
      }
      ["forcePinOld", "forcePinNew", "forcePinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = "";
      });
      var err = document.getElementById("forcePinError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      var modal = document.getElementById("forcePinModal");
      if (modal) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      }
      setTimeout(function () {
        var el = document.getElementById("forcePinOld");
        if (el) el.focus();
      }, 50);
    }
    function closeForcePinModal() {
      var modal = document.getElementById("forcePinModal");
      if (modal) modal.classList.add("hidden");
      var any = document.querySelector(".modal-overlay:not(.hidden)");
      if (!any) document.body.style.overflow = "";
    }
    var forcePinSave = document.getElementById("forcePinSave");
    if (forcePinSave) {
      forcePinSave.addEventListener("click", function () {
        GL.changeOwnPin(
          document.getElementById("forcePinOld").value,
          document.getElementById("forcePinNew").value,
          document.getElementById("forcePinNew2").value
        ).then(function (res) {
          var err = document.getElementById("forcePinError");
          if (!res.ok) {
            if (err) {
              err.textContent = res.error || "Không đổi được PIN.";
              err.classList.remove("hidden");
            }
            GL.toast(res.error || "Không đổi được PIN.", "err");
            return;
          }
          closeForcePinModal();
          GL.toast("Đã đổi PIN. Hãy ghi nhớ PIN mới.");
          if (typeof GL.cloudPush === "function" && GL.isSupabaseConfigured()) {
            GL.cloudPush({ force: true, silent: true });
          }
          if (typeof GL.updateBackupReminderUI === "function") {
            GL.updateBackupReminderUI();
          }
        });
      });
      ["forcePinOld", "forcePinNew", "forcePinNew2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") {
            ev.preventDefault();
            forcePinSave.click();
          }
        });
      });
    }

    GL.checkSecurityGates = function checkSecurityGates() {
      // 1) PIN yếu → chặn dùng app
      if (typeof GL.mustChangePin === "function" && GL.mustChangePin()) {
        openForcePinModal();
        return;
      }
      // 2) Nhắc backup (admin) — tôn trọng snooze
      if (typeof GL.isBanGL === "function" && GL.isBanGL()) {
        var snooze = 0;
        try {
          snooze = Number(localStorage.getItem("giao-ly-backup-snooze") || 0);
        } catch (e) {
          /* ignore */
        }
        if (Date.now() < snooze) {
          var ban = document.getElementById("backupReminderBanner");
          if (ban) ban.classList.add("hidden");
        } else if (typeof GL.updateBackupReminderUI === "function") {
          GL.updateBackupReminderUI();
        }
      }
    };

    // ─── Chuyển HV sang lớp khác ───
    GL.openTransferModal = openTransferModal;
    function openTransferModal(studentId) {
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
      document.getElementById("transferStudentId").value = st.id;
      document.getElementById("transferFromClassId").value = cls.id;
      document.getElementById("transferStudentName").textContent =
        GL.displayName(st);
      document.getElementById("transferFromName").textContent = cls.name;
      var err = document.getElementById("transferError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      var sel = document.getElementById("transferToClass");
      var targets =
        typeof GL.classesInScope === "function"
          ? GL.classesInScope()
          : typeof GL.visibleClasses === "function"
            ? GL.visibleClasses()
            : GL.state.classes || [];
      targets = targets.filter(function (c) {
        return c.id !== cls.id;
      });
      if (!targets.length) {
        GL.toast("Không có lớp đích nào bạn được xem.", "err");
        return;
      }
      sel.innerHTML = targets
        .map(function (c) {
          return (
            '<option value="' +
            GL.escapeHtml(c.id) +
            '">' +
            GL.escapeHtml(c.name) +
            (c.year ? " · " + GL.escapeHtml(c.year) : "") +
            " (" +
            ((c.students && c.students.length) || 0) +
            " HV)</option>"
          );
        })
        .join("");
      openModal("transferModal");
    }
    function closeTransferModal() {
      closeModal("transferModal");
    }
    ["transferClose", "transferCancel"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeTransferModal);
    });
    var transferModal = document.getElementById("transferModal");
    if (transferModal) {
      transferModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeTransferModal();
      });
    }
    var transferConfirm = document.getElementById("transferConfirm");
    if (transferConfirm) {
      transferConfirm.addEventListener("click", function () {
        var sid = document.getElementById("transferStudentId").value;
        var fromId = document.getElementById("transferFromClassId").value;
        var toId = document.getElementById("transferToClass").value;
        var err = document.getElementById("transferError");
        var res = GL.transferStudent(sid, fromId, toId);
        if (!res.ok) {
          if (err) {
            err.textContent = res.error || "Không chuyển được.";
            err.classList.remove("hidden");
          }
          GL.toast(res.error || "Không chuyển được.", "err");
          return;
        }
        if (typeof GL.setUndoLabel === "function") {
          GL.setUndoLabel(
            "Chuyển HV → " + (res.to && res.to.name ? res.to.name : "")
          );
        }
        GL.saveState();
        closeTransferModal();
        GL.toast(
          "Đã chuyển " +
            GL.displayName(res.student) +
            ' → lớp "' +
            res.to.name +
            '"'
        );
        GL.render();
      });
    }

    // ─── Hướng dẫn ───
    function openHelpModal() {
      openModal("helpModal");
    }
    function closeHelpModal() {
      closeModal("helpModal");
    }
    var openHelpBtn = document.getElementById("openHelpModal");
    if (openHelpBtn) openHelpBtn.addEventListener("click", openHelpModal);
    ["helpClose", "helpDone"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", closeHelpModal);
    });
    var helpModal = document.getElementById("helpModal");
    if (helpModal) {
      helpModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeHelpModal();
      });
    }

    // Logout + Đổi PIN + Face ID (nút render động trong sidebar)
    document.getElementById("sidebar").addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.id === "logoutBtn") {
        GL.logout();
        showLogin();
        if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
        GL.toast("Đã đăng xuất.");
        return;
      }
      if (t.id === "openChangePinBtn") {
        openChangePinModal();
        return;
      }
      if (t.id === "bioToggleBtn") {
        var u = GL.currentUser && GL.currentUser();
        if (!u) return;
        var enabled =
          typeof GL.bioIsEnabledForUser === "function" &&
          GL.bioIsEnabledForUser(u.id);
        if (enabled) {
          GL.confirm({
            title: "Tắt " + (GL.bioLabel ? GL.bioLabel() : "sinh trắc") + "?",
            message: "Lần sau sẽ chỉ đăng nhập bằng PIN trên máy này.",
            danger: true,
            okText: "Tắt",
          }).then(function (ok) {
            if (!ok) return;
            GL.bioRevoke(u.id);
            if (typeof GL.updateBioToggleUI === "function") GL.updateBioToggleUI();
            if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
            GL.toast("Đã tắt sinh trắc trên máy này.");
          });
        } else {
          GL.bioRegister().then(function (r) {
            if (r.ok) {
              GL.toast(
                "Đã bật " + (GL.bioLabel ? GL.bioLabel() : "Face ID / vân tay") + "."
              );
            } else {
              GL.toast(r.error || "Không bật được.", "err");
            }
            if (typeof GL.updateBioToggleUI === "function") GL.updateBioToggleUI();
            if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
          });
        }
      }
    });

    // ─── Nhật ký: đổi loại → cập nhật mức độ ───
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLSelectElement)) return;
      var jType = t.closest(".journal-type");
      if (!jType) return;
      var jSection = jType.closest(".journal-section");
      if (!jSection) return;
      var jLevel = jSection.querySelector(".journal-level");
      if (!jLevel) return;
      var typeKey = jType.value;
      var typeObj = null;
      if (typeof GL.JOURNAL_TYPES !== "undefined") {
        for (var i = 0; i < GL.JOURNAL_TYPES.length; i++) {
          if (GL.JOURNAL_TYPES[i].key === typeKey) {
            typeObj = GL.JOURNAL_TYPES[i];
            break;
          }
        }
      }
      if (typeObj && typeObj.levels && typeObj.levels.length) {
        jLevel.innerHTML = '<option value="">—</option>' +
          typeObj.levels.map(function (l) {
            return '<option value="' + l + '">' + l + "</option>";
          }).join("");
      } else {
        jLevel.innerHTML = '<option value="">—</option>';
      }
    });

    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      GL.login(
        document.getElementById("loginUser").value,
        document.getElementById("loginPin").value,
        document.getElementById("loginRemember").checked
      ).then(function (res) {
      var err = document.getElementById("loginError");
      if (!res.ok) {
        err.textContent = res.error;
        err.classList.remove("hidden");
        return;
      }
      err.classList.add("hidden");
      showAppIfLoggedIn();
      GL.toast("Xin chào " + (res.user.displayName || res.user.username));
      // Gợi ý bật Face ID / vân tay sau lần đăng nhập PIN
      if (
        typeof GL.bioIsSupported === "function" &&
        GL.bioIsSupported() &&
        typeof GL.bioIsEnabledForUser === "function" &&
        !GL.bioIsEnabledForUser(res.user.id)
      ) {
        setTimeout(function () {
          if (typeof GL.confirm === "function") {
            GL.confirm({
              title: "Bật " + (GL.bioLabel ? GL.bioLabel() : "Face ID / vân tay") + "?",
              message:
                "Lần sau mở app nhanh hơn bằng Face ID / vân tay trên máy này. Vẫn dùng PIN khi cần.",
              okText: "Bật ngay",
              cancelText: "Để sau",
            }).then(function (ok) {
              if (!ok) return;
              GL.bioRegister().then(function (r) {
                if (r.ok) {
                  GL.toast("Đã bật " + (GL.bioLabel ? GL.bioLabel() : "sinh trắc") + ".");
                  if (typeof GL.updateBioToggleUI === "function") GL.updateBioToggleUI();
                  if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
                } else GL.toast(r.error || "Không bật được.", "err");
              });
            });
          }
        }, 500);
      }
      });
    });

    // ─── Face ID / vân tay ───
    GL.updateLoginBioUI = function updateLoginBioUI() {
      var wrap = document.getElementById("loginBioWrap");
      var btn = document.getElementById("loginBioBtn");
      var lab = document.getElementById("loginBioLabel");
      var hint = document.getElementById("loginBioHint");
      if (!wrap || !btn) return;
      var label = typeof GL.bioLabel === "function" ? GL.bioLabel() : "Face ID / vân tay";
      if (lab) lab.textContent = "Mở bằng " + label;
      var supported =
        typeof GL.bioIsSupported === "function" && GL.bioIsSupported();
      wrap.classList.toggle("is-unsupported", !supported);
      if (!supported) {
        if (hint) {
          hint.textContent =
            "Sinh trắc cần HTTPS (GitHub Pages) hoặc localhost — không dùng file://";
        }
        btn.disabled = true;
        return;
      }
      var has =
        typeof GL.bioHasAny === "function" ? GL.bioHasAny() : false;
      wrap.classList.toggle("is-ready", has);
      btn.disabled = !has;
      if (hint) {
        hint.textContent = has
          ? "Chạm để mở bằng " + label + " trên máy này."
          : "Lần đầu: đăng nhập PIN → sidebar → bật " + label + ".";
      }
    };

    GL.updateBioToggleUI = function updateBioToggleUI() {
      var btn = document.getElementById("bioToggleBtn");
      if (!btn) return;
      var label = typeof GL.bioLabel === "function" ? GL.bioLabel() : "Face ID / vân tay";
      var u = typeof GL.currentUser === "function" ? GL.currentUser() : null;
      var on =
        u &&
        typeof GL.bioIsEnabledForUser === "function" &&
        GL.bioIsEnabledForUser(u.id);
      var supported =
        typeof GL.bioIsSupported === "function" && GL.bioIsSupported();
      if (!supported) {
        btn.textContent = "🔐 " + label + " (cần HTTPS)";
        btn.disabled = true;
        return;
      }
      btn.disabled = false;
      btn.textContent = on
        ? "🔐 Tắt " + label
        : "🔐 Bật " + label;
    };

    var loginBioBtn = document.getElementById("loginBioBtn");
    if (loginBioBtn) {
      loginBioBtn.addEventListener("click", function () {
        var err = document.getElementById("loginError");
        if (err) {
          err.classList.add("hidden");
          err.textContent = "";
        }
        loginBioBtn.disabled = true;
        var remember = document.getElementById("loginRemember");
        GL.bioLogin(remember ? remember.checked : true).then(function (res) {
          loginBioBtn.disabled = false;
          if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
          if (!res.ok) {
            if (err) {
              err.textContent = res.error || "Không mở khóa được.";
              err.classList.remove("hidden");
            }
            GL.toast(res.error || "Không mở khóa được.", "err");
            return;
          }
          showAppIfLoggedIn();
          GL.toast(
            "Xin chào " + (res.user.displayName || res.user.username) + " 🔐"
          );
        });
      });
    }

    if (typeof GL.updateLoginBioUI === "function") GL.updateLoginBioUI();
  };
})(window.GL = window.GL || {});
