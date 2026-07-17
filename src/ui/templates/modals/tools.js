/**
 * Modal công cụ: hướng dẫn, đổi PIN bắt buộc, sao lưu, thiếu điểm, giáo xứ, báo cáo, nhật ký.
 * Tách từ modals.js (1000+ dòng) — thứ tự đăng ký = thứ tự DOM cũ.
 */
(function (GL) {
  "use strict";

  GL.registerTemplate(
    "modals-tools",
    String.raw`
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
`
  );
})((window.GL = window.GL || {}));
