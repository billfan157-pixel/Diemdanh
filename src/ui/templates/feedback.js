/**
 * feedback DOM template.
 * Generated from the former monolithic index.html so the app can stay offline/file:// friendly.
 */
(function (GL) {
  "use strict";

  GL.registerTemplate("feedback", String.raw`
<!-- Nút hướng dẫn góc — chỉ dấu ? (desktop; mobile dùng topbar / sheet) -->
  <button type="button" class="help-fab hidden" id="openHelpModal" title="Hướng dẫn nhanh" aria-label="Hướng dẫn">?</button>

  <!-- Toast stack (thông báo nổi) -->
  <div class="toast-host" id="toastHost" aria-live="polite" aria-relevant="additions"></div>
  <!-- Fallback legacy id (toast JS tạo item trong host) -->
  <div class="toast hidden" id="toast" role="status" aria-hidden="true"></div>

  <!-- Dialog xác nhận / cảnh báo (thay confirm/alert trình duyệt) -->
  <div class="modal-overlay dialog-overlay hidden" id="appDialog" role="dialog" aria-modal="true" aria-labelledby="appDialogTitle">
    <div class="modal-panel dialog-panel">
      <div class="dialog-icon-wrap" id="appDialogIconWrap" aria-hidden="true">
        <span class="dialog-icon" id="appDialogIcon">ℹ️</span>
      </div>
      <h3 class="dialog-title" id="appDialogTitle">Xác nhận</h3>
      <p class="dialog-message" id="appDialogMessage"></p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" id="appDialogCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="appDialogOk">Đồng ý</button>
      </div>
    </div>
  </div>

  <!-- Modal: Thêm học viên -->
`);
})(window.GL = window.GL || {});
