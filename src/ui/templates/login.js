/**
 * login DOM template.
 * Generated from the former monolithic index.html so the app can stay offline/file:// friendly.
 */
(function (GL) {
  "use strict";

  GL.registerTemplate("login", String.raw`
<!-- Login gate -->
<div id="loginScreen" class="login-screen">
  <div class="login-card">
    <div class="login-brand">✝</div>
    <h1>Sổ Điểm Giáo Lý</h1>
    <p class="login-sub">Đăng nhập để tiếp tục</p>
    <form id="loginForm" autocomplete="on">
      <label class="field-label" for="loginUser">Tài khoản</label>
      <input id="loginUser" type="text" placeholder="admin" required />
      <label class="field-label" for="loginPin" style="margin-top:10px">PIN</label>
      <input id="loginPin" type="password" placeholder="••••" required />
      <label class="check-all" style="margin-top:12px">
        <input type="checkbox" id="loginRemember" checked /> Ghi nhớ trên máy này
      </label>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:14px">Đăng nhập</button>
    </form>
    <div class="login-bio-wrap" id="loginBioWrap">
      <div class="login-divider"><span>hoặc</span></div>
      <button type="button" class="btn btn-bio btn-block" id="loginBioBtn">
        <span class="btn-bio-ico" aria-hidden="true">🔐</span>
        <span id="loginBioLabel">Mở bằng Face ID / vân tay</span>
      </button>
      <p class="hint login-bio-hint" id="loginBioHint" style="margin-top:8px;text-align:center">
        Lần đầu: đăng nhập PIN → bật sinh trắc trong sidebar.
      </p>
    </div>
    <p class="hint" style="margin-top:14px;text-align:center">
      Mặc định: <strong>admin</strong> / PIN <strong>1234</strong><br>
      (Ban Giáo lý — vào app bấm <strong>Đổi PIN</strong> ngay)
    </p>
    <p id="loginError" class="login-error hidden"></p>
  </div>
</div>
`);
})(window.GL = window.GL || {});
