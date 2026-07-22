import { LitElement, html } from 'lit'
import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import type { ClassData } from '../../../services/storage/StorageAdapter.types'
import { resolveClassColumns } from '../../../config/columns.ts'
import {
  readExcelFile,
  parseExcelSheet,
  parseStudentList,
  detectTerm,
  applyImportedRows,
  type ExcelImportResult,
  type StudentListRow,
} from '../../../services/import/excelImport.ts'

type WizardStep = 'file-pick' | 'sheet-pick' | 'create-class-single' | 'create-class-multi' | 'preview' | 'no-match'

const IMPORT_STYLES = html`
  <style>
  .step { margin:12px 0; }
  .table-wrap { overflow:auto; max-height:280px; border:1px solid var(--border,#e2e8f0); border-radius:6px; }
  table { width:100%; border-collapse:collapse; font-size:.78rem; }
  th, td { border:1px solid var(--border,#e2e8f0); padding:4px 6px; text-align:left; white-space:nowrap; }
  th { background:var(--bg-secondary,#f8fafc); position:sticky; top:0; z-index:1; }
  .matched { color:#16a34a; }
  .unmatched { color:#dc2626; }
  .tag { display:inline-block; padding:2px 6px; border-radius:4px; font-size:.7rem; }
  .tag-ok { background:#dcfce7; color:#166534; }
  .tag-warn { background:#fef3c7; color:#92400e; }
  .tag-info { background:#dbeafe; color:#1e40af; }
  .file-drop { border:2px dashed var(--border,#94a3b8); border-radius:8px; padding:24px; text-align:center; cursor:pointer; transition:.2s; }
  .file-drop:hover { border-color:#2563eb; background:var(--bg-secondary,#f8fafc); }
  .file-drop.has-file { border-color:#16a34a; background:#f0fdf4; }
  .hidden { display:none !important; }
  </style>
`

