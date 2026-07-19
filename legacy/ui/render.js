/**
 * Render UI chính: sidebar lớp, stats, hệ số, danh sách theo view mode.
 */
(function (GL) {
  "use strict";

  GL.filteredList = function filteredList(cls) {
    var q = GL.normName(GL.searchQuery);
    var list = cls.students.map(function (s, i) {
      return { s: s, i: i };
    });
    if (q) {
      list = list.filter(function (item) {
        var st = item.s;
        var blob = GL.normStudent(st);
        (GL.INFO_FIELDS || []).forEach(function (f) {
          if (st[f.key]) blob += " " + GL.normName(st[f.key]);
        });
        if (st.ghiChu) blob += " " + GL.normName(st.ghiChu);
        return blob.indexOf(q) >= 0;
      });
    }
    return list;
  };

  GL.updateViewSwitcherUI = function updateViewSwitcherUI() {
    var isYear = GL.activeTerm === "year";
    var moreModes = ["rank", "stats", "print"];
    // Cả năm: chuẩn hóa view (cards/table → year board)
    if (
      isYear &&
      (GL.viewMode === "cards" ||
        GL.viewMode === "table" ||
        GL.viewMode === "missing")
    ) {
      GL.viewMode = "year";
      try {
        localStorage.setItem(GL.VIEW_KEY, "year");
      } catch (e) {
        /* ignore */
      }
    }
    document.querySelectorAll(".view-btn").forEach(function (btn) {
      if (btn.getAttribute("data-view-more") === "1" || btn.id === "viewMoreBtn") {
        btn.style.display = "";
        btn.classList.toggle("active", moreModes.indexOf(GL.viewMode) >= 0);
        return;
      }
      var v = btn.getAttribute("data-view");
      if (isYear) {
        // Cả năm: Tổng kết · Theo dõi · Thêm (+ desktop Hạng/TK/In)
        if (v === "year") {
          btn.style.display = "";
          btn.classList.toggle("active", GL.viewMode === "year" || GL.viewMode === "rank");
          return;
        }
        if (v === "cards" || v === "table") {
          btn.style.display = "none";
          btn.classList.remove("active");
          return;
        }
        if (v === "journal") {
          btn.style.display = "";
          btn.classList.toggle("active", GL.viewMode === "journal");
          return;
        }
        if (btn.classList.contains("view-btn-desktop")) {
          var allowD = v === "rank" || v === "stats" || v === "print";
          btn.style.display = allowD ? "" : "none";
          btn.classList.toggle("active", v === GL.viewMode);
          return;
        }
        btn.style.display = "none";
        btn.classList.remove("active");
      } else {
        if (v === "year") {
          btn.style.display = "none";
          btn.classList.remove("active");
          return;
        }
        btn.style.display = "";
        btn.classList.toggle("active", v === GL.viewMode);
      }
    });
    var hint = document.getElementById("viewHint");
    if (hint) {
      if (
        isYear &&
        (GL.viewMode === "year" ||
          GL.viewMode === "cards" ||
          GL.viewMode === "table" ||
          GL.viewMode === "rank")
      ) {
        hint.innerHTML = GL.VIEW_HINTS.year || "";
      } else {
        hint.innerHTML = GL.VIEW_HINTS[GL.viewMode] || "";
      }
    }

    var toolbar = document.getElementById("listToolbar");
    if (toolbar) {
      // Cả năm: vẫn cho tìm HV; ẩn khi stats
      if (isYear) {
        toolbar.style.display =
          GL.viewMode === "stats" ? "none" : "flex";
      } else {
        toolbar.style.display =
          GL.viewMode === "stats" ? "none" : "flex";
      }
    }
  };

  GL.renderClassList = function renderClassList() {
    var el = document.getElementById("classList");
    if (!el) return;

    var classes =
      typeof GL.classesInScope === "function"
        ? GL.classesInScope()
        : typeof GL.visibleClasses === "function"
          ? GL.visibleClasses()
          : GL.state.classes;

    // badge số lớp trên nút toggle
    var countEl = document.getElementById("classesToggleCount");
    if (countEl) {
      if (!classes.length) {
        countEl.textContent = GL.activeYearFilter
          ? "Không có lớp NH " + GL.activeYearFilter
          : "Chưa có lớp";
      } else {
        var active = GL.activeClass && GL.activeClass();
        var inScope =
          active &&
          classes.some(function (c) {
            return c.id === active.id;
          });
        countEl.textContent =
          classes.length +
          " lớp" +
          (GL.activeYearFilter ? " · " + GL.activeYearFilter : "") +
          (inScope && active ? " · " + active.name : "");
      }
    }

    // select năm học (sidebar + dashboard)
    document
      .querySelectorAll(
        "#yearFilterSelect, #dashYearFilter, #classesYearFilter"
      )
      .forEach(function (sel) {
        if (typeof GL.fillYearFilterSelect === "function") {
          GL.fillYearFilterSelect(sel);
          sel.value = GL.activeYearFilter || "";
        }
      });

    // form tạo lớp
    var form = document.querySelector(".new-class-form");
    if (form) {
      form.style.display =
        typeof GL.canCreateClass === "function" && !GL.canCreateClass()
          ? "none"
          : "";
    }
    var classesCreate = document.getElementById("classesCreateBox");
    if (classesCreate) {
      classesCreate.style.display =
        typeof GL.canCreateClass === "function" && !GL.canCreateClass()
          ? "none"
          : "";
    }

    // user panel
    var userBox = document.getElementById("sidebarUser");
    if (userBox && typeof GL.currentUser === "function") {
      var u = GL.currentUser();
      if (u) {
        userBox.innerHTML =
          '<div class="sidebar-user-name">' +
          GL.escapeHtml(u.displayName || u.username) +
          '</div><div class="sidebar-user-role">' +
          (u.role === "ban_gl" ? "Ban Giáo lý" : "Giáo lý viên") +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-block" id="openChangePinBtn" style="margin-top:8px;font-size:0.8rem">🔑 Đổi PIN</button>' +
          '<button type="button" class="btn btn-ghost btn-block" id="bioToggleBtn" style="margin-top:6px;font-size:0.8rem" title="Face ID / vân tay trên máy này">🔐 Face ID / vân tay</button>' +
          '<button type="button" class="btn btn-ghost btn-block" id="logoutBtn" style="margin-top:6px;font-size:0.8rem">Đăng xuất</button>';
        // Cập nhật nhãn bật/tắt sinh trắc
        if (typeof GL.updateBioToggleUI === "function") {
          setTimeout(function () {
            GL.updateBioToggleUI();
          }, 0);
        }
      }
    }

    // admin-only UI: lịch sử, hệ số, sao lưu, mời họp PH, quản trị user, tổng hợp…
    // Công cụ Xuất: mọi user · Nhập / xuất nhiều lớp: admin (UI trong modal)
    var isAdmin = typeof GL.isBanGL === "function" && GL.isBanGL();
    var adminActions = document.getElementById("adminActions");
    if (adminActions) {
      adminActions.classList.toggle("hidden", !isAdmin);
      adminActions.style.display = isAdmin ? "" : "none";
    }
    var tools = document.getElementById("sidebarTools");
    if (tools) {
      tools.classList.remove("hidden");
      tools.style.display = "";
    }
    document.querySelectorAll(".admin-only").forEach(function (el) {
      el.classList.toggle("hidden", !isAdmin);
      el.style.display = isAdmin ? "" : "none";
    });
    // Cập nhật nhãn nút Xuất/Nhập theo quyền
    if (typeof GL.applyIoRoleUI === "function") {
      // chỉ cập nhật label nút, không mở modal
      var openBtn = document.getElementById("openIoModal");
      if (openBtn) {
        openBtn.textContent = isAdmin ? "📤 Xuất / Nhập" : "📤 Xuất điểm";
        openBtn.title = isAdmin
          ? "Nhập file + xuất điểm (admin)"
          : "Xuất điểm lớp được gán (GLV không nhập file)";
      }
    }
    // đóng modal admin nếu user không phải admin (không đóng ioModal — GLV được xuất)
    if (!isAdmin) {
      [
        "weightsModal",
        "backupModal",
        "inviteModal",
        "historyModal",
        "usersModal",
        "parishModal",
        "missingModal",
        "editUserModal",
        "importPreviewModal",
      ].forEach(function (id) {
        var m = document.getElementById(id);
        if (m && !m.classList.contains("hidden")) {
          m.classList.add("hidden");
        }
      });
    }

    if (!classes.length) {
      el.innerHTML =
        '<div class="empty" style="padding:16px 8px;font-size:0.85rem">Chưa có lớp được giao.<br>' +
        (typeof GL.isBanGL === "function" && GL.isBanGL()
          ? "Tạo lớp bên dưới 👇"
          : "Liên hệ Ban GL để được gán lớp.") +
        "</div>";
      return;
    }

    var sorted = classes.slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    var canDel = typeof GL.canDeleteClass === "function" && GL.canDeleteClass();

    el.innerHTML = sorted
      .map(function (c) {
        var n = c.students.length;
        var active = c.id === GL.state.activeClassId;
        return (
          '<div class="class-item ' +
          (active ? "active" : "") +
          '" data-select-class="' +
          c.id +
          '" role="button" tabindex="0">' +
          '<span class="class-dot" style="background:' +
          (c.color || "#2563eb") +
          '"></span>' +
          '<div class="class-info"><div class="class-name">' +
          GL.escapeHtml(c.name) +
          '</div><div class="class-meta">' +
          n +
          " học viên" +
          (c.year ? " · " + GL.escapeHtml(c.year) : "") +
          "</div></div>" +
          '<div class="class-actions">' +
          '<button type="button" class="icon-btn" data-rename-class="' +
          c.id +
          '" title="Đổi tên">✏️</button>' +
          (canDel
            ? '<button type="button" class="icon-btn danger" data-del-class="' +
              c.id +
              '" title="Xóa lớp">🗑️</button>'
            : "") +
          "</div></div>"
        );
      })
      .join("");
  };

  GL.renderStats = function renderStats(cls) {
    var term = GL.activeTerm || "hk1";
    var tbs = cls.students
      .map(function (s) {
        return GL.studentTBContext(s, cls.weights, term);
      })
      .filter(function (x) {
        return x != null;
      });
    var avg = tbs.length
      ? tbs.reduce(function (a, b) {
          return a + b;
        }, 0) / tbs.length
      : null;
    var good = tbs.filter(function (x) {
      return x >= 8;
    }).length;

    var yearTbs = cls.students
      .map(function (s) {
        return GL.studentYearTB(s, cls.weights);
      })
      .filter(function (x) {
        return x != null;
      });
    var yearAvg = yearTbs.length
      ? yearTbs.reduce(function (a, b) {
          return a + b;
        }, 0) / yearTbs.length
      : null;

    var elCount = document.getElementById("statCount");
    var elAvg = document.getElementById("statAvg");
    var elGood = document.getElementById("statGood");
    var elYear = document.getElementById("statYearAvg");
    var elAvgLabel = document.getElementById("statAvgLabel");
    if (elCount) elCount.textContent = String(cls.students.length);
    if (elAvg) elAvg.textContent = GL.fmt(avg, 2);
    if (elGood) elGood.textContent = String(good);
    if (elYear) elYear.textContent = GL.fmt(yearAvg, 2);
    if (elAvgLabel) {
      if (term === "year") elAvgLabel.textContent = "TB cả năm";
      else
        elAvgLabel.textContent =
          "TB lớp (" + (term === "hk2" ? "HK2" : "HK1") + ")";
    }
    // Strip mobile: khi Cả năm, ô "TB cả năm" trùng → hiện số HV đủ 2 HK
    var yearStat = document.getElementById("statYearAvg");
    var yearStatLabel =
      yearStat && yearStat.parentElement
        ? yearStat.parentElement.querySelector(".stat-label")
        : null;
    if (yearStat && yearStatLabel) {
      if (term === "year") {
        var bothHk = cls.students.filter(function (s) {
          return (
            GL.studentTB(s, cls.weights, "hk1") != null &&
            GL.studentTB(s, cls.weights, "hk2") != null
          );
        }).length;
        yearStat.textContent = String(bothHk);
        yearStatLabel.textContent = "Đủ 2 HK";
        yearStat.style.color = "";
      } else {
        yearStatLabel.textContent = "TB cả năm";
        yearStat.style.color = "var(--purple)";
      }
    }
  };

  GL.updateTermSwitcherUI = function updateTermSwitcherUI() {
    var term = GL.activeTerm || "hk1";
    document.querySelectorAll(".term-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-term") === term);
    });
    var note = document.getElementById("termNote");
    if (note) {
      if (term === "year") {
        note.innerHTML =
          "Đang xem <strong>tổng điểm cả năm</strong> (HK1 + HK2)";
      } else {
        note.innerHTML =
          "Đang xem bảng điểm <strong>" + GL.termLabel(term) + "</strong>";
      }
    }
    var pill = document.getElementById("listTermPill");
    if (pill) {
      pill.textContent =
        term === "year" ? "CẢ NĂM" : term === "hk2" ? "HK2" : "HK1";
      pill.classList.toggle("term-pill-year", term === "year");
    }

    // sync import selects (không dùng year)
    var importTerm = document.getElementById("importTerm");
    if (importTerm && term !== "year") importTerm.value = term;
    var previewTerm = document.getElementById("importPreviewTerm");
    if (previewTerm && !GL._pendingImport && term !== "year") {
      previewTerm.value = term;
    }

    // Ẩn form thêm điểm khi xem cả năm? vẫn hiện form thêm HV
    var addCard = document.querySelector("#addForm") &&
      document.getElementById("addForm").closest(".card");
    // optional: keep add student visible
  };

  GL.renderWeights = function renderWeights(cls) {
    var el = document.getElementById("weights");
    if (!el) return;
    el.innerHTML = GL.COLS.map(function (c) {
      return (
        '<div class="w-item"><label for="w-' +
        c.key +
        '">' +
        c.label +
        '</label><input id="w-' +
        c.key +
        '" type="number" min="0" max="10" step="0.5" value="' +
        cls.weights[c.key] +
        '" data-weight="' +
        c.key +
        '" /></div>'
      );
    }).join("");

    var parts = GL.COLS.map(function (c) {
      return c.short + "×" + cls.weights[c.key];
    });
    var den = GL.COLS.reduce(function (s, c) {
      return s + (Number(cls.weights[c.key]) || 0);
    }, 0);
    var formula = document.getElementById("formulaHint");
    if (formula) {
      formula.textContent =
        "TB = (" + parts.join(" + ") + ") / " + den + "  ·  chỉ cột có điểm";
    }

    // Badge nút Hệ số (tóm tắt min…max)
    var badge = document.getElementById("weightsBadge");
    if (badge) {
      var vals = GL.COLS.map(function (c) {
        return Number(cls.weights[c.key]) || 0;
      });
      var mn = Math.min.apply(null, vals);
      var mx = Math.max.apply(null, vals);
      badge.textContent = mn === mx ? "×" + mn : "×" + mn + "…×" + mx;
    }
  };

  GL.renderStudents = function renderStudents(cls) {
    var root = document.getElementById("students");
    var meta = document.getElementById("listMeta");
    if (!root) return;

    GL.updateViewSwitcherUI();

    var list = GL.filteredList(cls);
    var q = GL.normName(GL.searchQuery);

    if (meta) {
      meta.textContent = q
        ? "Tìm thấy " + list.length + "/" + cls.students.length
        : cls.students.length
          ? cls.students.length + " học viên"
          : "";
    }

    if (cls.students.length === 0) {
      root.innerHTML =
        '<div class="empty"><div class="empty-icon">✏️</div>' +
        "<strong>Lớp chưa có học viên</strong>" +
        "Thêm tên ở trên, hoặc nhập từ file Excel / Word.</div>";
      return;
    }

    if (list.length === 0 && GL.viewMode !== "stats") {
      root.innerHTML =
        '<div class="empty"><strong>Không tìm thấy</strong>Thử từ khóa khác.</div>';
      return;
    }

    var mode = GL.viewMode;
    // Chế độ Cả năm → bảng tổng kết (hoặc xếp hạng / thống kê / in theo năm)
    if (GL.activeTerm === "year") {
      if (mode === "journal" || mode === "missing") {
        root.innerHTML = GL.renderViewJournal(cls, list, {
          onlyAttention: !!GL._journalOnlyAttention,
          onlyMissing: !!GL._journalOnlyMissing,
        });
        return;
      }
      if (mode === "rank") {
        // xếp hạng theo TB cả năm: tạm set context bằng cách dùng year board sorted (rank view dùng studentTB)
        root.innerHTML = GL.renderViewYear(cls, list);
      } else if (mode === "stats") {
        // stats vẫn theo cột của 1 kỳ — chuyển sang year board + hint
        root.innerHTML =
          GL.renderViewYear(cls, list) +
          '<div style="margin-top:14px">' +
          GL.renderViewStats(cls) +
          "</div>";
      } else if (mode === "print") {
        root.innerHTML = GL.renderViewPrintYear(cls, list);
      } else {
        root.innerHTML = GL.renderViewYear(cls, list);
      }
      return;
    }

    if (mode === "cards") root.innerHTML = GL.renderViewCards(cls, list);
    else if (mode === "table") root.innerHTML = GL.renderViewTable(cls, list);
    else if (mode === "rank") root.innerHTML = GL.renderViewRank(cls, list);
    else if (mode === "missing" || mode === "journal")
      root.innerHTML = GL.renderViewJournal(cls, list, {
        onlyAttention: !!GL._journalOnlyAttention,
        onlyMissing: !!GL._journalOnlyMissing,
      });
    else if (mode === "stats") root.innerHTML = GL.renderViewStats(cls);
    else if (mode === "print") root.innerHTML = GL.renderViewPrint(cls, list);
    else root.innerHTML = GL.renderViewCards(cls, list);
  };

  GL.renderAddInfoGrid = function renderAddInfoGrid() {
    var grid = document.getElementById("addInfoGrid");
    if (!grid || !GL.INFO_FIELDS) return;
    // chỉ build 1 lần nếu đã có input
    if (grid.querySelector("[id^='addInfo_']")) return;
    grid.innerHTML = GL.INFO_FIELDS.map(function (f) {
      if (f.type === "select") {
        var opts = (f.options || [])
          .map(function (o) {
            return (
              '<option value="' +
              GL.escapeHtml(o) +
              '">' +
              (o || "—") +
              "</option>"
            );
          })
          .join("");
        return (
          '<div><label class="field-label" for="addInfo_' +
          f.key +
          '">' +
          f.label +
          '</label><select id="addInfo_' +
          f.key +
          '">' +
          opts +
          "</select></div>"
        );
      }
      var t = f.type === "date" ? "date" : f.type === "tel" ? "tel" : "text";
      return (
        '<div><label class="field-label" for="addInfo_' +
        f.key +
        '">' +
        f.label +
        '</label><input id="addInfo_' +
        f.key +
        '" type="' +
        t +
        '" placeholder="' +
        GL.escapeHtml(f.placeholder || "") +
        '" /></div>'
      );
    }).join("");
  };

  /** Cập nhật topbar + bottom-nav + FAB (mobile) */
  GL.updateMobileChrome = function updateMobileChrome(which, cls) {
    var mTitle = document.getElementById("mTopTitle");
    var mSub = document.getElementById("mTopSub");
    var fab = document.getElementById("mFabAdd");
    var year =
      typeof GL.activeYearFilter === "string" && GL.activeYearFilter
        ? GL.activeYearFilter
        : "";

    if (which === "empty") {
      if (mTitle) mTitle.textContent = "Sổ Điểm Giáo Lý";
      if (mSub) mSub.textContent = "Chưa có lớp";
    } else if (which === "dash") {
      if (mTitle) mTitle.textContent = "Tổng quan";
      if (mSub) mSub.textContent = year ? "Năm " + year : "Tất cả năm học";
    } else if (which === "classes") {
      if (mTitle) mTitle.textContent = "Lớp học";
      if (mSub) mSub.textContent = year ? "Năm " + year : "Chọn lớp để nhập điểm";
    } else if (which === "me") {
      if (mTitle) mTitle.textContent = "Cá nhân";
      var u = typeof GL.currentUser === "function" ? GL.currentUser() : null;
      if (mSub)
        mSub.textContent = u
          ? u.displayName || u.username || "Tài khoản"
          : "Tài khoản";
    } else if (which === "class" && cls) {
      if (mTitle) mTitle.textContent = cls.name || "Lớp";
      if (mSub) {
        var termTxt =
          typeof GL.termLabel === "function"
            ? GL.termLabel(GL.activeTerm)
            : "";
        mSub.textContent = cls.year
          ? cls.year + (termTxt ? " · " + termTxt : "")
          : termTxt || "Nhập điểm";
      }
    }

    document.querySelectorAll(".m-nav-item[data-m-nav]").forEach(function (btn) {
      var key = btn.getAttribute("data-m-nav");
      var on =
        (key === "home" && (which === "dash" || which === "empty")) ||
        (key === "classes" && which === "classes") ||
        (key === "scores" && which === "class") ||
        (key === "me" && which === "me");
      btn.classList.toggle("active", on);
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    if (fab) {
      fab.classList.toggle("hidden", !(which === "class" && !!cls));
    }
  };

  /** Màn danh sách lớp */
  GL.renderClassesView = function renderClassesView() {
    var listEl = document.getElementById("classesViewList");
    var sub = document.getElementById("classesViewSub");
    var yearSel = document.getElementById("classesYearFilter");
    if (yearSel && yearSel.value !== (GL.activeYearFilter || "")) {
      // sync select from global filter (options filled by fillYearSelects)
      try {
        yearSel.value = GL.activeYearFilter || "";
      } catch (e) {
        /* ignore */
      }
    }
    var list =
      typeof GL.classesInScope === "function"
        ? GL.classesInScope()
        : typeof GL.visibleClasses === "function"
          ? GL.visibleClasses()
          : (GL.state && GL.state.classes) || [];
    if (sub) {
      sub.textContent =
        list.length +
        " lớp" +
        (GL.activeYearFilter ? " · " + GL.activeYearFilter : "");
    }
    if (!listEl) return;
    if (!list.length) {
      listEl.innerHTML =
        '<div class="dash-empty"><p>Chưa có lớp. Tạo lớp bên dưới hoặc đổi năm học.</p></div>';
      return;
    }
    var activeId = GL.state && GL.state.activeClassId;
    listEl.innerHTML = list
      .map(function (c, i) {
        var n = (c.students && c.students.length) || 0;
        var on = c.id === activeId ? " is-active" : "";
        return (
          '<button type="button" class="classes-item' +
          on +
          '" data-open-class="' +
          GL.escapeHtml(c.id) +
          '">' +
          '<span class="classes-item-ord">' +
          (i + 1) +
          "</span>" +
          '<span class="classes-item-main">' +
          '<span class="classes-item-name">' +
          GL.escapeHtml(c.name) +
          "</span>" +
          '<span class="classes-item-meta">' +
          GL.escapeHtml(c.year || "Chưa ghi năm") +
          " · " +
          n +
          " HV</span></span>" +
          '<span class="dash-row-chev">›</span></button>'
        );
      })
      .join("");
  };

  /** Màn Cá nhân */
  GL.renderMeView = function renderMeView() {
    var u = typeof GL.currentUser === "function" ? GL.currentUser() : null;
    var nameEl = document.getElementById("meDisplayName");
    var roleEl = document.getElementById("meRoleLabel");
    var userEl = document.getElementById("meUsername");
    if (nameEl) nameEl.textContent = u ? u.displayName || u.username || "—" : "—";
    if (roleEl)
      roleEl.textContent = u
        ? u.role === "ban_gl"
          ? "Ban Giáo lý"
          : "Giáo lý viên"
        : "—";
    if (userEl) userEl.textContent = u ? "@" + (u.username || "") : "";

    var bioLab = document.getElementById("meBioLabel");
    var bioHint = document.getElementById("meBioHint");
    var label =
      typeof GL.bioLabel === "function" ? GL.bioLabel() : "Face ID / vân tay";
    var enabled =
      u &&
      typeof GL.bioIsEnabledForUser === "function" &&
      GL.bioIsEnabledForUser(u.id);
    var supported =
      typeof GL.bioIsSupported === "function" && GL.bioIsSupported();
    if (bioLab) bioLab.textContent = enabled ? "Tắt " + label : "Bật " + label;
    if (bioHint) {
      bioHint.textContent = !supported
        ? "Cần HTTPS / localhost"
        : enabled
          ? "Đang bật trên máy này"
          : "Đăng nhập nhanh bằng sinh trắc";
    }

    var syncHint = document.getElementById("meSyncHint");
    if (syncHint && typeof GL.getSyncStatus === "function") {
      var st = GL.getSyncStatus();
      syncHint.textContent = st.message || (GL.isSupabaseConfigured() ? "Đã cấu hình" : "Chưa cấu hình");
    }

    var adminSec = document.getElementById("meAdminSection");
    if (adminSec) {
      var isAdmin = typeof GL.isBanGL === "function" && GL.isBanGL();
      adminSec.classList.toggle("hidden", !isAdmin);
    }
  };

  var _renderPending = false;
  var lastHome = null;
  var lastViewMode = null;
  var lastScrollY = 0;

  var _actualRender = function () {
    var home = GL.homeView || "dashboard";
    var mode = GL.viewMode;
    
    // Lưu scroll position nếu vẫn ở view cũ
    if (home === lastHome && mode === lastViewMode) {
      lastScrollY = window.scrollY || document.documentElement.scrollTop;
    } else {
      lastScrollY = 0;
    }

    GL.renderClassList();
    var cls = GL.activeClass();
    var noView = document.getElementById("noClassView");
    var classView = document.getElementById("classView");
    var dashView = document.getElementById("dashboardView");
    var classesView = document.getElementById("classesView");
    var meView = document.getElementById("meView");

    function showOnly(which) {
      if (dashView) dashView.classList.toggle("hidden", which !== "dash");
      if (classView) classView.classList.toggle("hidden", which !== "class");
      if (classesView)
        classesView.classList.toggle("hidden", which !== "classes");
      if (meView) meView.classList.toggle("hidden", which !== "me");
      if (noView) noView.classList.toggle("hidden", which !== "empty");
    }

    var anyVisible =
      typeof GL.visibleClasses === "function"
        ? GL.visibleClasses().length
        : (GL.state.classes || []).length;

    // Không có lớp: vẫn cho xem me / empty create
    if (!anyVisible && home !== "me") {
      showOnly("empty");
      if (typeof GL.updateMobileChrome === "function") {
        GL.updateMobileChrome("empty", null);
      }
      if (typeof GL.updateBackupReminderUI === "function") {
        GL.updateBackupReminderUI();
      }
      lastHome = home;
      lastViewMode = mode;
      return;
    }

    if (home === "me") {
      showOnly("me");
      if (typeof GL.renderMeView === "function") GL.renderMeView();
      document.querySelectorAll(".nav-home-btn").forEach(function (b) {
        b.classList.toggle("active", false);
      });
      if (typeof GL.updateMobileChrome === "function") {
        GL.updateMobileChrome("me", cls);
      }
      lastHome = home;
      lastViewMode = mode;
      return;
    }

    if (home === "classes") {
      showOnly("classes");
      if (typeof GL.renderClassesView === "function") GL.renderClassesView();
      document.querySelectorAll(".nav-home-btn").forEach(function (b) {
        b.classList.toggle("active", false);
      });
      if (typeof GL.updateMobileChrome === "function") {
        GL.updateMobileChrome("classes", cls);
      }
      if (typeof GL.updateBackupReminderUI === "function") {
        GL.updateBackupReminderUI();
      }
      lastHome = home;
      lastViewMode = mode;
      return;
    }

    if (home === "dashboard" || (home === "class" && !cls)) {
      // class mà chưa có active → về danh sách lớp (mobile) / dashboard (nếu user chọn dash)
      if (home === "class" && !cls) {
        if (typeof GL.setHomeView === "function") GL.setHomeView("classes");
        showOnly("classes");
        if (typeof GL.renderClassesView === "function") GL.renderClassesView();
        if (typeof GL.updateMobileChrome === "function") {
          GL.updateMobileChrome("classes", null);
        }
        lastHome = "classes";
        lastViewMode = mode;
        return;
      }
      showOnly("dash");
      if (typeof GL.renderDashboard === "function") GL.renderDashboard();
      document.querySelectorAll(".nav-home-btn").forEach(function (b) {
        b.classList.toggle("active", true);
      });
      if (typeof GL.updateMobileChrome === "function") {
        GL.updateMobileChrome("dash", cls);
      }
      if (typeof GL.updateBackupReminderUI === "function") {
        GL.updateBackupReminderUI();
      }
      lastHome = home;
      lastViewMode = mode;
      return;
    }

    // home === class
    showOnly("class");
    document.querySelectorAll(".nav-home-btn").forEach(function (b) {
      b.classList.toggle("active", false);
    });

    var title = document.getElementById("classTitle");
    var sub = document.getElementById("classSubtitle");
    if (title) title.textContent = cls.name;
    if (sub) {
      var termTxt = GL.termLabel(GL.activeTerm);
      sub.textContent = cls.year
        ? "Năm học " + cls.year + " · " + termTxt
        : termTxt + " · Nhập điểm → tự động ra TB";
    }

    if (typeof GL.updateMobileChrome === "function") {
      GL.updateMobileChrome("class", cls);
    }

    GL.renderAddInfoGrid();
    GL.updateTermSwitcherUI();
    GL.renderWeights(cls);
    GL.renderStudents(cls);
    GL.renderStats(cls);
    if (typeof GL.updateBackupReminderUI === "function") {
      GL.updateBackupReminderUI();
    }

    lastHome = home;
    lastViewMode = mode;

    // Restore scroll position
    if (lastScrollY > 0) {
      window.scrollTo(0, lastScrollY);
    }
  };

  GL.render = function render() {
    if (_renderPending) return;
    _renderPending = true;
    requestAnimationFrame(function () {
      _renderPending = false;
      _actualRender();
    });
  };
})(window.GL = window.GL || {});
