/**
 * modals DOM template.
 * Generated from the former monolithic index.html so the app can stay offline/file:// friendly.
 */
(function (GL) {
  "use strict";

  GL.registerTemplate("modals", String.raw`
<div class="modal-overlay hidden" id="addStudentModal" role="dialog" aria-modal="true" aria-labelledby="addStudentModalTitle">
    <div class="modal-panel modal-panel-md">
      <div class="modal-head">
        <div>
          <h3 id="addStudentModalTitle">Thêm học viên</h3>
          <p class="modal-sub">Nhập họ tên · có thể bổ sung thông tin thêm</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="addStudentModalClose" title="Đóng" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <form id="addForm" class="add-name-form" autocomplete="off">
          <div class="name-fields">
            <div>
              <label class="field-label" for="inputTenThanh">Tên thánh</label>
              <input id="inputTenThanh" type="text" placeholder="VD: Anna" />
            </div>
            <div>
              <label class="field-label" for="inputHoDem">Họ và tên đệm</label>
              <input id="inputHoDem" type="text" placeholder="VD: Nguyễn Ngọc Kim" />
            </div>
            <div>
              <label class="field-label" for="inputTen">Tên</label>
              <input id="inputTen" type="text" placeholder="VD: Anh" required />
            </div>
          </div>
          <details class="add-info-details">
            <summary>➕ Thông tin thêm (mã HV, ngày sinh, SĐT…)</summary>
            <div class="add-info-grid" id="addInfoGrid">
              <!-- filled by JS -->
            </div>
          </details>
          <p class="hint" style="margin-top:4px">
            Ví dụ: <strong>Anna</strong> · <strong>Nguyễn Ngọc Kim</strong> · <strong>Anh</strong>
          </p>
          <div class="add-form-actions">
            <button type="button" class="btn btn-ghost" id="addStudentModalCancel">Đóng</button>
            <button type="submit" class="btn btn-primary">+ Thêm học viên</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal: Xuất / Nhập (chức năng toàn app — không phụ thuộc bảng điểm lớp đang mở) -->
  <div class="modal-overlay hidden" id="ioModal" role="dialog" aria-modal="true" aria-labelledby="ioModalTitle">
    <div class="modal-panel modal-panel-md">
      <div class="modal-head">
        <div>
          <h3 id="ioModalTitle">Xuất / Nhập dữ liệu</h3>
          <p class="modal-sub">Công cụ riêng · Excel · CSV · Word · xem trước trước khi ghi</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="ioModalClose" title="Đóng" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <p class="hint io-role-hint" id="ioRoleHint" style="margin:0 0 12px"></p>
        <div class="io-grid">
          <div class="io-box" id="ioImportBox">
            <h4>📥 Nhập file điểm <span class="chip-badge" style="font-size:0.7rem">Admin</span></h4>
            <p class="hint" style="margin-top:0;margin-bottom:10px">
              Chỉ Ban Giáo lý. File có cột <em>Lớp</em> → lọc / tạo lớp mới khi xác nhận.
            </p>
            <div class="dropzone" id="dropzone" tabindex="0" role="button">
              <strong>Kéo thả file vào đây</strong>
              hoặc bấm chọn · Excel / CSV / Word
            </div>
            <input type="file" id="importFile" class="hidden"
              accept=".xlsx,.xls,.csv,.docx" />
            <div class="file-name" id="importFileName"></div>
            <div class="io-actions" style="margin-top:8px">
              <select id="importTerm" title="Nhập vào học kỳ nào">
                <option value="hk1">Nhập vào Học kỳ 1</option>
                <option value="hk2">Nhập vào Học kỳ 2</option>
              </select>
              <select id="importMode">
                <option value="merge">Gộp theo tên</option>
                <option value="append">Thêm mới</option>
                <option value="replace">Thay thế lớp đích</option>
              </select>
              <button type="button" class="btn btn-ghost" id="templateBtn">Tải mẫu Excel</button>
            </div>
            <p class="hint">
              Cột tên: Tên thánh · Họ đệm · Tên. Khi xem trước có thể chọn filter lớp và
              <strong>tạo lớp mới</strong> nếu lớp trong file chưa có.
            </p>
          </div>
          <div class="io-box" id="ioExportBox">
            <h4>📤 Xuất điểm theo lớp</h4>
            <label class="field-label" for="ioExportClass">Chọn 1 lớp</label>
            <select id="ioExportClass" class="io-class-select" title="Lớp xuất điểm">
              <option value="">— Chọn lớp —</option>
            </select>
            <p class="hint" style="margin-top:8px;margin-bottom:12px">
              Excel 1 lớp: xem trước sheet HK1 / HK2 / Cả năm. GLV chỉ xuất lớp được gán.
            </p>
            <div class="io-actions">
              <button type="button" class="btn btn-success" id="exportXlsxBtn">Xuất Excel</button>
              <button type="button" class="btn btn-ghost" id="exportCsvBtn">Xuất CSV</button>
            </div>
            <div id="ioMultiExportBox">
              <hr class="io-divider" />
              <h4 style="margin-top:4px">📦 Xuất nhiều lớp (1 file) <span class="chip-badge" style="font-size:0.7rem">Admin</span></h4>
              <p class="hint" style="margin-top:0;margin-bottom:8px">
                Chỉ Ban GL · mọi lớp trong <strong>năm học đang lọc</strong> → mỗi lớp 1 sheet + sheet tổng hợp.
              </p>
              <div class="io-actions">
                <select id="ioMultiExportTerm" title="Kỳ xuất">
                  <option value="hk1">HK1</option>
                  <option value="hk2">HK2</option>
                  <option value="year">Cả năm</option>
                </select>
                <button type="button" class="btn btn-primary" id="exportMultiClassBtn">Xuất tất cả lớp</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="ioModalDone">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal: Hệ số -->
  <div class="modal-overlay hidden" id="weightsModal" role="dialog" aria-modal="true" aria-labelledby="weightsModalTitle">
    <div class="modal-panel modal-panel-sm">
      <div class="modal-head">
        <div>
          <h3 id="weightsModalTitle">Hệ số cột điểm</h3>
          <p class="modal-sub">Áp dụng cho lớp đang chọn · Khảo kinh mặc định ×1</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="weightsModalClose" title="Đóng" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <div class="weights" id="weights"></div>
        <div class="formula" id="formulaHint"></div>
        <p class="hint">
          Cột trống không tính vào TB. Nhiều lần điểm → trung bình cột rồi × hệ số.
        </p>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-primary" id="weightsModalDone">Xong</button>
      </div>
    </div>
  </div>

  <!-- Modal: xem trước import -->
  <div class="modal-overlay hidden" id="importPreviewModal" role="dialog" aria-modal="true" aria-labelledby="importPreviewTitle">
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3 id="importPreviewTitle">Xem trước dữ liệu nhập</h3>
          <p class="modal-sub" id="importPreviewSub">Kiểm tra trước khi ghi vào lớp</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="importPreviewClose" title="Đóng" aria-label="Đóng">×</button>
      </div>

      <div class="modal-meta" id="importPreviewMeta"></div>

      <div class="modal-toolbar">
        <label class="check-all">
          <input type="checkbox" id="importSelectAll" checked />
          Chọn tất cả (đang hiện)
        </label>
        <div class="modal-mode">
          <label for="importPreviewTerm">Nhập vào</label>
          <select id="importPreviewTerm">
            <option value="hk1">Học kỳ 1</option>
            <option value="hk2">Học kỳ 2</option>
          </select>
        </div>
        <div class="modal-mode">
          <label for="importPreviewMode">Cách nhập</label>
          <select id="importPreviewMode">
            <option value="merge">Gộp theo tên (cập nhật nếu trùng)</option>
            <option value="append">Thêm mới (không ghi đè)</option>
            <option value="replace">Thay thế toàn bộ lớp</option>
          </select>
        </div>
      </div>

      <div class="import-filters" id="importFilters">
        <div class="filter-field">
          <label for="importFilterLop">Lọc theo lớp trong file</label>
          <select id="importFilterLop">
            <option value="">Tất cả lớp</option>
          </select>
        </div>
        <div class="filter-field filter-grow">
          <label for="importFilterName">Lọc theo tên</label>
          <input type="text" id="importFilterName" placeholder="Gõ tên thánh / họ / tên..." />
        </div>
        <div class="filter-actions">
          <button type="button" class="btn btn-ghost" id="importFilterSelectVisible" title="Chỉ tick các dòng đang hiện">
            Chỉ chọn dòng lọc
          </button>
          <button type="button" class="btn btn-primary hidden" id="importCreateClassBtn" title="Tạo lớp mới theo tên filter">
            ＋ Tạo lớp từ filter
          </button>
        </div>
      </div>
      <p class="hint import-filter-hint" id="importFilterHint" style="margin:0 18px 4px">
        <strong>Tất cả lớp</strong> = tự xếp HV vào đúng lớp theo cột Lớp (chưa có thì tự tạo).
        Chọn một lớp = chỉ nhập HV lớp đó.
      </p>
      <p class="hint" id="importClassStatus" style="margin:0 18px 8px;min-height:1.2em"></p>

      <div class="import-summary" id="importPreviewSummary"></div>

      <div class="modal-table-wrap">
        <table class="import-preview-table" id="importPreviewTable">
          <thead id="importPreviewThead"></thead>
          <tbody id="importPreviewTbody"></tbody>
        </table>
      </div>

      <p class="hint" id="importPreviewHint" style="margin-top:10px">
        Bỏ chọn dòng không muốn nhập. Chỉ dữ liệu đã chọn mới vào hệ thống.
      </p>

      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="importPreviewCancel">Hủy</button>
        <button type="button" class="btn btn-success" id="importPreviewConfirm">✓ Xác nhận nhập vào lớp</button>
      </div>
    </div>
  </div>

  <!-- Modal: xem trước xuất Excel -->
  <div class="modal-overlay hidden" id="exportPreviewModal" role="dialog" aria-modal="true" aria-labelledby="exportPreviewTitle">
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3 id="exportPreviewTitle">Xem trước file Excel xuất</h3>
          <p class="modal-sub" id="exportPreviewSub">Chọn loại xuất · kiểm tra · xác nhận tải</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="exportPreviewClose" title="Đóng" aria-label="Đóng">×</button>
      </div>

      <div class="modal-meta" id="exportPreviewMeta"></div>

      <div class="export-mode-list" id="exportModeList" role="radiogroup" aria-label="Loại xuất Excel">
        <label class="export-mode-opt">
          <input type="radio" name="exportMode" value="hk1" checked />
          <span class="export-mode-body">
            <strong>Xuất điểm Học kỳ 1</strong>
            <small>Chỉ bảng điểm HK1</small>
          </span>
        </label>
        <label class="export-mode-opt">
          <input type="radio" name="exportMode" value="hk2" />
          <span class="export-mode-body">
            <strong>Xuất điểm Học kỳ 2</strong>
            <small>Chỉ bảng điểm HK2</small>
          </span>
        </label>
        <label class="export-mode-opt">
          <input type="radio" name="exportMode" value="year" />
          <span class="export-mode-body">
            <strong>Xuất điểm cả năm</strong>
            <small>HK1 + HK2 + tổng kết cả năm</small>
          </span>
        </label>
        <label class="export-mode-opt">
          <input type="radio" name="exportMode" value="full" />
          <span class="export-mode-body">
            <strong>Xuất đầy đủ</strong>
            <small>Tất cả sheet + thông tin học viên</small>
          </span>
        </label>
      </div>
      <p class="hint" id="exportModeDesc" style="margin:6px 18px 0"></p>

      <div class="export-sheet-tabs" id="exportSheetTabs" role="tablist" aria-label="Sheet Excel"></div>
      <p class="hint" style="margin:8px 18px 0">
        Bỏ tick sheet không muốn xuất · Bấm tab để xem nội dung từng sheet.
      </p>
      <div class="export-sheet-meta" id="exportPreviewSheetMeta"></div>

      <div class="modal-table-wrap export-preview-wrap">
        <table class="import-preview-table" id="exportPreviewTable">
          <thead id="exportPreviewThead"></thead>
          <tbody id="exportPreviewTbody"></tbody>
        </table>
      </div>

      <div class="export-filename-row">
        <label for="exportFilename">Tên file</label>
        <input type="text" id="exportFilename" spellcheck="false" />
      </div>

      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="exportPreviewCancel">Hủy</button>
        <button type="button" class="btn btn-success" id="exportPreviewConfirm">✓ Xác nhận xuất Excel</button>
      </div>
    </div>
  </div>

  <!-- Modal: Chuyển HV sang lớp khác -->
  <div class="modal-overlay hidden" id="transferModal" role="dialog" aria-modal="true" aria-labelledby="transferTitle">
    <div class="modal-panel modal-panel-sm">
      <div class="modal-head">
        <div>
          <h3 id="transferTitle">⇄ Chuyển lớp</h3>
          <p class="modal-sub" id="transferSub">Giữ nguyên điểm &amp; nhật ký</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="transferClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="transferStudentId" />
        <input type="hidden" id="transferFromClassId" />
        <p class="hint" style="margin-top:0">Học viên: <strong id="transferStudentName">—</strong></p>
        <p class="hint">Từ lớp: <strong id="transferFromName">—</strong></p>
        <label class="field-label" for="transferToClass">Sang lớp</label>
        <select id="transferToClass" class="io-class-select"></select>
        <p class="hint" style="margin-top:10px">Chỉ hiện lớp bạn được xem. Trùng tên ở lớp đích sẽ bị chặn.</p>
        <p class="login-error hidden" id="transferError" style="margin-top:8px"></p>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="transferCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="transferConfirm">Chuyển lớp</button>
      </div>
    </div>
  </div>

  <!-- Modal: Hướng dẫn GLV / dùng app -->
  <div class="modal-overlay hidden" id="helpModal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
    <div class="modal-panel modal-panel-md">
      <div class="modal-head">
        <div>
          <h3 id="helpTitle">❓ Hướng dẫn nhanh</h3>
          <p class="modal-sub">5 phút bắt đầu · Sổ Điểm Giáo Lý</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="helpClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body help-body" id="helpBody">
        <div class="help-section">
          <h4>1. Đăng nhập &amp; PIN</h4>
          <ul>
            <li>Đăng nhập bằng tài khoản Ban GL cấp.</li>
            <li>Sidebar → <strong>Đổi PIN</strong> (bắt buộc nếu còn 1234).</li>
            <li>Ghi nhớ PIN mới — không dùng PIN dễ đoán.</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>2. Chọn lớp &amp; học kỳ</h4>
          <ul>
            <li>Cột trái → mở <strong>Các lớp</strong> → bấm lớp cần nhập.</li>
            <li>Chọn <strong>HK1 / HK2 / Cả năm</strong> trên thanh kỳ.</li>
            <li>Năm học (ô lọc) giúp không lẫn dữ liệu năm cũ.</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>3. Nhập điểm</h4>
          <ul>
            <li>Tab <strong>✏️ Nhập điểm</strong>: thêm điểm từng cột (+).</li>
            <li>Tab <strong>📊 Bảng tổng hợp</strong>: gõ điểm vào ô, Enter để lưu.</li>
            <li><strong>Ctrl+Z</strong> hoàn tác · <strong>Ctrl+Y</strong> làm lại.</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>4. Theo dõi (thiếu điểm + nhật ký)</h4>
          <ul>
            <li>Tab <strong>📋 Theo dõi</strong>: ai thiếu điểm, ghi chú học bài / thái độ / can thiệp.</li>
            <li><em>Không</em> điểm danh vắng–trễ (dùng app chuyên cần riêng).</li>
            <li>Nút <strong>⇄</strong> trên thẻ HV: chuyển sang lớp khác (giữ điểm).</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>5. Xuất điểm</h4>
          <ul>
            <li>Công cụ → <strong>Xuất điểm</strong>: chọn lớp → Xuất Excel/CSV.</li>
            <li>GLV <strong>không</strong> nhập file — chỉ Ban GL được nhập / xuất nhiều lớp.</li>
          </ul>
        </div>
        <div class="help-section help-admin">
          <h4>6. Chỉ Ban Giáo lý (admin)</h4>
          <ul>
            <li><strong>Sao lưu</strong>: gắn thư mục <code>backups</code> một lần, sau đó tự lưu file JSON (nhắc mỗi 7 ngày).</li>
            <li>Xuất/Nhập, xuất nhiều lớp, tài khoản GLV, hệ số, lịch sử, <strong>Mời họp PH</strong> (gồm mẫu in).</li>
            <li>Tổng quan năm học: TB, thiếu điểm, cần quan tâm.</li>
          </ul>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-primary" id="helpDone">Đã hiểu</button>
      </div>
    </div>
  </div>

  <!-- Modal: Bắt buộc đổi PIN yếu / mặc định -->
  <div class="modal-overlay hidden" id="forcePinModal" role="dialog" aria-modal="true" aria-labelledby="forcePinTitle">
    <div class="modal-panel modal-panel-sm dialog-panel">
      <div class="modal-head">
        <div>
          <h3 id="forcePinTitle">🔒 Đổi PIN bảo mật</h3>
          <p class="modal-sub">Tài khoản đang dùng PIN yếu (vd. 1234) — bắt buộc đổi trước khi dùng app</p>
        </div>
      </div>
      <div class="modal-body">
        <p class="app-notice-warn" id="forcePinUser" style="margin-top:0"></p>
        <label class="field-label" for="forcePinOld">1. PIN hiện tại (vd. 1234)</label>
        <input id="forcePinOld" type="password" name="gl-force-pin-old" autocomplete="off" inputmode="numeric" placeholder="PIN đang dùng" />
        <label class="field-label" for="forcePinNew" style="margin-top:10px">2. PIN mới (≥ 4 ký tự, không dùng 1234)</label>
        <input id="forcePinNew" type="password" name="gl-force-pin-new" autocomplete="off" inputmode="numeric" />
        <label class="field-label" for="forcePinNew2" style="margin-top:10px">3. Nhập lại PIN mới</label>
        <input id="forcePinNew2" type="password" name="gl-force-pin-new2" autocomplete="off" inputmode="numeric" />
        <p class="login-error hidden" id="forcePinError" style="margin-top:10px"></p>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-primary btn-block" id="forcePinSave">Lưu PIN mới &amp; tiếp tục</button>
      </div>
    </div>
  </div>

  <!-- Modal: Sao lưu / khôi phục -->
  <div class="modal-overlay hidden" id="backupModal" role="dialog" aria-modal="true">
    <div class="modal-panel modal-panel-sm">
      <div class="modal-head">
        <div>
          <h3>Sao lưu &amp; khôi phục</h3>
          <p class="modal-sub" id="backupModalSub">File JSON trên máy bạn · nên backup định kỳ</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="backupModalClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <p class="hint" id="backupModalStatus" style="margin:0 0 12px"></p>
        <div class="io-box" style="margin-bottom:12px">
          <h4>📁 Thư mục sao lưu</h4>
          <p class="hint" style="margin-top:0">
            Tạo sẵn thư mục <code>tinh-diem/backups</code> trong project. Chọn thư mục đó một lần (Chrome/Edge) — lần sau tự ghi file vào đó.
          </p>
          <div id="backupFolderStatus" class="hint" style="margin:8px 0"></div>
        </div>
        <div class="io-box" style="margin-bottom:12px">
          <h4>💾 Sao lưu</h4>
          <p class="hint" style="margin-top:0">Xuất toàn bộ lớp, điểm, tài khoản, mẫu in vào thư mục đã gắn (hoặc Tải xuống nếu chưa gắn).</p>
          <button type="button" class="btn btn-success" id="backupExportBtn">Sao lưu ngay</button>
        </div>
        <div class="io-box">
          <h4>♻️ Khôi phục</h4>
          <p class="hint" style="margin-top:0">Chọn file backup đã tải trước đó.</p>
          <select id="backupRestoreMode" style="margin-bottom:8px;width:100%">
            <option value="replace">Thay thế toàn bộ dữ liệu hiện tại</option>
            <option value="merge">Gộp vào dữ liệu hiện tại</option>
          </select>
          <input type="file" id="backupImportFile" accept=".json,application/json" class="hidden" />
          <button type="button" class="btn btn-primary" id="backupImportBtn">Chọn file &amp; khôi phục</button>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="backupModalDone">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal: Nhắc thiếu điểm -->
  <div class="modal-overlay hidden" id="missingModal" role="dialog" aria-modal="true" aria-labelledby="missingModalTitle">
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3 id="missingModalTitle">⚠️ Nhắc thiếu điểm</h3>
          <p class="modal-sub" id="missingMeta">HV còn thiếu cột điểm</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="missingModalClose" aria-label="Đóng">×</button>
      </div>
      <div class="parish-toolbar" style="border-bottom:1px solid var(--border)">
        <div class="filter-field">
          <label for="missingTerm">Kỳ</label>
          <select id="missingTerm">
            <option value="hk1">Học kỳ 1</option>
            <option value="hk2">Học kỳ 2</option>
            <option value="year">Cả năm</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="missingColFilter">Cột điểm</label>
          <select id="missingColFilter">
            <option value="">Tất cả cột</option>
          </select>
        </div>
        <div class="filter-actions">
          <button type="button" class="btn btn-ghost" id="missingRefreshBtn">Làm mới</button>
        </div>
      </div>
      <div class="modal-body" id="missingBody"></div>
      <div class="modal-foot">
        <p class="hint" style="margin:0;flex:1;text-align:left">Bấm dòng để mở lớp. Theo năm học đang lọc ở sidebar.</p>
        <button type="button" class="btn btn-ghost" id="missingModalDone">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal: Tổng hợp toàn giáo xứ -->
  <div class="modal-overlay hidden" id="parishModal" role="dialog" aria-modal="true" aria-labelledby="parishModalTitle">
    <div class="modal-panel modal-panel-wide">
      <div class="modal-head">
        <div>
          <h3 id="parishModalTitle">Tổng hợp toàn giáo xứ</h3>
          <p class="modal-sub" id="parishModalSub">Tất cả lớp · tất cả học viên</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="parishModalClose" title="Đóng" aria-label="Đóng">×</button>
      </div>

      <div class="parish-toolbar">
        <div class="filter-field">
          <label for="parishTerm">Kỳ điểm</label>
          <select id="parishTerm">
            <option value="hk1">Học kỳ 1</option>
            <option value="hk2">Học kỳ 2</option>
            <option value="year">Cả năm</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="parishFilterClass">Lớp</label>
          <select id="parishFilterClass">
            <option value="">Tất cả lớp</option>
          </select>
        </div>
        <div class="filter-field filter-grow">
          <label for="parishFilterName">Tìm HV / lớp</label>
          <input type="text" id="parishFilterName" placeholder="Tên thánh, họ tên, mã HV…" />
        </div>
        <div class="filter-field">
          <label for="parishFilterRank">Lọc xếp loại</label>
          <select id="parishFilterRank">
            <option value="">Tất cả</option>
            <option value="good">Giỏi trở lên (≥8)</option>
            <option value="xs">Xuất sắc (≥9)</option>
            <option value="g">Giỏi (8–9)</option>
            <option value="k">Khá</option>
            <option value="tb">Trung bình</option>
            <option value="y">Yếu (&lt;5)</option>
            <option value="missing">Thiếu điểm</option>
            <option value="none">Chưa đủ điểm</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="parishSort">Sắp xếp</label>
          <select id="parishSort">
            <option value="class">Theo lớp</option>
            <option value="name">Theo tên</option>
            <option value="tb_desc">TB cao → thấp</option>
            <option value="tb_asc">TB thấp → cao</option>
          </select>
        </div>
        <div class="filter-actions parish-toolbar-actions">
          <button type="button" class="btn btn-ghost" id="parishRefreshBtn">Làm mới</button>
          <button type="button" class="btn btn-success" id="parishExportBtn">Xuất Excel</button>
        </div>
      </div>

      <div class="import-summary parish-summary" id="parishSummary"></div>

      <div class="parish-tabs" role="tablist">
        <button type="button" class="view-btn active" id="parishTabStudents" data-parish-tab="students">👥 Tất cả học viên</button>
        <button type="button" class="view-btn" id="parishTabClasses" data-parish-tab="classes">📚 Theo lớp</button>
      </div>

      <div id="parishPaneStudents" class="parish-pane">
        <p class="hint" id="parishStudentMeta" style="margin:0 18px 6px">—</p>
        <div class="modal-table-wrap parish-table-wrap">
          <table class="import-preview-table parish-table" id="parishStudentTable">
            <thead>
              <tr>
                <th style="width:40px">STT</th>
                <th>Lớp</th>
                <th>Tên thánh</th>
                <th>Họ đệm</th>
                <th>Tên</th>
                <th>TB HK1</th>
                <th>TB HK2</th>
                <th>TB kỳ</th>
                <th>Xếp loại</th>
              </tr>
            </thead>
            <tbody id="parishStudentTbody"></tbody>
          </table>
        </div>
      </div>

      <div id="parishPaneClasses" class="parish-pane hidden">
        <div class="modal-table-wrap parish-table-wrap">
          <table class="import-preview-table parish-table" id="parishClassTable">
            <thead>
              <tr>
                <th style="width:40px">STT</th>
                <th>Lớp</th>
                <th>Số HV</th>
                <th>Có TB</th>
                <th>TB lớp</th>
                <th>Giỏi+</th>
                <th>Yếu / Thiếu</th>
              </tr>
            </thead>
            <tbody id="parishClassTbody"></tbody>
          </table>
        </div>
      </div>

      <div class="modal-foot">
        <p class="hint" style="margin:0;flex:1;text-align:left">
          Bấm một dòng để <strong>mở lớp</strong> tương ứng. Ban GL xem mọi lớp · GLV chỉ lớp được gán.
        </p>
        <button type="button" class="btn btn-ghost" id="parishModalDone">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal: Báo cáo nhanh -->
  <div class="modal-overlay hidden" id="reportsModal" role="dialog" aria-modal="true">
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3>Báo cáo nhanh</h3>
          <p class="modal-sub">Top · yếu · thiếu điểm · tiến bộ</p>
        </div>
        <button type="button" class="icon-btn modal-close" id="reportsModalClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-toolbar" style="padding-top:10px">
        <div class="modal-mode">
          <label for="reportTerm">Theo</label>
          <select id="reportTerm">
            <option value="hk1">Học kỳ 1</option>
            <option value="hk2">Học kỳ 2</option>
            <option value="year">Cả năm</option>
          </select>
        </div>
        <button type="button" class="btn btn-ghost" id="reportRefreshBtn">Làm mới</button>
        <button type="button" class="btn btn-primary" id="reportPrintBtn">🖨️ In báo cáo</button>
      </div>
      <div class="modal-body" id="reportBody"></div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="reportsModalDone">Đóng</button>
      </div>
    </div>
  </div>


  <!-- Modal: Thêm nhật ký theo dõi học tập -->
  <div class="modal-overlay hidden" id="journalLogModal" role="dialog" aria-modal="true" aria-labelledby="journalLogTitle">
    <div class="modal-panel modal-panel-sm">
      <div class="modal-head">
        <div>
          <h3 id="journalLogTitle">📋 Ghi chú theo dõi</h3>
          <p class="modal-sub">HV: <strong id="journalStudentName">—</strong></p>
        </div>
        <button type="button" class="icon-btn modal-close" id="journalLogClose" aria-label="Đóng">×</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="journalSid" />
        <label class="field-label" for="journalDate">Ngày</label>
        <input id="journalDate" type="date" />
        <label class="field-label" for="journalType" style="margin-top:10px">Loại</label>
        <select id="journalType"></select>
        <label class="field-label" for="journalLevel" style="margin-top:10px">Mức độ</label>
        <select id="journalLevel"></select>
        <label class="field-label" for="journalText" style="margin-top:10px">Nội dung</label>
        <textarea id="journalText" class="note-input" rows="3" placeholder="VD: Chưa thuộc bài khảo kinh; đã nhắc…"></textarea>
        <p class="hint" style="margin-top:8px">Không ghi điểm danh (vắng/trễ) — dùng app chuyên cần. Ở đây: học bài, thái độ, tiến bộ, can thiệp.</p>
        <p class="login-error hidden" id="journalError" style="margin-top:8px"></p>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" id="journalLogCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="journalLogSave">Lưu ghi chú</button>
      </div>
    </div>
  </div>

  <!-- Modal: Đồng bộ Supabase -->
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
`);
})(window.GL = window.GL || {});