export class GlExcelImport extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    open: { type: Boolean, reflect: true },
    stateManager: { type: Object },
    notification: { type: Object },
    classId: { type: String },
  }

  declare open: boolean
  declare stateManager: StateManager
  declare notification: NotificationManager
  declare classId: string

  private _step: WizardStep = 'file-pick'
  private _sheets: Record<string, any[][]> = {}
  private _currentSheet = ''
  private _selectedFileName = ''
  private _parseResult: ExcelImportResult | null = null
  private _term: 'hk1' | 'hk2' = 'hk1'
  private _termSource: 'sheet' | 'content' | 'default' = 'default'
  private _parsedStudentResult: { rows: StudentListRow[]; validRows: number; detectedClasses: string[] } | null = null
  private _suggestedYear = ''
  private _onComplete: (() => void) | null = null

  constructor() {
    super()
    this.open = false
    this._suggestedYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  }

  private _reset() {
    this._step = 'file-pick'
    this._sheets = {}
    this._currentSheet = ''
    this._selectedFileName = ''
    this._parseResult = null
    this._parsedStudentResult = null
    this._term = 'hk1'
    this._termSource = 'default'
  }

  connectedCallback() {
    super.connectedCallback()
    this._reset()
  }

  private _onClose() {
    this.open = false
    this.dispatchEvent(new CustomEvent('gl-close', { bubbles: true, composed: true }))
  }

  setComplete(cb: (() => void) | null) {
    this._onComplete = cb
  }

  private async _onFilePicked(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files?.length) return
    await this._handleFile(input.files[0])
  }

  private _onFileDrop(e: DragEvent) {
    e.preventDefault()
    const drop = this.querySelector('#fileDrop')
    drop?.classList.remove('has-file')
    if (e.dataTransfer?.files.length) {
      this._handleFile(e.dataTransfer.files[0])
    }
  }

  private _onDragOver(e: DragEvent) {
    e.preventDefault()
    const drop = this.querySelector('#fileDrop')
    drop?.classList.add('has-file')
  }

  private _onDragLeave() {
    const drop = this.querySelector('#fileDrop')
    drop?.classList.remove('has-file')
  }

  private async _handleFile(file: File) {
    if (!file.name.match(/\.xlsx?$/i)) {
      this.notification.show('Chỉ hỗ trợ file .xlsx hoặc .xls', 'error')
      return
    }
    this._selectedFileName = `📎 ${file.name}`
    const { sheets, errors } = await readExcelFile(file)
    if (errors.length) {
      this.notification.show(errors[0], 'error')
      return
    }
    const sheetNames = Object.keys(sheets)
    if (sheetNames.length === 0) {
      this.notification.show('File Excel không có dữ liệu', 'error')
      return
    }
    this._sheets = sheets
    this._hasFile = true
    this.requestUpdate()
  }

  private _hasFile = false

  private _onNextAfterFilePick() {
    if (!this.classId) {
      this._startCreateClassFlow()
    } else {
      this._startSheetPickFlow()
    }
  }

  private _startCreateClassFlow() {
    const sheetNames = Object.keys(this._sheets)
    if (sheetNames.length === 0) { this._step = 'file-pick'; this.requestUpdate(); return }
    this._currentSheet = sheetNames[0]
    this._analyzeStudentList()
  }

  private _analyzeStudentList() {
    const rows = this._sheets[this._currentSheet]
    if (!rows || rows.length < 2) {
      this.notification.show('Sheet không có dữ liệu', 'error')
      return
    }
    const result = parseStudentList(rows)
    if (!result.validRows) {
      this.notification.show(result.errors[0] || 'Không thể đọc dữ liệu học viên từ file', 'error')
      return
    }
    this._parsedStudentResult = result
    if (result.detectedClasses.length > 0) {
      this._step = 'create-class-multi'
    } else {
      this._step = 'create-class-single'
    }
    this.requestUpdate()
  }

  private _startSheetPickFlow() {
    const sheetNames = Object.keys(this._sheets)
    if (sheetNames.length === 0) { this._step = 'file-pick'; this.requestUpdate(); return }
    if (sheetNames.length === 1) {
      this._currentSheet = sheetNames[0]
      this._parseAndPreview()
      return
    }
    this._step = 'sheet-pick'
    this.requestUpdate()
  }

  private _onSheetSelected(e: Event) {
    const selected = (e.target as HTMLInputElement)?.value
    if (selected) {
      this._currentSheet = selected
      this._parseAndPreview()
    }
  }

  private _parseAndPreview() {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return

    const rows = this._sheets[this._currentSheet]
    if (!rows || rows.length < 2) {
      this.notification.show('Sheet không có đủ dữ liệu', 'error')
      return
    }

    let term: 'hk1' | 'hk2' = 'hk1'
    let termSource: 'sheet' | 'content' | 'default' = 'default'

    const sheetTerm = detectTerm(this._currentSheet)
    if (sheetTerm) {
      term = sheetTerm
      termSource = 'sheet'
    } else {
      const contentTerm = this._detectTermFromContent(rows)
      if (contentTerm) {
        term = contentTerm
        termSource = 'content'
      } else {
        const state = this.stateManager.getState()
        term = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
        termSource = 'default'
      }
    }

    if (this._hasExistingTermScores(cls, term)) {
      this.notification.show(
        `Cảnh báo: Lớp này đã có điểm học kỳ ${term === 'hk1' ? 'HK1' : 'HK2'}. Nếu tiếp tục, điểm cũ sẽ bị ghi đè.`,
        'warning'
      )
    }

    const result = parseExcelSheet(this._currentSheet, rows, cls, term)
    if (result.matchedCols.length === 0 && result.validRows === 0) {
      this._parseResult = result
      this._step = 'no-match'
      this.requestUpdate()
      return
    }

    this._parseResult = result
    this._term = term
    this._termSource = termSource
    this._step = 'preview'
    this.requestUpdate()
  }

  private _detectTermFromContent(rows: any[][]): 'hk1' | 'hk2' | null {
    const rowsToCheck = Math.min(5, rows.length)
    for (let i = 0; i < rowsToCheck; i++) {
      const row = rows[i]
      if (!row) continue
      const rowText = row
        .map((cell: any) => String(cell || '').trim())
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      if (rowText.includes('hoc ky 1') || rowText.includes('hoc ky i') || rowText.includes('ky 1') || rowText.includes('ki 1') || rowText.includes('hk1') || rowText.includes('hockey 1')) return 'hk1'
      if (rowText.includes('hoc ky 2') || rowText.includes('hoc ky ii') || rowText.includes('ky 2') || rowText.includes('ki 2') || rowText.includes('hk2') || rowText.includes('hockey 2')) return 'hk2'
    }
    return null
  }

  private _hasExistingTermScores(cls: ClassData, term: 'hk1' | 'hk2'): boolean {
    return cls.students.some(student => {
      const termScores = student.scoresByTerm[term]
      return Object.values(termScores).some(scores => scores && scores.length > 0)
    })
  }

  private _getClassColumnLabels(): string[] {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return []
    return cls.columns?.map(c => c.label) || []
  }

  private async _downloadTemplate() {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return
    const mod = await import('../../../config/columns.ts')
    const cols = cls.columns?.length ? cls.columns : mod.DEFAULT_COLS
    const headers = ['STT', 'Tên thánh', 'Họ đệm', 'Tên', ...cols.map(c => c.label), 'Ghi chú']
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([headers])
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      ...cols.map(() => ({ wch: 8 })),
      { wch: 20 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'HK1')
    const ws2 = XLSX.utils.aoa_to_sheet([headers])
    XLSX.utils.book_append_sheet(wb, ws2, 'HK2')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mau_nhap_diem_${cls.name.replace(/\s+/g, '_')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    this.notification.show('Đã tải mẫu Excel', 'success')
  }

  private _executeImport(overwrite: boolean) {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls || !this._parseResult) return
    const updatedStudents = applyImportedRows(cls, this._parseResult.rows, this._term, { overwrite, append: !overwrite })
    this.stateManager.setClassStudents(this.classId!, updatedStudents)
    this._onClose()
    this.notification.show(
      `✅ Import thành công — ${this._parseResult.validRows} học viên (${this._term === 'hk1' ? 'HK1' : 'HK2'})`,
      'success'
    )
    this._onComplete?.()
  }

  /* ---- render steps ---- */

  private _renderFilePick() {
    return html`
      <div class="step">
        <p class="hint">Chọn file Excel (.xlsx, .xls) có điểm cần import. File cần có dòng header với tên cột khớp với cột điểm của lớp.</p>
        <div class="file-drop ${this._hasFile ? 'has-file' : ''}" id="fileDrop"
          @click=${() => (this.querySelector<HTMLInputElement>('#fileInput')?.click())}
          @dragover=${this._onDragOver}
          @dragleave=${this._onDragLeave}
          @drop=${this._onFileDrop}
        >
          <div style="font-size:2rem" class="mb-2">📄</div>
          <strong>Chọn file Excel</strong>
          <p class="hint mt-1">hoặc kéo thả file vào đây</p>
          ${this._selectedFileName ? html`<p class="hint" id="selectedFileName">${this._selectedFileName}</p>` : ''}
        </div>
        <input type="file" id="fileInput" accept=".xlsx,.xls" class="hidden" @change=${this._onFilePicked} />
      </div>
      <div class="actions" id="fileActions">
        <gl-button variant="primary" ?disabled=${!this._hasFile} @click=${this._onNextAfterFilePick}>Tiếp theo →</gl-button>
      </div>
    `
  }

  private _renderSheetPick() {
    const sheetNames = Object.keys(this._sheets)
    const termDetections = sheetNames.map(name => ({ name, term: detectTerm(name) }))
    return html`
      <div class="step">
        <p class="hint">File Excel có nhiều sheet. Chọn sheet chứa điểm cần import.</p>
        ${termDetections.map((s, i) => html`
          <label class="d-flex items-center gap-2 p-2 cursor-pointer" style="border:1px solid var(--border,#e2e8f0);border-radius:6px;margin-bottom:6px">
            <input type="radio" name="sheetSelect" value=${s.name} ?checked=${i === 0} @change=${this._onSheetSelected} />
            <span>📊 ${s.name}</span>
            ${s.term ? html`<span class="tag tag-info">${s.term === 'hk1' ? 'HK1' : 'HK2'}</span>` : ''}
            <span class="hint">(${this._sheets[s.name].length - 1} dòng)</span>
          </label>
        `)}
      </div>
      <div class="actions">
        <gl-button variant="secondary" @click=${this._backToFilePick}>← Quay lại</gl-button>
        <gl-button variant="primary" @click=${this._onSheetSelectedFromRadio}>Phân tích →</gl-button>
      </div>
    `
  }

  private _backToFilePick() {
    this._step = 'file-pick'
    this.requestUpdate()
  }

  private _onSheetSelectedFromRadio() {
    const selected = this.querySelector<HTMLInputElement>('input[name="sheetSelect"]:checked')
    if (selected) {
      this._currentSheet = selected.value
      this._parseAndPreview()
    }
  }

  private _renderCreateClassSingle() {
    if (!this._parsedStudentResult) return html``
    const result = this._parsedStudentResult
    const sheetName = this._currentSheet
    const suggestedName = sheetName
      .replace(/hk1|hk2|học.?kỳ.?|hoc.?ky.?|điểm|diem|lop|class/i, '')
      .replace(/[-_\s]+/g, ' ')
      .trim() || 'Lớp mới'

    return html`
      <div class="step">
        <p class="hint">File không có cột "Lớp". Sẽ tạo một lớp và đưa tất cả <strong>${result.validRows}</strong> học viên vào lớp này.</p>
        <div class="d-flex flex-col mt-3" style="gap:10px">
          <div>
            <label class="block font-semibold mb-1" style="font-size:.8rem">Tên lớp</label>
            <input type="text" id="newClassName" .value=${suggestedName} placeholder="VD: Lớp Khôi 1"
              class="w-full" style="padding:8px 10px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:.9rem" />
          </div>
          <div>
            <label class="block font-semibold mb-1" style="font-size:.8rem">Năm học</label>
            <input type="text" id="newClassYear" .value=${this._suggestedYear} placeholder="VD: 2026-2027"
              class="w-full" style="padding:8px 10px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:.9rem" />
          </div>
        </div>
        <div class="mt-2">
          <span class="tag tag-info">${result.validRows} học viên</span>
        </div>
      </div>
      <div class="actions">
        <gl-button variant="secondary" @click=${this._backToFilePick}>← Quay lại</gl-button>
        <gl-button variant="success" @click=${this._executeCreateSingleClass}>✅ Tạo lớp & nhập ${result.validRows} học viên</gl-button>
      </div>
    `
  }

  private _executeCreateSingleClass() {
    if (!this._parsedStudentResult) return
    const result = this._parsedStudentResult
    const name = (this.querySelector<HTMLInputElement>('#newClassName')?.value || '').trim()
    const year = (this.querySelector<HTMLInputElement>('#newClassYear')?.value || '').trim()
    if (!name) { this.notification.show('Vui lòng nhập tên lớp', 'warning'); return }
    if (!year) { this.notification.show('Vui lòng nhập năm học', 'warning'); return }

    const students = result.rows.map(row => ({
      tenThanh: row.tenThanh || '',
      hoDem: row.hoDem || '',
      ten: row.ten || '',
      name: '',
      maHV: row.maHV || '',
      ngaySinh: '',
      gioiTinh: '',
      tenPhuHuynh: '',
      sdPhuHuynh: '',
      diaChi: '',
      email: '',
      ghiChu: row.ghiChu || '',
    }))

    this.stateManager.createClassesWithStudents([{ name, year, students }])
    this._onClose()
    this.notification.show(`✅ Đã tạo lớp "${name}" và nhập ${result.validRows} học viên`, 'success')
    this._onComplete?.()
  }

  private _renderCreateClassMulti() {
    if (!this._parsedStudentResult) return html``
    const result = this._parsedStudentResult
    const classInfo = result.detectedClasses.map(cls => {
      const count = result.rows.filter(r => r.lop === cls).length
      return { name: cls, count }
    })

    return html`
      <div class="step">
        <div class="d-flex gap-2 flex-wrap mb-2">
          <span class="tag tag-info">${classInfo.length} lớp</span>
          <span class="tag tag-ok">${result.validRows} học viên</span>
        </div>
        <p class="hint">Phát hiện cột "Lớp" trong file. Hệ thống sẽ tự động tạo các lớp tương ứng và xếp học viên vào đúng lớp.</p>
        <div class="mt-2 d-flex flex-col" style="gap:6px">
          <div>
            <label class="block font-semibold mb-1" style="font-size:.8rem">Năm học</label>
            <input type="text" id="multiClassYear" .value=${this._suggestedYear} placeholder="VD: 2026-2027"
              class="w-full" style="padding:8px 10px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:.9rem" />
          </div>
        </div>
        <div class="y-auto" style="margin-top:10px;max-height:240px;border:1px solid var(--border,#e2e8f0);border-radius:6px">
          ${classInfo.map((c, i) => html`
            <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;${i < classInfo.length - 1 ? 'border-bottom:1px solid var(--border,#e2e8f0)' : ''}">
              <span class="flex-1 font-semibold" style="font-size:.85rem">📚 ${c.name}</span>
              <span class="tag tag-info">${c.count} HV</span>
            </div>
          `)}
        </div>
      </div>
      <div class="actions">
        <gl-button variant="secondary" @click=${this._backToFilePick}>← Quay lại</gl-button>
        <gl-button variant="success" @click=${this._executeCreateMultiClass}>✅ Tạo ${classInfo.length} lớp & nhập ${result.validRows} học viên</gl-button>
      </div>
    `
  }

  private _executeCreateMultiClass() {
    if (!this._parsedStudentResult) return
    const result = this._parsedStudentResult
    const year = (this.querySelector<HTMLInputElement>('#multiClassYear')?.value || '').trim()
    if (!year) { this.notification.show('Vui lòng nhập năm học', 'warning'); return }

    const classesToCreate = result.detectedClasses.map(clsName => {
      const studentsInClass = result.rows.filter(r => r.lop === clsName)
      const students = studentsInClass.map(row => ({
        tenThanh: row.tenThanh || '',
        hoDem: row.hoDem || '',
        ten: row.ten || '',
        name: '',
        maHV: row.maHV || '',
        ngaySinh: '',
        gioiTinh: '',
        tenPhuHuynh: '',
        sdPhuHuynh: '',
        diaChi: '',
        email: '',
        ghiChu: row.ghiChu || '',
      }))
      return { name: clsName, year, students }
    })

    this.stateManager.createClassesWithStudents(classesToCreate)
    this._onClose()
    this.notification.show(`✅ Đã tạo ${classesToCreate.length} lớp với ${result.validRows} học viên`, 'success')
    this._onComplete?.()
  }

  private _renderNoMatch() {
    if (!this._parseResult) return html``
    const result = this._parseResult
    return html`
      <div class="step">
        <div class="text-center p-4">
          <div style="font-size:2.4rem">😕</div>
          <strong>Không khớp cột điểm</strong>
          <p class="hint">Không tìm thấy cột nào trong file Excel khớp với cột điểm của lớp.</p>
          ${result.unmatchedCols.length ? html`<p class="hint mt-2">Cột trong Excel: ${result.unmatchedCols.join(', ')}</p>` : ''}
          <p class="hint">Cột điểm của lớp: ${this._getClassColumnLabels().join(', ')}</p>
        </div>
      </div>
      <div class="actions">
        <gl-button variant="secondary" @click=${this._backToFilePick}>← Chọn file khác</gl-button>
        <gl-button variant="ghost" @click=${this._downloadTemplate}>📥 Tải mẫu Excel</gl-button>
      </div>
    `
  }

  private _renderPreview() {
    if (!this._parseResult) return html``
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return html``
    const classCols = resolveClassColumns(cls)
    const result = this._parseResult
    const previewRows = result.rows.slice(0, 10)
    const headerLabels = ['Tên thánh', 'Họ đệm', 'Tên', ...classCols.filter(c => result.matchedCols.some(m => m.mappedTo === c.key)).map(c => c.label), 'Ghi chú']

    let termSourceText = ''
    let termSourceClass = ''
    if (this._termSource === 'sheet') { termSourceText = '(từ tên sheet)'; termSourceClass = 'tag-info' }
    else if (this._termSource === 'content') { termSourceText = '(từ nội dung file)'; termSourceClass = 'tag-ok' }
    else { termSourceText = '(mặc định)'; termSourceClass = 'tag-warn' }

    const previewBody = previewRows.map(row => {
      const scores = classCols.map(c => {
        const vals = row.scores[c.key]
        return vals?.length ? vals.join(';') : ''
      })
      return html`
        <tr>
          <td>${row.tenThanh}</td>
          <td>${row.hoDem}</td>
          <td>${row.ten}</td>
          ${scores.map(s => html`<td>${s}</td>`)}
          <td>${row.ghiChu || ''}</td>
        </tr>`
    })

    return html`
      <div class="step">
        <div class="d-flex gap-2 flex-wrap mb-2">
          <span class="tag tag-info">Sheet: ${this._currentSheet}</span>
          <span class="tag tag-info">Học kỳ: ${this._term === 'hk1' ? 'HK1' : 'HK2'}</span>
          <span class="tag ${termSourceClass}">${termSourceText}</span>
          <span class="tag ${result.validRows > 0 ? 'tag-ok' : 'tag-warn'}">${result.validRows}/${result.totalRows} dòng hợp lệ</span>
          <span class="tag tag-info">${result.matchedCols.length} cột khớp</span>
          ${result.unmatchedCols.length ? html`<span class="tag tag-warn">${result.unmatchedCols.length} cột không khớp</span>` : ''}
        </div>
        ${result.unmatchedCols.length ? html`<p class="hint text-danger">⚠️ Cột không khớp: ${result.unmatchedCols.join(', ')}</p>` : ''}
        <div class="table-wrap">
          <table>
            <thead><tr>${headerLabels.map(h => html`<th>${h}</th>`)}</tr></thead>
            <tbody>
              ${previewBody}
              ${result.rows.length > 10 ? html`<tr><td colspan=${headerLabels.length} class="text-center text-muted">... và ${result.rows.length - 10} dòng nữa</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
      <div class="actions" id="previewActions">
        <gl-button variant="secondary" @click=${this._backToSheetPick}>← Quay lại</gl-button>
        ${this._termSource === 'default' ? html`
          <div class="my-2 p-2 bg-warning-soft rounded-sm" style="border: 1px solid #ffeaa7;">
            <strong>⚠️ Không thể tự động xác định học kỳ từ file</strong>
            <div style="margin-top: 6px;">
              <label class="d-flex items-center" style="gap:6px;font-size:.85rem;color:var(--text,#111)">
                <input type="radio" name="termSelect" value="hk1" ?checked=${this._term === 'hk1'} @change=${() => { this._term = 'hk1'; this.requestUpdate() }} />
                Học kỳ 1 (HK1)
              </label>
              <label class="d-flex items-center" style="gap:6px;font-size:.85rem;color:var(--text,#111)">
                <input type="radio" name="termSelect" value="hk2" ?checked=${this._term === 'hk2'} @change=${() => { this._term = 'hk2'; this.requestUpdate() }} />
                Học kỳ 2 (HK2)
              </label>
            </div>
          </div>
        ` : ''}
        <label class="d-flex items-center" style="gap:6px;font-size:.85rem;color:var(--text,#111)">
          <input type="checkbox" id="chkOverwrite" /> Ghi đè điểm cũ
        </label>
        <gl-button variant="success" @click=${() => this._executeImport((this.querySelector<HTMLInputElement>('#chkOverwrite')?.checked || false))}>✅ Import ${result.validRows} dòng</gl-button>
      </div>
    `
  }

  private _backToSheetPick() {
    const sheetNames = Object.keys(this._sheets)
    if (sheetNames.length > 1) {
      this._step = 'sheet-pick'
    } else {
      this._step = 'file-pick'
    }
    this.requestUpdate()
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      this._reset()
    }
  }

  render() {
    return html`
      <gl-modal
        heading="📥 Import từ Excel"
        size="md"
        ?open=${this.open}
        @gl-close=${this._onClose}
      >
        ${IMPORT_STYLES}
        <div id="modalBody">
          ${this._step === 'file-pick' ? this._renderFilePick() : ''}
          ${this._step === 'sheet-pick' ? this._renderSheetPick() : ''}
          ${this._step === 'create-class-single' ? this._renderCreateClassSingle() : ''}
          ${this._step === 'create-class-multi' ? this._renderCreateClassMulti() : ''}
          ${this._step === 'no-match' ? this._renderNoMatch() : ''}
          ${this._step === 'preview' ? this._renderPreview() : ''}
        </div>
      </gl-modal>
    `
  }
}

customElements.define('gl-excel-import', GlExcelImport)

declare global {
  interface HTMLElementTagNameMap {
    'gl-excel-import': GlExcelImport
  }
}
