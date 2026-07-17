/**
 * Modal quản trị: đồng bộ cloud, đổi PIN, tài khoản GLV, lịch sử điểm, thư mời.
 * Tách từ modals.js (1000+ dòng) — thứ tự đăng ký = thứ tự DOM cũ.
 */
(function (GL) {
  "use strict";

  GL.registerTemplate(
    "modals-admin",
    String.raw`
  <div class="modal-overlay hidden" id="syncModal" role="dialog" aria-modal="true" aria-labelledby="syncModalTitle">
    <div class="modal-panel modal-panel-md">
      <div class="modal-head">
        <div>
          <h3 id="syncModalTitle">☁️ Đồng bộ cloud (Supabase)</h3>
          <p class="modal-sub">Máy tính · điện thoại dùng chung một dữ liệu</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="syncModalClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body" style="padding:14px 18px 8px">
        <p class="hint" style="margin-top:0">
          Project: <code>gqmbhvgyoenweiepvrvk</code><br />
          1) SQL Editor → chạy file <code>supabase/schema.sql</code> (một lần)<br />
          2) Key anon đã gắn sẵn — có thể dán lại nếu cần
        </p>
        <label class="field-label" for="syncAnonKey">Anon public key</label>
        <textarea id="syncAnonKey" class="note-input" rows="3" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." style="font-family:ui-monospace,monospace;font-size:0.75rem"></textarea>
        <label class="field-label" for="syncParishKey" style="margin-top:10px">Mã bảo vệ giáo xứ (nếu đã bật)</label>
        <input id="syncParishKey" type="password" autocomplete="off" placeholder="Để trống nếu chưa bật secure-policies" />
        <p class="hint" style="margin:6px 0 0">Bật bằng cách chạy <code>supabase/secure-policies.sql</code> — chặn người lạ đọc/ghi dữ liệu dù có anon key.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn btn-primary" id="syncSaveKeyBtn">Lưu key</button>
          <button type="button" class="btn btn-ghost" id="syncPullBtn">⬇ Tải từ cloud</button>
          <button type="button" class="btn btn-primary" id="syncPushBtn" title="Bắt buộc làm trên máy đã có điểm trước">⬆ Đẩy lên cloud</button>
        </div>
        <p class="hint" style="margin:10px 0 0;color:var(--gold)">
          <strong>Thứ tự đúng:</strong> máy tính (có điểm) → <strong>Đẩy lên</strong> → điện thoại → <strong>Tải về</strong>.
          Cloud hiện trống thì điện thoại sẽ không có lớp.
        </p>
        <p class="hint" id="syncModalStatus" style="margin:12px 0 0"></p>
        <p class="login-error hidden" id="syncModalError" style="margin-top:8px"></p>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="syncModalDone">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal: Đổi PIN (tài khoản đang đăng nhập) -->
  <div class="modal-overlay hidden" id="changePinModal" role="dialog" aria-modal="true" aria-labelledby="changePinTitle">
    <div class="modal-panel modal-panel-sm">
      <div class="modal-head">
        <div>
          <h3 id="changePinTitle">🔑 Đổi PIN</h3>
          <p class="modal-sub">Bảo vệ tài khoản · tối thiểu 4 ký tự</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="changePinClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <p class="hint" id="changePinUser" style="margin-top:0"></p>
        <p class="hint" style="margin:0 0 10px">
          <strong>PIN hiện tại</strong> = PIN bạn vừa dùng để đăng nhập.<br />
          <strong>PIN mới</strong> = mã mới (2 lần), khác PIN hiện tại.
        </p>
        <label class="field-label" for="pinOld">1. PIN hiện tại (đang dùng)</label>
        <input id="pinOld" type="password" name="gl-pin-current" autocomplete="off" inputmode="numeric" placeholder="PIN lúc đăng nhập" />
        <label class="field-label" for="pinNew" style="margin-top:10px">2. PIN mới</label>
        <input id="pinNew" type="password" name="gl-pin-new" autocomplete="off" inputmode="numeric" placeholder="Tối thiểu 4 ký tự" />
        <label class="field-label" for="pinNew2" style="margin-top:10px">3. Nhập lại PIN mới</label>
        <input id="pinNew2" type="password" name="gl-pin-new2" autocomplete="off" inputmode="numeric" placeholder="Gõ lại PIN mới" />
        <p class="login-error hidden" id="changePinError" style="margin-top:10px"></p>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="changePinCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="changePinSave">Lưu PIN mới</button>
      </div>
    </div>
  </div>

  <!-- Modal: Admin xem/sửa tài khoản (PIN, username, xóa) -->
  <div class="modal-overlay hidden" id="editUserModal" role="dialog" aria-modal="true" aria-labelledby="editUserTitle">
    <div class="modal-panel modal-panel-md">
      <div class="modal-head">
        <div>
          <h3 id="editUserTitle">Sửa tài khoản</h3>
          <p class="modal-sub" id="editUserSub">Xem PIN · đổi tên đăng nhập · gán lớp</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="editUserClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="editUserId" />
        <label class="field-label" for="editUserUsername">Tên đăng nhập</label>
        <input id="editUserUsername" type="text" autocomplete="off" placeholder="vd: glv1a" />
        <label class="field-label" for="editUserDisplay" style="margin-top:10px">Họ tên hiển thị</label>
        <input id="editUserDisplay" type="text" />
        <div class="pin-view-box" style="margin-top:12px">
          <label class="field-label">PIN hiện tại (admin xem được)</label>
          <div class="pin-view-row">
            <input id="editUserPinView" type="text" readonly class="pin-view-input" />
            <button type="button" class="btn btn-ghost" id="editUserPinToggle" title="Hiện / ẩn PIN">👁</button>
            <button type="button" class="btn btn-ghost" id="editUserPinCopy" title="Sao chép PIN">📋</button>
          </div>
          <p class="hint" id="editUserPinHint" style="margin:6px 0 0"></p>
        </div>
        <label class="field-label" for="editUserPin" style="margin-top:12px">Đặt PIN mới (để trống = giữ nguyên)</label>
        <input id="editUserPin" type="password" autocomplete="new-password" placeholder="Tối thiểu 4 ký tự nếu đổi" />
        <label class="field-label" for="editUserPin2" style="margin-top:10px">Nhập lại PIN mới</label>
        <input id="editUserPin2" type="password" autocomplete="new-password" placeholder="Chỉ khi đổi PIN" />
        <div id="editUserClassesWrap" style="margin-top:12px">
          <label class="field-label">Gán lớp (GLV)</label>
          <div id="editUserClasses" class="user-class-checks"></div>
        </div>
        <p class="login-error hidden" id="editUserError" style="margin-top:10px"></p>
      </div>
      <div class="modal-foot" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
        <button type="button" class="btn btn-danger-soft" id="editUserDelete">🗑 Xóa tài khoản</button>
        <div style="display:flex;gap:8px;margin-left:auto">
          <button type="button" class="btn btn-ghost" id="editUserCancel">Hủy</button>
          <button type="button" class="btn btn-primary" id="editUserSave">Lưu</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Quản lý user -->
  <div class="modal-overlay hidden" id="usersModal" role="dialog" aria-modal="true">
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3>Tài khoản Giáo lý viên</h3>
          <p class="modal-sub">Chỉ Ban Giáo lý · gán lớp cho GLV</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="usersModalClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <div class="io-box" style="margin-bottom:14px">
          <h4>Thêm tài khoản</h4>
          <div class="add-info-grid" style="padding:0">
            <div>
              <label class="field-label">Tên đăng nhập</label>
              <input id="newUserName" type="text" placeholder="glv1a" />
            </div>
            <div>
              <label class="field-label">Họ tên hiển thị</label>
              <input id="newUserDisplay" type="text" placeholder="Cô / Thầy …" />
            </div>
            <div>
              <label class="field-label">PIN (tối thiểu 4)</label>
              <input id="newUserPin" type="password" placeholder="••••" />
            </div>
            <div>
              <label class="field-label">Vai trò</label>
              <select id="newUserRole">
                <option value="glv">Giáo lý viên</option>
                <option value="ban_gl">Ban Giáo lý</option>
              </select>
            </div>
          </div>
          <div style="margin-top:10px">
            <label class="field-label">Gán lớp (GLV)</label>
            <div id="newUserClasses" class="user-class-checks"></div>
          </div>
          <button type="button" class="btn btn-primary" id="createUserBtn" style="margin-top:10px">+ Tạo tài khoản</button>
        </div>
        <h4 style="margin-bottom:8px">Danh sách tài khoản</h4>
        <div id="usersList"></div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="usersModalDone">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal: Lịch sử sửa điểm -->
  <div class="modal-overlay hidden" id="historyModal" role="dialog" aria-modal="true">
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3>Lịch sử sửa điểm</h3>
          <p class="modal-sub" id="historyMeta">Ai · lúc nào · sửa điểm của ai</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="historyModalClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-toolbar" style="padding-top:10px">
        <div class="modal-mode">
          <label for="historyFilterClass">Lớp</label>
          <select id="historyFilterClass"></select>
        </div>
        <div class="search-wrap" style="max-width:none;flex:1">
          <input type="text" id="historyFilterQ" placeholder="Tìm theo tên HV, người sửa, cột điểm…" />
        </div>
        <button type="button" class="btn btn-ghost" id="historyRefreshBtn">Làm mới</button>
        <button type="button" class="btn btn-danger-soft" id="historyClearBtn">Xóa lịch sử</button>
      </div>
      <div class="modal-body" id="historyBody" style="max-height:min(60vh,520px);overflow:auto"></div>
      <div class="modal-foot">
        <p class="hint" style="margin:0;flex:1;text-align:left">
          Tự lưu khi nhập điểm và khi thoát app. Lịch sử nằm trong file <strong>Sao lưu</strong>.
        </p>
        <button type="button" class="btn btn-ghost" id="historyModalDone">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal: Thư mời họp phụ huynh (+ mẫu in) -->
  <div class="modal-overlay hidden" id="inviteModal" role="dialog" aria-modal="true">
    <div class="modal-panel invite-modal-panel">
      <div class="modal-head">
        <div>
          <h3>Thư mời họp phụ huynh</h3>
          <p class="modal-sub">Mẫu soạn sẵn · mẫu in giáo xứ · chọn em · xem trước · in</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="inviteModalClose" aria-label="Đóng">×</button>
      </div>
      <div class="invite-layout">
        <div class="invite-form-col">
          <details class="invite-print-settings" id="invitePrintSettingsPanel">
            <summary>🖨️ Mẫu in giáo xứ <span class="hint" style="font-weight:500">(tiêu đề · chữ ký · chân trang)</span></summary>
            <div class="invite-print-body">
              <div class="add-info-grid" style="padding:0">
                <div>
                  <label class="field-label" for="psGiaoHat">Giáo hạt</label>
                  <input id="psGiaoHat" type="text" />
                </div>
                <div>
                  <label class="field-label" for="psGiaoXu">Giáo xứ</label>
                  <input id="psGiaoXu" type="text" />
                </div>
                <div>
                  <label class="field-label" for="psTieuDe">Tiêu đề bảng</label>
                  <input id="psTieuDe" type="text" />
                </div>
                <div>
                  <label class="field-label" for="psNamHoc">Năm học (mặc định)</label>
                  <input id="psNamHoc" type="text" placeholder="2025-2026" />
                </div>
                <div>
                  <label class="field-label" for="psGlv">Tên Giáo lý viên (ký)</label>
                  <input id="psGlv" type="text" />
                </div>
                <div>
                  <label class="field-label" for="psBanGL">Tên Ban Giáo lý (ký)</label>
                  <input id="psBanGL" type="text" />
                </div>
              </div>
              <div style="margin-top:10px">
                <label class="field-label" for="psFooter">Ghi chú chân trang</label>
                <textarea id="psFooter" class="note-input" rows="2"></textarea>
              </div>
              <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
                <button type="button" class="btn btn-primary" id="printSettingsSave" style="padding:8px 14px;font-size:0.88rem">Lưu mẫu in</button>
              </div>
            </div>
          </details>

          <div class="export-mode-list invite-type-list" id="inviteTypeList">
            <label class="export-mode-opt">
              <input type="radio" name="inviteType" value="dauNam" checked />
              <span class="export-mode-body">
                <strong>Họp đầu năm</strong>
                <small>Thông báo năm học mới, quy định lớp</small>
              </span>
            </label>
            <label class="export-mode-opt">
              <input type="radio" name="inviteType" value="diemThap" />
              <span class="export-mode-body">
                <strong>Điểm thấp</strong>
                <small>Tự gợi ý em TB &lt; 6.5</small>
              </span>
            </label>
            <label class="export-mode-opt">
              <input type="radio" name="inviteType" value="khongHocBai" />
              <span class="export-mode-body">
                <strong>Không học bài</strong>
                <small>Gợi ý từ ghi chú chuyên cần</small>
              </span>
            </label>
            <label class="export-mode-opt">
              <input type="radio" name="inviteType" value="viPham" />
              <span class="export-mode-body">
                <strong>Vi phạm</strong>
                <small>Gợi ý từ ghi chú kỷ luật</small>
              </span>
            </label>
          </div>

          <p class="hint" id="inviteAutoHint" style="margin:8px 0"></p>

          <div class="invite-meta-grid">
            <div>
              <label class="field-label" for="inviteTerm">Kỳ tính TB (điểm thấp)</label>
              <select id="inviteTerm">
                <option value="hk1">Học kỳ 1</option>
                <option value="hk2">Học kỳ 2</option>
                <option value="year">Cả năm</option>
              </select>
            </div>
            <div>
              <label class="field-label" for="inviteDatetime">Thời gian họp</label>
              <input id="inviteDatetime" type="datetime-local" />
            </div>
            <div style="grid-column:1/-1">
              <label class="field-label" for="inviteTimeText">Hoặc ghi thời gian bằng chữ</label>
              <input id="inviteTimeText" type="text" placeholder="VD: 8g00 Chúa nhật 20/04/2026" />
            </div>
            <div style="grid-column:1/-1">
              <label class="field-label" for="invitePlace">Địa điểm</label>
              <input id="invitePlace" type="text" placeholder="Phòng học giáo lý / Hội trường" />
            </div>
            <div style="grid-column:1/-1">
              <label class="field-label" for="inviteSubject">Tiêu đề thư</label>
              <input id="inviteSubject" type="text" />
            </div>
            <div style="grid-column:1/-1">
              <label class="field-label" for="inviteReason">Lý do mời (nội dung chính)</label>
              <textarea id="inviteReason" class="note-input" rows="3"></textarea>
            </div>
            <div style="grid-column:1/-1">
              <label class="field-label" for="inviteExtra">Ghi chú thêm (chung cho các thư)</label>
              <textarea id="inviteExtra" class="note-input" rows="2" placeholder="Tùy chọn — sẽ in thêm nếu có"></textarea>
            </div>
            <label class="check-all" style="grid-column:1/-1">
              <input type="checkbox" id="inviteShowTb" checked /> Hiện điểm TB trên thư (với từng em)
            </label>
          </div>

          <div class="invite-st-toolbar">
            <strong>Chọn học viên</strong>
            <button type="button" class="btn btn-ghost" id="inviteSelectAll" style="padding:8px 14px;font-size:0.88rem">Chọn tất cả</button>
            <button type="button" class="btn btn-ghost" id="inviteSelectNone" style="padding:8px 14px;font-size:0.88rem">Bỏ chọn</button>
            <button type="button" class="btn btn-ghost" id="inviteSelectSuggest" style="padding:8px 14px;font-size:0.88rem">Chỉ gợi ý</button>
          </div>
          <div class="invite-st-list" id="inviteStudentList"></div>
        </div>

        <div class="invite-preview-col">
          <div class="invite-preview-head">
            <strong>Xem trước</strong>
            <button type="button" class="btn btn-ghost" id="inviteRefreshPreview" style="padding:8px 14px;font-size:0.88rem">Làm mới</button>
          </div>
          <div class="invite-preview" id="invitePreview"></div>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="inviteModalDone">Đóng</button>
        <button type="button" class="btn btn-primary" id="invitePrintBtn">🖨️ In thư mời</button>
      </div>
    </div>
  </div>
`
  );
})((window.GL = window.GL || {}));
