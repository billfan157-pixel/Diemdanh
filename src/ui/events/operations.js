/**
 * Backup, cloud sync, reports, print and invitation event bindings.
 */
(function (GL) {
  "use strict";

GL.bindOperationEvents = function bindOperationEvents() {
    var openModal = GL.openModal;
    var closeModal = GL.closeModal;
    var showAppIfLoggedIn = GL.showAppIfLoggedIn;
    // ——— Phase 1–4: Backup, báo cáo, mẫu in, tài khoản ———
    function openBackupModalSafe() {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được sao lưu / khôi phục.")) return;
      var st =
        typeof GL.getBackupStatus === "function" ? GL.getBackupStatus() : null;
      var sub = document.getElementById("backupModalSub");
      var statusEl = document.getElementById("backupModalStatus");
      if (sub && st) sub.textContent = st.label;
      if (statusEl && st) {
        statusEl.className =
          "hint app-notice-" +
          (st.level === "ok" ? "ok" : st.level === "danger" ? "err" : "warn");
        var meta = GL.getBackupMeta ? GL.getBackupMeta() : {};
        statusEl.textContent =
          st.label +
          (st.lastFile ? " · file: " + st.lastFile : "") +
          (st.count ? " · " + st.count + " lần trên máy này" : "") +
          (meta.folderName ? " · thư mục: " + meta.folderName : "");
      }
      openModal("backupModal");
      if (typeof GL.updateBackupFolderUI === "function") {
        GL.updateBackupFolderUI();
      }
    }
    document.getElementById("openBackupModal").addEventListener("click", openBackupModalSafe);
    ["backupModalClose", "backupModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("backupModal");
      });
    });
    document.getElementById("backupModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("backupModal");
    });
    document.getElementById("backupExportBtn").addEventListener("click", function () {
      Promise.resolve(GL.exportBackup()).then(function () {
        openBackupModalSafe();
      });
    });

    // ─── Supabase sync UI ───
    GL.updateSyncUI = function updateSyncUI() {
      var box = document.getElementById("syncStatusBox");
      var text = document.getElementById("syncText");
      var st =
        typeof GL.getSyncStatus === "function"
          ? GL.getSyncStatus()
          : { status: "off", message: "" };
      var configured =
        typeof GL.isSupabaseConfigured === "function" &&
        GL.isSupabaseConfigured();
      if (box) {
        box.classList.remove("is-ok", "is-err", "is-syncing", "is-off");
        var cls = "is-off";
        if (!configured) cls = "is-off";
        else if (st.status === "ok") cls = "is-ok";
        else if (st.status === "err") cls = "is-err";
        else if (st.status === "syncing") cls = "is-syncing";
        else cls = "is-off";
        box.classList.add(cls);
      }
      if (text) {
        if (!configured) text.textContent = "Cloud: chưa cấu hình";
        else if (st.message) text.textContent = st.message;
        else text.textContent = "Cloud: sẵn sàng";
      }
      var modalSt = document.getElementById("syncModalStatus");
      if (modalSt) {
        var meta =
          typeof GL.getSyncMeta === "function" ? GL.getSyncMeta() : {};
        var parts = [];
        if (configured) parts.push("Key: đã lưu");
        else parts.push("Key: chưa có");
        if (meta.lastRev != null) parts.push("rev " + meta.lastRev);
        if (meta.lastPushAt)
          parts.push(
            "đẩy " + new Date(meta.lastPushAt).toLocaleString("vi-VN")
          );
        if (meta.lastPullAt)
          parts.push(
            "kéo " + new Date(meta.lastPullAt).toLocaleString("vi-VN")
          );
        modalSt.textContent = parts.join(" · ");
      }
    };

    function openSyncModal() {
      var ta = document.getElementById("syncAnonKey");
      if (ta && typeof GL.getSupabaseAnonKey === "function") {
        ta.value = GL.getSupabaseAnonKey() || "";
      }
      var err = document.getElementById("syncModalError");
      if (err) {
        err.classList.add("hidden");
        err.textContent = "";
      }
      if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
      openModal("syncModal");
    }
    var openSyncBtn = document.getElementById("openSyncModal");
    if (openSyncBtn) openSyncBtn.addEventListener("click", openSyncModal);
    ["syncModalClose", "syncModalDone"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el)
        el.addEventListener("click", function () {
          closeModal("syncModal");
        });
    });
    var syncModal = document.getElementById("syncModal");
    if (syncModal) {
      syncModal.addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeModal("syncModal");
      });
    }
    var syncSaveKey = document.getElementById("syncSaveKeyBtn");
    if (syncSaveKey) {
      syncSaveKey.addEventListener("click", function () {
        var ta = document.getElementById("syncAnonKey");
        var key = ta ? ta.value.trim() : "";
        var err = document.getElementById("syncModalError");
        if (!key) {
          if (err) {
            err.textContent = "Dán anon public key từ Supabase.";
            err.classList.remove("hidden");
          }
          return;
        }
        if (typeof GL.setSupabaseAnonKey === "function") {
          GL.setSupabaseAnonKey(key);
        }
        if (typeof GL.resetSupabaseClient === "function") {
          GL.resetSupabaseClient();
        }
        if (typeof GL.installCloudHooks === "function") GL.installCloudHooks();
        if (err) err.classList.add("hidden");
        GL.toast("Đã lưu key — đang đồng bộ…");
        if (typeof GL.initCloudSync === "function") {
          GL.initCloudSync().then(function (r) {
            if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
            if (r && r.ok) {
              GL.toast("☁️ Cloud sẵn sàng");
              if (typeof GL.render === "function") GL.render();
            } else if (r && r.error) {
              if (err) {
                err.textContent = r.error;
                err.classList.remove("hidden");
              }
              GL.toast(r.error, "err");
            }
          });
        }
      });
    }
    var syncPullBtn = document.getElementById("syncPullBtn");
    if (syncPullBtn) {
      syncPullBtn.addEventListener("click", function () {
        if (!GL.isSupabaseConfigured || !GL.isSupabaseConfigured()) {
          GL.toast("Lưu anon key trước.", "err");
          return;
        }
        GL.cloudPull({ force: true, silent: false }).then(function (r) {
          if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
          if (!r.ok) GL.toast(r.error || "Không tải được.", "err");
          else if (r.empty) {
            /* toast đã có trong pull */
          } else if (typeof GL.render === "function") GL.render();
        });
      });
    }
    var syncPushBtn = document.getElementById("syncPushBtn");
    if (syncPushBtn) {
      syncPushBtn.addEventListener("click", function () {
        if (!GL.isSupabaseConfigured || !GL.isSupabaseConfigured()) {
          GL.toast("Lưu anon key trước.", "err");
          return;
        }
        var n =
          GL.state && GL.state.classes ? GL.state.classes.length : 0;
        if (!n) {
          GL.toast(
            "Máy này chưa có lớp để đẩy. Hãy mở app trên máy đã có điểm rồi Đẩy lên cloud.",
            "err"
          );
          return;
        }
        GL.cloudPush({ force: true, silent: false }).then(function (r) {
          if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();
          if (!r.ok) GL.toast(r.error || "Không đẩy được.", "err");
        });
      });
    }
    if (typeof GL.updateSyncUI === "function") GL.updateSyncUI();

    // Banner + sidebar quick backup + chọn thư mục
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.id === "backupReminderExport" || t.id === "quickBackupBtn") {
        e.preventDefault();
        if (!GL.requireBanGL("Chỉ admin được sao lưu.")) return;
        Promise.resolve(GL.exportBackup());
        return;
      }
      if (t.id === "backupFolderPickBtn" || t.id === "backupFolderChangeBtn") {
        e.preventDefault();
        if (!GL.requireBanGL("Chỉ admin được gắn thư mục sao lưu.")) return;
        Promise.resolve(GL.pickBackupFolder()).then(function () {
          if (typeof GL.updateBackupFolderUI === "function") {
            GL.updateBackupFolderUI();
          }
        });
        return;
      }
      if (t.id === "backupFolderClearBtn") {
        e.preventDefault();
        if (!GL.requireBanGL()) return;
        Promise.resolve(GL.clearBackupDirHandle()).then(function () {
          GL.toast("Đã bỏ gắn thư mục. Sao lưu sẽ tải về Downloads.");
          if (typeof GL.updateBackupFolderUI === "function") {
            GL.updateBackupFolderUI();
          }
        });
        return;
      }
      if (t.id === "backupReminderLater") {
        e.preventDefault();
        var b = document.getElementById("backupReminderBanner");
        if (b) b.classList.add("hidden");
        try {
          localStorage.setItem(
            "giao-ly-backup-snooze",
            String(Date.now() + 24 * 3600 * 1000)
          );
        } catch (err) {
          /* ignore */
        }
        GL.toast("Sẽ nhắc lại sau 1 ngày. Nên backup sớm.", "warn");
      }
    });
    document.getElementById("backupImportBtn").addEventListener("click", function () {
      document.getElementById("backupImportFile").click();
    });
    document.getElementById("backupImportFile").addEventListener("change", function () {
      var f = this.files && this.files[0];
      this.value = "";
      if (!f) return;
      var mode = document.getElementById("backupRestoreMode").value;
      function doRestore() {
        GL.importBackupFile(f, mode)
          .then(function () {
            closeModal("backupModal");
            showAppIfLoggedIn();
          })
          .catch(function (err) {
            GL.toast(err.message || "Khôi phục thất bại.", "err");
          });
      }
      if (mode === "replace") {
        GL.confirm({
          title: "Khôi phục backup?",
          message:
            "Thay thế TOÀN BỘ dữ liệu hiện tại bằng file backup.\n\nNên xuất backup trước khi tiếp tục.",
          danger: true,
          okText: "Khôi phục",
          cancelText: "Hủy",
        }).then(function (ok) {
          if (ok) doRestore();
        });
        return;
      }
      doRestore();
    });

    document.getElementById("openReportsModal").addEventListener("click", function () {
      var rt = document.getElementById("reportTerm");
      if (rt) {
        rt.value =
          GL.activeTerm === "hk2" || GL.activeTerm === "year"
            ? GL.activeTerm
            : "hk1";
      }
      GL.showReportsModal();
    });

    // Thư mời họp PH (+ mẫu in nằm trong modal này)
    document.getElementById("openInviteModal").addEventListener("click", function () {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được soạn thư mời họp PH.")) return;
      // reset touched flags khi mở
      var subj = document.getElementById("inviteSubject");
      var reason = document.getElementById("inviteReason");
      if (subj) delete subj.dataset.touched;
      if (reason) delete reason.dataset.touched;
      GL.showInviteModal();
      fillPrintSettingsFields();
    });

    // Lịch sử sửa điểm
    document.getElementById("openHistoryModal").addEventListener("click", function () {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được xem lịch sử sửa điểm.")) return;
      GL.showHistoryModal();
    });
    ["historyModalClose", "historyModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("historyModal");
      });
    });
    document.getElementById("historyModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("historyModal");
    });
    document.getElementById("historyFilterClass").addEventListener("change", function () {
      GL.refreshHistoryModal();
    });
    document.getElementById("historyFilterQ").addEventListener("input", function () {
      GL.refreshHistoryModal();
    });
    document.getElementById("historyRefreshBtn").addEventListener("click", function () {
      GL.refreshHistoryModal();
    });
    document.getElementById("historyClearBtn").addEventListener("click", function () {
      if (!GL.requireBanGL()) return;
      GL.confirm({
        title: "Xóa lịch sử?",
        message: "Xóa toàn bộ lịch sử sửa điểm? Hành động này không hoàn tác được.",
        danger: true,
        okText: "Xóa lịch sử",
      }).then(function (ok) {
        if (!ok) return;
        GL.clearScoreHistory();
        GL.refreshHistoryModal();
        GL.toast("Đã xóa lịch sử.");
      });
    });
    ["inviteModalClose", "inviteModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("inviteModal");
      });
    });
    document.getElementById("inviteModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("inviteModal");
    });
    document.getElementById("inviteTypeList").addEventListener("change", function (e) {
      if (!e.target || e.target.name !== "inviteType") return;
      var subj = document.getElementById("inviteSubject");
      var reason = document.getElementById("inviteReason");
      if (subj) delete subj.dataset.touched;
      if (reason) delete reason.dataset.touched;
      var type = GL.getInviteType(e.target.value);
      if (subj) subj.value = type.defaultSubject;
      if (reason) reason.value = type.defaultReason;
      var cls = GL.activeClass();
      var termEl = document.getElementById("inviteTerm");
      if (cls) {
        GL.renderInviteStudentChecks(
          cls,
          e.target.value,
          termEl ? termEl.value : "hk1"
        );
      }
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteTerm").addEventListener("change", function () {
      var typeKey =
        (document.querySelector('input[name="inviteType"]:checked') || {})
          .value || "dauNam";
      var cls = GL.activeClass();
      if (cls) GL.renderInviteStudentChecks(cls, typeKey, this.value);
      GL.refreshInvitePreview();
    });
    ["inviteSubject", "inviteReason"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () {
        this.dataset.touched = "1";
        GL.refreshInvitePreview();
      });
    });
    [
      "invitePlace",
      "inviteDatetime",
      "inviteTimeText",
      "inviteExtra",
      "inviteShowTb",
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", function () {
        GL.refreshInvitePreview();
      });
      el.addEventListener("change", function () {
        GL.refreshInvitePreview();
      });
    });
    document.getElementById("inviteStudentList").addEventListener("change", function () {
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteSelectAll").addEventListener("click", function () {
      document.querySelectorAll(".invite-st-cb").forEach(function (cb) {
        cb.checked = true;
      });
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteSelectNone").addEventListener("click", function () {
      document.querySelectorAll(".invite-st-cb").forEach(function (cb) {
        cb.checked = false;
      });
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteSelectSuggest").addEventListener("click", function () {
      var typeKey =
        (document.querySelector('input[name="inviteType"]:checked') || {})
          .value || "dauNam";
      var cls = GL.activeClass();
      var termEl = document.getElementById("inviteTerm");
      if (cls) {
        GL.renderInviteStudentChecks(
          cls,
          typeKey,
          termEl ? termEl.value : "hk1"
        );
      }
      GL.refreshInvitePreview();
    });
    document.getElementById("inviteRefreshPreview").addEventListener("click", function () {
      GL.refreshInvitePreview();
    });
    document.getElementById("invitePrintBtn").addEventListener("click", function () {
      GL.printInvites();
    });
    ["reportsModalClose", "reportsModalDone"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function () {
        closeModal("reportsModal");
      });
    });
    document.getElementById("reportsModal").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal("reportsModal");
    });
    document.getElementById("reportTerm").addEventListener("change", function () {
      GL.showReportsModal();
    });
    document.getElementById("reportRefreshBtn").addEventListener("click", function () {
      GL.showReportsModal();
    });
    document.getElementById("reportPrintBtn").addEventListener("click", function () {
      var body = document.getElementById("reportBody");
      if (!body) return;
      var reportCss =
        "body{font-family:Segoe UI,sans-serif;padding:8mm;color:#1a2332;box-sizing:border-box}" +
        "h3,h4{margin:0 0 8px}ol{padding-left:20px;line-height:1.6}" +
        ".hint{color:#64748b;font-size:12px}" +
        ".report-section{margin-bottom:16px;break-inside:avoid;page-break-inside:avoid}" +
        "@media print{body{padding:0}}";
      if (typeof GL.openPrintWindow === "function") {
        GL.openPrintWindow("Bao cao", body.innerHTML, reportCss);
      } else {
        var w = window.open("", "_blank");
        if (!w) {
          GL.toast("Trình duyệt chặn popup in.", "err");
          return;
        }
        w.document.write(
          "<html><head><title>Bao cao</title><style>" +
            (GL.A4_PAGE_CSS || "@page{size:A4 portrait;margin:12mm 10mm}") +
            reportCss +
            "</style></head><body>" +
            body.innerHTML +
            "</body></html>"
        );
        w.document.close();
        w.focus();
        w.print();
      }
    });

    function fillPrintSettingsFields() {
      var ps =
        typeof GL.getPrintSettings === "function"
          ? GL.getPrintSettings()
          : {};
      var map = {
        psGiaoHat: ps.giaoHat || "",
        psGiaoXu: ps.giaoXu || "",
        psTieuDe: ps.tieuDe || "",
        psNamHoc: ps.namHoc || "",
        psGlv: ps.glvName || "",
        psBanGL: ps.banGLName || "",
        psFooter: ps.footerNote || "",
      };
      Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = map[id];
      });
    }

    /** Mở / bung khối mẫu in (nằm trong Mời họp PH) */
    function openPrintSettingsModal() {
      if (!GL.requireBanGL("Chỉ admin (Ban GL) được chỉnh mẫu in.")) return;
      fillPrintSettingsFields();
      var invite = document.getElementById("inviteModal");
      if (invite && invite.classList.contains("hidden")) {
        var subj = document.getElementById("inviteSubject");
        var reason = document.getElementById("inviteReason");
        if (subj) delete subj.dataset.touched;
        if (reason) delete reason.dataset.touched;
        if (typeof GL.showInviteModal === "function") GL.showInviteModal();
      }
      var panel = document.getElementById("invitePrintSettingsPanel");
      if (panel) {
        panel.open = true;
        try {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (e) {
          /* ignore */
        }
      }
    }
    window.openPrintSettingsModal = openPrintSettingsModal;

    var printSaveBtn = document.getElementById("printSettingsSave");
    if (printSaveBtn) {
      printSaveBtn.addEventListener("click", function () {
        if (!GL.requireBanGL("Chỉ admin được lưu mẫu in.")) return;
        GL.savePrintSettings({
          giaoHat: document.getElementById("psGiaoHat").value.trim(),
          giaoXu: document.getElementById("psGiaoXu").value.trim(),
          tieuDe: document.getElementById("psTieuDe").value.trim(),
          namHoc: document.getElementById("psNamHoc").value.trim(),
          glvName: document.getElementById("psGlv").value.trim(),
          banGLName: document.getElementById("psBanGL").value.trim(),
          footerNote: document.getElementById("psFooter").value.trim(),
        });
        GL.toast("Đã lưu mẫu in.");
        if (typeof GL.refreshInvitePreview === "function") {
          GL.refreshInvitePreview();
        } else if (typeof GL.showInviteModal === "function") {
          // preview có thể tự cập nhật khi in
        }
        if (GL.viewMode === "print" || GL.activeTerm === "year") GL.render();
      });
    }
  };
})(window.GL = window.GL || {});
