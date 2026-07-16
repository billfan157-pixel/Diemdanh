/**
 * app-shell DOM template.
 * Generated from the former monolithic index.html so the app can stay offline/file:// friendly.
 */
(function (GL) {
  "use strict";

  GL.registerTemplate("app-shell", String.raw`
<div class="app hidden" id="appRoot">
    <!-- Mobile: thanh trên kiểu app -->
    <header class="m-topbar" id="mTopbar">
      <button type="button" class="m-topbar-btn" id="mOpenDrawer" aria-label="Mở menu lớp">
        <span class="m-hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <div class="m-topbar-titles">
        <strong class="m-top-title" id="mTopTitle">Sổ Điểm Giáo Lý</strong>
        <span class="m-top-sub" id="mTopSub">Tổng quan</span>
      </div>
      <button type="button" class="m-topbar-btn m-topbar-btn-text" id="mTopHelp" aria-label="Hướng dẫn" title="Hướng dẫn">
        <span class="m-help-mark">?</span>
      </button>
    </header>

    <!-- Lớp phủ khi mở drawer mobile -->
    <div class="sidebar-scrim hidden" id="sidebarScrim"></div>

    <!-- SIDEBAR: Lớp (desktop cột trái · mobile = drawer) -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-head">
        <div class="brand">
          <div class="brand-row">
            <div class="brand-icon">✝</div>
            <div>
              <h1>Sổ Điểm Giáo Lý</h1>
              <p>Lưu điểm theo từng lớp</p>
            </div>
          </div>
        </div>
        <button type="button" class="sidebar-toggle" id="sidebarToggle" aria-label="Mở danh sách lớp">☰</button>
        <button type="button" class="m-drawer-close" id="mCloseDrawer" aria-label="Đóng menu">×</button>
      </div>

      <div class="sidebar-body">
        <div class="sidebar-user" id="sidebarUser"></div>

        <div class="year-filter-box">
          <label class="field-label" for="yearFilterSelect">Năm học</label>
          <select id="yearFilterSelect" title="Chỉ hiện lớp thuộc năm học này">
            <option value="">Tất cả năm học</option>
          </select>
          <p class="hint" style="margin:6px 0 0;font-size:0.72rem">Lọc lớp · dashboard · xuất nhiều lớp</p>
        </div>

        <button type="button" class="btn btn-ghost btn-block nav-home-btn sidebar-tool-btn" id="openDashboardBtn" title="Tổng quan giáo xứ / năm học" style="margin-bottom:8px">
          📊 Tổng quan năm học
        </button>

        <div class="sidebar-accordion open" id="classesAccordion">
          <button type="button" class="sidebar-acc-toggle" id="classesToggle" aria-expanded="true" aria-controls="classesPanel">
            <span class="sidebar-acc-label">
              <span class="sidebar-acc-title">Các lớp của bạn</span>
              <span class="sidebar-acc-count" id="classesToggleCount"></span>
            </span>
            <span class="sidebar-acc-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="sidebar-acc-panel" id="classesPanel">
            <div class="class-list" id="classList"></div>
            <div class="new-class-form">
              <input type="text" id="newClassName" placeholder="Tên lớp (vd: Ấu Nhi 1A)" maxlength="60" />
              <input type="text" id="newClassYear" placeholder="Năm học (vd: 2025-2026)" maxlength="20" title="Nên ghi rõ để lọc theo năm học" />
              <button type="button" class="btn btn-primary btn-block" id="addClassBtn">+ Tạo lớp mới</button>
            </div>
          </div>
        </div>

        <div class="sidebar-tools" id="sidebarTools">
          <div class="section-label" style="margin-top:14px">Công cụ</div>
          <div class="undo-redo-row">
            <button type="button" class="btn btn-ghost undo-redo-btn" id="undoBtnSidebar" title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" disabled>↶</button>
            <button type="button" class="btn btn-ghost undo-redo-btn" id="redoBtnSidebar" title="Làm lại (Ctrl+Y)" aria-label="Làm lại" disabled>↷</button>
          </div>
          <div class="sync-status-box" id="syncStatusBox" title="Đồng bộ Supabase">
            <span class="sync-dot" id="syncDot"></span>
            <span class="sync-text" id="syncText">Cloud: chưa cấu hình</span>
          </div>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="openSyncModal" title="Cấu hình &amp; đồng bộ Supabase">
            ☁️ Đồng bộ cloud
          </button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn" id="openIoModal" title="Xuất điểm · Admin có thêm Nhập file">
            📤 Xuất / Nhập
          </button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn admin-only hidden" id="openParishModal" title="Xem tổng hợp mọi học viên toàn giáo xứ">
            🏛️ Tổng hợp giáo xứ
          </button>
          <button type="button" class="btn btn-ghost btn-block sidebar-tool-btn admin-only hidden" id="openMissingBtn" title="Danh sách HV thiếu điểm">
            ⚠️ Nhắc thiếu điểm
          </button>
        </div>

        <div id="adminActions" class="admin-actions hidden">
          <div class="section-label" style="margin-top:14px">Quản trị</div>
          <div id="backupStatusSide" class="backup-status-side hidden"></div>
          <button type="button" class="btn btn-ghost btn-block" id="openUsersModal" style="margin-bottom:6px">👥 Tài khoản GLV</button>
        </div>

        <div class="sidebar-tip">
          💡 Sao lưu JSON định kỳ · Đổi PIN khỏi 1234 · GLV chỉ xuất điểm.
        </div>
      </div>
    </aside>

    <!-- MAIN -->
    <main class="main" id="mainContent">
      <div id="noClassView" class="no-class hidden">
        <div class="empty-icon">📚</div>
        <h2>Chưa có lớp nào</h2>
        <p>Tạo lớp đầu tiên ở cột trái (vd: <strong>Ấu Nhi 1A</strong>, <strong>Thiếu Nhi 2B</strong>) để bắt đầu lưu điểm.</p>
        <div class="no-class-actions">
          <button type="button" class="btn btn-primary" id="focusNewClass">Tạo lớp ngay</button>
          <button type="button" class="btn btn-ghost admin-only" id="openIoFromEmpty" title="Nhập file Excel/Word — chỉ admin">
            📥 Nhập file điểm
          </button>
        </div>
        <p class="hint" style="margin-top:14px;max-width:360px;text-align:center">
          Hoặc dùng <strong>Công cụ → Xuất / Nhập</strong> ở cột trái. File có cột <em>Lớp</em> có thể tạo lớp mới khi nhập.
        </p>
      </div>

      <!-- Banner nhắc sao lưu (admin) -->
      <div id="backupReminderBanner" class="backup-reminder-banner hidden" role="status">
        <div class="backup-reminder-inner">
          <p id="backupReminderMsg" style="margin:0;flex:1"></p>
          <div class="backup-reminder-actions">
            <button type="button" class="btn btn-success" id="backupReminderExport">💾 Sao lưu ngay</button>
            <button type="button" class="btn btn-ghost" id="backupReminderLater" title="Nhắc lại sau">Để sau</button>
          </div>
        </div>
      </div>

      <!-- Dashboard tổng quan (mặc định khi mở app) -->
      <div id="dashboardView" class="dashboard-view hidden">
        <div class="dash-hero">
          <div class="dash-hero-text">
            <h2 class="dash-hero-title">Tổng quan</h2>
            <p class="dash-hero-sub" id="dashSubtitle">Số lớp · TB · thiếu điểm</p>
          </div>
          <div class="dash-filters">
            <div class="dash-filter">
              <label for="dashYearFilter">Năm học</label>
              <select id="dashYearFilter">
                <option value="">Tất cả</option>
              </select>
            </div>
            <div class="dash-filter">
              <label for="dashTerm">Kỳ</label>
              <select id="dashTerm">
                <option value="hk1">HK1</option>
                <option value="hk2">HK2</option>
                <option value="year">Cả năm</option>
              </select>
            </div>
          </div>
          <div class="dash-hero-actions admin-only">
            <button type="button" class="btn btn-ghost dash-action-btn" id="dashMissingBtn" title="Danh sách HV thiếu điểm">⚠️ Thiếu điểm</button>
            <button type="button" class="btn btn-success dash-action-btn" id="dashExportMultiBtn" title="Xuất mọi lớp năm học ra 1 Excel">📤 Xuất Excel</button>
          </div>
        </div>

        <div class="dash-stats" id="dashStats"></div>

        <div class="dash-grid">
          <section class="card dash-card">
            <div class="dash-card-head">
              <div class="dash-card-ico dash-card-ico-red">🎯</div>
              <div>
                <h3>Cần quan tâm</h3>
                <p>Điểm + nhật ký theo dõi</p>
              </div>
            </div>
            <div class="dash-card-body" id="dashAttentionList"></div>
          </section>
          <section class="card dash-card">
            <div class="dash-card-head">
              <div class="dash-card-ico dash-card-ico-orange">📉</div>
              <div>
                <h3>Top yếu</h3>
                <p>TB &lt; 5</p>
              </div>
            </div>
            <div class="dash-card-body" id="dashWeakList"></div>
          </section>
          <section class="card dash-card">
            <div class="dash-card-head">
              <div class="dash-card-ico dash-card-ico-amber">⚠️</div>
              <div>
                <h3>Thiếu điểm</h3>
                <p>Chưa nhập đủ cột</p>
              </div>
            </div>
            <div class="dash-col-chips" id="dashMissingByCol"></div>
            <div class="dash-card-body" id="dashMissingList"></div>
          </section>
        </div>

        <section class="card dash-classes-card">
          <div class="dash-card-head">
            <div class="dash-card-ico dash-card-ico-blue">📚</div>
            <div>
              <h3>Theo lớp</h3>
              <p>Chạm để mở bảng điểm</p>
            </div>
          </div>
          <div class="dash-class-list" id="dashClassList"></div>
          <div class="modal-table-wrap dash-class-table-wrap">
            <table class="import-preview-table" id="dashClassTable">
              <thead>
                <tr>
                  <th style="width:40px">STT</th>
                  <th>Lớp</th>
                  <th>HV</th>
                  <th>TB</th>
                  <th>Giỏi+</th>
                  <th>Yếu</th>
                  <th>Thiếu</th>
                </tr>
              </thead>
              <tbody id="dashClassTbody"></tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Màn danh sách lớp (bottom nav «Lớp») -->
      <div id="classesView" class="classes-view hidden">
        <div class="classes-hero">
          <h2 class="classes-hero-title">Lớp học</h2>
          <p class="classes-hero-sub" id="classesViewSub">Chọn lớp để nhập điểm</p>
          <div class="classes-filter">
            <label class="field-label" for="classesYearFilter">Năm học</label>
            <select id="classesYearFilter" title="Lọc lớp theo năm">
              <option value="">Tất cả năm học</option>
            </select>
          </div>
        </div>
        <div class="classes-list" id="classesViewList"></div>
        <div class="classes-create card" id="classesCreateBox">
          <h3 class="classes-create-title">Tạo lớp mới</h3>
          <input type="text" id="classesNewName" placeholder="Tên lớp (vd: Ấu Nhi 1A)" maxlength="60" />
          <input type="text" id="classesNewYear" placeholder="Năm học (vd: 2025-2026)" maxlength="20" />
          <button type="button" class="btn btn-primary btn-block" id="classesAddBtn">+ Tạo lớp</button>
        </div>
      </div>

      <!-- Màn Cá nhân (bottom nav «Cá nhân») -->
      <div id="meView" class="me-view hidden">
        <div class="me-hero">
          <div class="me-avatar" aria-hidden="true">✝</div>
          <div class="me-hero-text">
            <h2 class="me-name" id="meDisplayName">—</h2>
            <p class="me-role" id="meRoleLabel">—</p>
            <p class="me-user" id="meUsername">—</p>
          </div>
        </div>
        <div class="me-section">
          <h3 class="me-section-title">Tài khoản</h3>
          <button type="button" class="me-row" id="meChangePin">
            <span class="me-row-ico">🔑</span>
            <span class="me-row-txt"><strong>Đổi PIN</strong><small>Bảo mật đăng nhập</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" id="meBioToggle">
            <span class="me-row-ico">🔐</span>
            <span class="me-row-txt"><strong id="meBioLabel">Face ID / vân tay</strong><small id="meBioHint">Trên máy này</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" id="meSync">
            <span class="me-row-ico">☁️</span>
            <span class="me-row-txt"><strong>Đồng bộ cloud</strong><small id="meSyncHint">Supabase</small></span>
            <span class="me-row-chev">›</span>
          </button>
        </div>
        <div class="me-section">
          <h3 class="me-section-title">Công cụ</h3>
          <button type="button" class="me-row" id="meIo">
            <span class="me-row-ico">📤</span>
            <span class="me-row-txt"><strong>Xuất / Nhập</strong><small>Excel · CSV</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" id="meHelp">
            <span class="me-row-ico">❓</span>
            <span class="me-row-txt"><strong>Hướng dẫn</strong><small>Cách dùng app</small></span>
            <span class="me-row-chev">›</span>
          </button>
        </div>
        <div class="me-section admin-only hidden" id="meAdminSection">
          <h3 class="me-section-title">Quản trị (Ban GL)</h3>
          <button type="button" class="me-row" data-me-action="users">
            <span class="me-row-ico">👥</span>
            <span class="me-row-txt"><strong>Tài khoản GLV</strong><small>Tạo · sửa · xóa</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" data-me-action="backup">
            <span class="me-row-ico">💾</span>
            <span class="me-row-txt"><strong>Sao lưu</strong><small>JSON trên máy</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" data-me-action="invite">
            <span class="me-row-ico">📨</span>
            <span class="me-row-txt"><strong>Mời họp PH</strong><small>Thư mời · mẫu in</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" data-me-action="parish">
            <span class="me-row-ico">🏛️</span>
            <span class="me-row-txt"><strong>Tổng hợp giáo xứ</strong><small>Toàn bộ HV</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" data-me-action="history">
            <span class="me-row-ico">🕒</span>
            <span class="me-row-txt"><strong>Lịch sử điểm</strong><small>Ai sửa gì</small></span>
            <span class="me-row-chev">›</span>
          </button>
          <button type="button" class="me-row" data-me-action="weights">
            <span class="me-row-ico">⚖️</span>
            <span class="me-row-txt"><strong>Hệ số cột</strong><small>Lớp đang chọn</small></span>
            <span class="me-row-chev">›</span>
          </button>
        </div>
        <button type="button" class="btn btn-danger-soft btn-block me-logout" id="meLogout">Đăng xuất</button>
      </div>

      <div id="classView" class="hidden">
        <div class="page-header">
          <div class="page-title">
            <h2 id="classTitle">—</h2>
            <p id="classSubtitle">Nhập điểm → tự động ra trung bình</p>
          </div>
          <div class="stats m-stat-strip" id="classStats">
            <div class="stat">
              <div class="stat-label">Học viên</div>
              <div class="stat-value accent" id="statCount">0</div>
            </div>
            <div class="stat">
              <div class="stat-label" id="statAvgLabel">TB lớp (HK1)</div>
              <div class="stat-value gold" id="statAvg">—</div>
            </div>
            <div class="stat">
              <div class="stat-label">Giỏi trở lên</div>
              <div class="stat-value green" id="statGood">0</div>
            </div>
            <div class="stat">
              <div class="stat-label">TB cả năm</div>
              <div class="stat-value" id="statYearAvg" style="color:var(--purple)">—</div>
            </div>
          </div>
        </div>

        <!-- Khối điều khiển sticky trên mobile -->
        <div class="m-class-controls" id="mClassControls">
          <div class="term-switcher m-seg" id="termSwitcher" role="tablist" aria-label="Học kỳ">
            <button type="button" class="term-btn active" data-term="hk1">
              <span class="term-txt">HK1</span>
            </button>
            <button type="button" class="term-btn" data-term="hk2">
              <span class="term-txt">HK2</span>
            </button>
            <button type="button" class="term-btn term-btn-year" data-term="year">
              <span class="term-txt">Cả năm</span>
            </button>
            <span class="term-note" id="termNote">Đang xem bảng điểm <strong>Học kỳ 1</strong></span>
          </div>

          <div class="view-switcher m-seg m-seg-scroll" id="viewSwitcher" role="tablist" aria-label="Kiểu hiển thị">
            <button type="button" class="view-btn active" data-view="cards" title="Nhập điểm"><span class="vb-ico">✏️</span><span class="vb-txt">Nhập</span></button>
            <button type="button" class="view-btn" data-view="table" title="Bảng"><span class="vb-ico">📊</span><span class="vb-txt">Bảng</span></button>
            <button type="button" class="view-btn view-btn-year" data-view="year" title="Tổng kết cả năm" style="display:none"><span class="vb-ico">📅</span><span class="vb-txt">Tổng kết</span></button>
            <button type="button" class="view-btn" data-view="journal" title="Theo dõi"><span class="vb-ico">📋</span><span class="vb-txt">Theo dõi</span></button>
            <button type="button" class="view-btn view-btn-more" id="viewMoreBtn" title="Thêm chế độ xem" data-view-more="1">
              <span class="vb-ico">⋯</span><span class="vb-txt">Thêm</span>
            </button>
            <!-- Desktop: hiện đủ tab -->
            <button type="button" class="view-btn view-btn-desktop" data-view="rank" title="Xếp hạng"><span class="vb-ico">🏆</span><span class="vb-txt">Hạng</span></button>
            <button type="button" class="view-btn view-btn-desktop" data-view="stats" title="Thống kê"><span class="vb-ico">📈</span><span class="vb-txt">TK</span></button>
            <button type="button" class="view-btn view-btn-desktop" data-view="print" title="In"><span class="vb-ico">🖨️</span><span class="vb-txt">In</span></button>
          </div>

          <div class="toolbar m-search-bar" id="listToolbar">
            <div class="search-wrap">
              <input type="text" id="searchInput" placeholder="Tìm học viên…" enterkeyhint="search" />
            </div>
            <button type="button" class="btn btn-ghost m-btn-sort" id="sortBtn" title="Sắp xếp theo TB">TB ↓</button>
            <button type="button" class="btn btn-danger-soft m-btn-clear" id="clearBtn">Xóa hết HV</button>
          </div>
        </div>

        <!-- Nút desktop (ẩn trên mobile — dùng FAB + sheet) -->
        <div class="quick-actions" id="quickActions">
          <button type="button" class="chip-btn chip-btn-icon" id="undoBtn" title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" disabled>
            <span class="chip-ico">↶</span>
          </button>
          <button type="button" class="chip-btn chip-btn-icon" id="redoBtn" title="Làm lại (Ctrl+Y)" aria-label="Làm lại" disabled>
            <span class="chip-ico">↷</span>
          </button>
          <button type="button" class="chip-btn chip-btn-primary" id="openAddStudentModal" title="Thêm học viên">
            <span class="chip-ico">👤</span>
            <span class="chip-text">Thêm HV</span>
          </button>
          <button type="button" class="chip-btn admin-only" id="openWeightsModal" title="Hệ số cột điểm (admin)">
            <span class="chip-ico">⚖️</span>
            <span class="chip-text">Hệ số</span>
            <span class="chip-badge" id="weightsBadge">×1…×3</span>
          </button>
          <button type="button" class="chip-btn" id="openReportsModal" title="Báo cáo nhanh">
            <span class="chip-ico">📊</span>
            <span class="chip-text">Báo cáo</span>
          </button>
          <button type="button" class="chip-btn admin-only" id="openBackupModal" title="Sao lưu / khôi phục (admin)">
            <span class="chip-ico">💾</span>
            <span class="chip-text">Sao lưu</span>
          </button>
          <button type="button" class="chip-btn admin-only" id="openInviteModal" title="Thư mời họp phụ huynh · mẫu in (admin)">
            <span class="chip-ico">📨</span>
            <span class="chip-text">Mời họp PH</span>
          </button>
          <button type="button" class="chip-btn admin-only" id="openHistoryModal" title="Lịch sử sửa điểm (admin)">
            <span class="chip-ico">🕒</span>
            <span class="chip-text">Lịch sử</span>
          </button>
        </div>

        <!-- List -->
        <section class="card m-score-card">
          <div class="card-head">
            <h3><span class="emoji">📋</span> Điểm học viên <span class="term-pill" id="listTermPill">HK1</span></h3>
            <span class="card-sub" id="listMeta"></span>
          </div>
          <div class="view-hint" id="viewHint"></div>
          <div class="students" id="students"></div>
        </section>

        <footer class="m-desktop-footer">Dữ liệu lưu trên máy bạn · Mỗi lớp độc lập · Thang điểm 10</footer>
      </div>
    </main>

    <!-- Mobile: thao tác chính luôn trong tầm ngón tay cái -->
    <button type="button" class="m-fab hidden" id="mFabAdd" title="Thêm học viên" aria-label="Thêm học viên">
      <span class="m-fab-ico">＋</span>
      <span class="m-fab-label">Thêm học viên</span>
    </button>

    <!-- Mobile: bottom navigation — Tổng quan · Lớp · Điểm · Cá nhân -->
    <nav class="m-bottom-nav" id="mBottomNav" aria-label="Điều hướng chính">
      <div class="m-bottom-nav-inner">
        <button type="button" class="m-nav-item active" data-m-nav="home">
          <svg class="m-nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <span class="m-nav-lab">Tổng quan</span>
        </button>
        <button type="button" class="m-nav-item" data-m-nav="classes">
          <svg class="m-nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            <path d="M8 7h8M8 11h6"/>
          </svg>
          <span class="m-nav-lab">Lớp</span>
        </button>
        <button type="button" class="m-nav-item m-nav-item-primary" data-m-nav="scores">
          <span class="m-nav-primary-ring" aria-hidden="true">
            <svg class="m-nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              <path d="M15 4h3a2 2 0 012 2v1"/>
            </svg>
          </span>
          <span class="m-nav-lab">Điểm</span>
        </button>
        <button type="button" class="m-nav-item" data-m-nav="me">
          <svg class="m-nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="m-nav-lab">Cá nhân</span>
        </button>
      </div>
    </nav>

    <!-- Sheet: thêm chế độ xem trong màn Điểm -->
    <div class="m-sheet-overlay hidden" id="mViewMoreSheet" role="dialog" aria-modal="true" aria-labelledby="mViewMoreTitle">
      <div class="m-sheet m-sheet-sm">
        <div class="m-sheet-handle" aria-hidden="true"></div>
        <div class="m-sheet-head">
          <h3 id="mViewMoreTitle">Chế độ xem thêm</h3>
          <button type="button" class="m-icon-btn" id="mViewMoreClose" aria-label="Đóng">×</button>
        </div>
        <div class="m-sheet-list">
          <button type="button" class="m-sheet-list-btn" data-view="rank">🏆 Xếp hạng</button>
          <button type="button" class="m-sheet-list-btn" data-view="stats">📈 Thống kê</button>
          <button type="button" class="m-sheet-list-btn" data-view="print">🖨️ Bản in</button>
          <button type="button" class="m-sheet-list-btn" data-m-action="reports">📊 Báo cáo nhanh</button>
          <button type="button" class="m-sheet-list-btn admin-only hidden" data-m-action="weights">⚖️ Hệ số cột</button>
        </div>
      </div>
    </div>
  </div>
`);
})(window.GL = window.GL || {});
