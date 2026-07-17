/**
 * Modal dữ liệu: thêm học viên, xuất/nhập, hệ số, xem trước import/export, chuyển lớp.
 * Tách từ modals.js (1000+ dòng) — thứ tự đăng ký = thứ tự DOM cũ.
 */
(function (GL) {
  "use strict";

  GL.registerTemplate(
    "modals-data",
    String.raw`
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
`
  );
})((window.GL = window.GL || {}));
