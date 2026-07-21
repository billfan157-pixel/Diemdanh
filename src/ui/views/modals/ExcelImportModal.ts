// ============================================================
// Sổ Điểm GL — Import Excel Modal
// Step-by-step: pick sheet → map columns → preview → import
// ============================================================

import type { ClassData } from '../../../services/storage/StorageAdapter.types'
import { StateManager } from '../../StateManager'
import { NotificationManager } from '../../../services/NotificationManager'
import {
  readExcelFile,
  parseExcelSheet,
  parseStudentList,
  detectTerm,
  type ExcelImportResult,
  type StudentListRow,
} from '../../../services/import/excelImport.ts'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

const STYLES = `
<style>
.modal-overlay { display:flex; position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); align-items:center; justify-content:center; }
.modal-overlay.hidden { display:none; }
.modal-panel { background:var(--surface,#fff); color:var(--text,#111); border-radius:12px; max-width:640px; width:92vw; max-height:85vh; overflow:auto; padding:20px; box-shadow:0 12px 40px rgba(0,0,0,.25); }
.modal-panel h2 { margin:0 0 8px; font-size:1.1rem; }
.modal-close { float:right; background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--text,#111); padding:0; }
.step { margin:12px 0; }
.btn { display:inline-flex; align-items:center; gap:4px; padding:8px 14px; border-radius:6px; border:1px solid transparent; cursor:pointer; font-size:.85rem; }
.btn-primary { background:#2563eb; color:#fff; }
.btn-primary:hover { background:#1d4ed8; }
.btn-secondary { background:var(--bg-secondary,#f1f5f9); color:var(--text,#111); }
.btn-success { background:#16a34a; color:#fff; }
.btn-danger { background:#dc2626; color:#fff; }
.btn:disabled { opacity:.5; cursor:default; }
.table-wrap { overflow:auto; max-height:280px; border:1px solid var(--border,#e2e8f0); border-radius:6px; }
table { width:100%; border-collapse:collapse; font-size:.78rem; }
th, td { border:1px solid var(--border,#e2e8f0); padding:4px 6px; text-align:left; white-space:nowrap; }
th { background:var(--bg-secondary,#f8fafc); position:sticky; top:0; z-index:1; }
.matched { color:#16a34a; }
.unmatched { color:#dc2626; }
.hint { color:#64748b; font-size:.8rem; margin:6px 0; }
.actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
.tag { display:inline-block; padding:2px 6px; border-radius:4px; font-size:.7rem; }
.tag-ok { background:#dcfce7; color:#166534; }
.tag-warn { background:#fef3c7; color:#92400e; }
.tag-info { background:#dbeafe; color:#1e40af; }
.file-drop { border:2px dashed var(--border,#94a3b8); border-radius:8px; padding:24px; text-align:center; cursor:pointer; transition:.2s; }
.file-drop:hover { border-color:#2563eb; background:var(--bg-secondary,#f8fafc); }
.file-drop.has-file { border-color:#16a34a; background:#f0fdf4; }
</style>`

export class ExcelImportModal {
  private stateManager: StateManager
  private notificationManager: NotificationManager
  private overlay: HTMLElement | null = null
  private classId: string | null = null
  private onComplete: (() => void) | null = null

  // Import state
  private sheets: Record<string, any[][]> = {}
  private currentSheet: string = ''
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(stateManager: StateManager, notificationManager: NotificationManager) {
    this.stateManager = stateManager
    this.notificationManager = notificationManager
  }

  open(classId: string | null, onComplete?: () => void): void {
    if (classId) {
      const cls = this.stateManager.getClass(classId)
      if (!cls) {
        this.notificationManager.show('Lớp không tồn tại', 'error')
        return
      }
      if (!cls.students.length) {
        this.notificationManager.show('Lớp chưa có học viên. Vui lòng thêm học viên trước hoặc import file có danh sách.', 'warning')
      }
    }

    this.classId = classId
    this.onComplete = onComplete || null
    this.resetState()
    this.render()
  }

  private resetState(): void {
    this.sheets = {}
    this.currentSheet = ''
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
      document.body.style.overflow = ''
    }
  }

  private render(): void {
    if (this.overlay) this.overlay.remove()

    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-labelledby', 'excelImportTitle')
    overlay.innerHTML = STYLES + `
      <div class="modal-panel">
        <button type="button" class="modal-close" id="modalClose" aria-label="Đóng">×</button>
        <h2 id="excelImportTitle">📥 Import từ Excel</h2>
        <div id="modalBody"></div>
      </div>
    `
    document.body.appendChild(overlay)
    document.body.style.overflow = 'hidden'
    this.overlay = overlay
    this._focusTrap = createFocusTrap(overlay)

    overlay.querySelector('#modalClose')?.addEventListener('click', () => this.close())
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close()
    })

    this.renderFilePicker()
  }

  private renderFilePicker(): void {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    body.innerHTML = `
      <div class="step">
        <p class="hint">Chọn file Excel (.xlsx, .xls) có điểm cần import. File cần có dòng header với tên cột khớp với cột điểm của lớp.</p>
        <div class="file-drop" id="fileDrop">
          <div style="font-size:2rem" class="mb-2">📄</div>
          <strong>Chọn file Excel</strong>
          <p class="hint mt-1">hoặc kéo thả file vào đây</p>
          <p class="hint" id="selectedFileName"></p>
        </div>
        <input type="file" id="fileInput" accept=".xlsx,.xls" class="hidden" />
      </div>
      <div class="actions" id="fileActions">
        <button class="btn btn-primary" id="btnNext">Tiếp theo →</button>
      </div>
    `

    const fileDrop = body.querySelector('#fileDrop') as HTMLElement
    const fileInput = body.querySelector('#fileInput') as HTMLInputElement
    const btnNext = body.querySelector('#btnNext') as HTMLButtonElement

    btnNext.disabled = true

    fileDrop.addEventListener('click', () => fileInput.click())
    fileDrop.addEventListener('dragover', (e) => {
      e.preventDefault()
      fileDrop.classList.add('has-file')
    })
    fileDrop.addEventListener('dragleave', () => {
      fileDrop.classList.remove('has-file')
    })
    fileDrop.addEventListener('drop', (e) => {
      e.preventDefault()
      fileDrop.classList.remove('has-file')
      if (e.dataTransfer?.files.length) {
        this.handleFile(e.dataTransfer.files[0], fileDrop, fileInput, btnNext)
      }
    })
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.length) {
        this.handleFile(fileInput.files[0], fileDrop, fileInput, btnNext)
      }
    })

    btnNext.addEventListener('click', () => {
      if (!this.classId) {
        this.renderCreateClassForm()
      } else {
        this.renderSheetPicker()
      }
    })
  }

  private async handleFile(file: File, fileDrop: HTMLElement, _fileInput: HTMLInputElement, btnNext: HTMLButtonElement): Promise<void> {
    if (!file.name.match(/\.xlsx?$/i)) {
      this.notificationManager.show('Chỉ hỗ trợ file .xlsx hoặc .xls', 'error')
      return
    }

    const fileNameEl = fileDrop.querySelector('#selectedFileName') as HTMLElement
    if (fileNameEl) fileNameEl.textContent = `📎 ${file.name}`

    const { sheets, errors } = await readExcelFile(file)

    if (errors.length) {
      this.notificationManager.show(errors[0], 'error')
      return
    }

    const sheetNames = Object.keys(sheets)
    if (sheetNames.length === 0) {
      this.notificationManager.show('File Excel không có dữ liệu', 'error')
      return
    }

    this.sheets = sheets
    btnNext.disabled = false
    btnNext.textContent = sheetNames.length > 1
      ? `Tiếp theo — chọn sheet →`
      : `Tiếp theo — phân tích →`
  }

  private renderCreateClassForm(): void {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    const sheetNames = Object.keys(this.sheets)
    if (sheetNames.length === 0) { this.renderFilePicker(); return }

    const currentYear = new Date().getFullYear()
    const suggestedYear = `${currentYear}-${currentYear + 1}`

    if (sheetNames.length > 1) {
      this.renderSheetPickerForCreateClass(sheetNames, suggestedYear)
      return
    }

    this.currentSheet = sheetNames[0]
    this.showCreateClassFromSheet(suggestedYear)
  }

  private renderSheetPickerForCreateClass(sheetNames: string[], suggestedYear: string): void {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    body.innerHTML = `
      <div class="step">
        <p class="hint">File có nhiều sheet. Chọn sheet chứa danh sách học viên.</p>
        ${sheetNames.map((name, i) => `
          <label class="d-flex items-center gap-2 p-2 cursor-pointer" style="border:1px solid var(--border,#e2e8f0);border-radius:6px;margin-bottom:6px">
            <input type="radio" name="sheetSelect" value="${name}" ${i === 0 ? 'checked' : ''} />
            <span>📊 ${name}</span>
            <span class="hint">(${(this.sheets[name].length - 1) || 0} dòng)</span>
          </label>
        `).join('')}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="btnBack">← Quay lại</button>
        <button class="btn btn-primary" id="btnSelectSheet">Tiếp theo →</button>
      </div>
    `

    body.querySelector('#btnBack')?.addEventListener('click', () => this.renderFilePicker())
    body.querySelector('#btnSelectSheet')?.addEventListener('click', () => {
      const selected = body.querySelector('input[name="sheetSelect"]:checked') as HTMLInputElement
      if (selected) {
        this.currentSheet = selected.value
        this.showCreateClassFromSheet(suggestedYear)
      }
    })
  }

  private showCreateClassFromSheet(suggestedYear: string): void {
    const rows = this.sheets[this.currentSheet]
    if (!rows || rows.length < 2) {
      this.notificationManager.show('Sheet không có dữ liệu', 'error')
      return
    }

    const result = parseStudentList(rows)
    if (!result.validRows) {
      this.notificationManager.show(result.errors[0] || 'Không thể đọc dữ liệu học viên từ file', 'error')
      return
    }

    if (result.detectedClasses.length > 0) {
      this.renderMultiClassForm(result, suggestedYear)
    } else {
      this.renderSingleClassForm(result, suggestedYear)
    }
  }

  private renderSingleClassForm(result: { rows: StudentListRow[]; validRows: number; detectedClasses: string[] }, suggestedYear: string): void {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    const sheetName = this.currentSheet
    const suggestedName = sheetName
      .replace(/hk1|hk2|học.?kỳ.?|hoc.?ky.?|điểm|diem|lop|class/i, '')
      .replace(/[-_\s]+/g, ' ')
      .trim() || 'Lớp mới'

    body.innerHTML = `
      <div class="step">
        <p class="hint">File không có cột "Lớp". Sẽ tạo một lớp và đưa tất cả <strong>${result.validRows}</strong> học viên vào lớp này.</p>
        <div class="d-flex flex-col mt-3" style="gap:10px">
          <div>
            <label class="block font-semibold mb-1" style="font-size:.8rem">Tên lớp</label>
            <input type="text" id="newClassName" value="${suggestedName}" placeholder="VD: Lớp Khôi 1"
              class="w-full" style="padding:8px 10px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:.9rem" />
          </div>
          <div>
            <label class="block font-semibold mb-1" style="font-size:.8rem">Năm học</label>
            <input type="text" id="newClassYear" value="${suggestedYear}" placeholder="VD: 2026-2027"
              class="w-full" style="padding:8px 10px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:.9rem" />
          </div>
        </div>
        <div class="mt-2">
          <span class="tag tag-info">${result.validRows} học viên</span>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="btnBack">← Quay lại</button>
        <button class="btn btn-success" id="btnCreateClass">✅ Tạo lớp & nhập ${result.validRows} học viên</button>
      </div>
    `

    body.querySelector('#btnBack')?.addEventListener('click', () => this.renderCreateClassForm())
    body.querySelector('#btnCreateClass')?.addEventListener('click', () => {
      const nameInput = body.querySelector('#newClassName') as HTMLInputElement
      const yearInput = body.querySelector('#newClassYear') as HTMLInputElement
      const name = nameInput.value.trim()
      const year = yearInput.value.trim()
      if (!name) { this.notificationManager.show('Vui lòng nhập tên lớp', 'warning'); return }
      if (!year) { this.notificationManager.show('Vui lòng nhập năm học', 'warning'); return }

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

      this.close()
      this.notificationManager.show(`✅ Đã tạo lớp "${name}" và nhập ${result.validRows} học viên`, 'success')
      this.afterImport()
    })
  }

  private renderMultiClassForm(result: { rows: StudentListRow[]; validRows: number; detectedClasses: string[] }, suggestedYear: string): void {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    const classInfo = result.detectedClasses.map(cls => {
      const count = result.rows.filter(r => r.lop === cls).length
      return { name: cls, count }
    })

    body.innerHTML = `
      <div class="step">
        <div class="d-flex gap-2 flex-wrap mb-2">
          <span class="tag tag-info">${classInfo.length} lớp</span>
          <span class="tag tag-ok">${result.validRows} học viên</span>
        </div>
        <p class="hint">Phát hiện cột "Lớp" trong file. Hệ thống sẽ tự động tạo các lớp tương ứng và xếp học viên vào đúng lớp.</p>
        <div class="mt-2 d-flex flex-col" style="gap:6px">
          <div>
            <label class="block font-semibold mb-1" style="font-size:.8rem">Năm học</label>
            <input type="text" id="multiClassYear" value="${suggestedYear}" placeholder="VD: 2026-2027"
              class="w-full" style="padding:8px 10px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:.9rem" />
          </div>
        </div>
        <div class="y-auto" style="margin-top:10px;max-height:240px;border:1px solid var(--border,#e2e8f0);border-radius:6px">
          ${classInfo.map((c, i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;${i < classInfo.length - 1 ? 'border-bottom:1px solid var(--border,#e2e8f0)' : ''}">
              <span class="flex-1 font-semibold" style="font-size:.85rem">📚 ${c.name}</span>
              <span class="tag tag-info">${c.count} HV</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="btnBack">← Quay lại</button>
        <button class="btn btn-success" id="btnCreateAll">✅ Tạo ${classInfo.length} lớp & nhập ${result.validRows} học viên</button>
      </div>
    `

    body.querySelector('#btnBack')?.addEventListener('click', () => this.renderCreateClassForm())
    body.querySelector('#btnCreateAll')?.addEventListener('click', () => {
      const yearInput = body.querySelector('#multiClassYear') as HTMLInputElement
      const year = yearInput.value.trim()
      if (!year) { this.notificationManager.show('Vui lòng nhập năm học', 'warning'); return }

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

      this.close()
      this.notificationManager.show(`✅ Đã tạo ${classesToCreate.length} lớp với ${result.validRows} học viên`, 'success')
      this.afterImport()
    })
  }

  private afterImport(): void {
    if (this.onComplete) {
      this.onComplete()
    }
  }

  private renderSheetPicker(): void {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    const sheetNames = Object.keys(this.sheets)
    if (sheetNames.length === 0) {
      this.renderFilePicker()
      return
    }

    if (sheetNames.length === 1) {
      this.currentSheet = sheetNames[0]
      this.parseAndPreview()
      return
    }

    const termDetections = sheetNames.map(name => {
      const term = detectTerm(name)
      return { name, term }
    })

    body.innerHTML = `
      <div class="step">
        <p class="hint">File Excel có nhiều sheet. Chọn sheet chứa điểm cần import.</p>
        ${termDetections.map((s, i) => `
          <label class="d-flex items-center gap-2 p-2 cursor-pointer" style="border:1px solid var(--border,#e2e8f0);border-radius:6px;margin-bottom:6px">
            <input type="radio" name="sheetSelect" value="${s.name}" ${i === 0 ? 'checked' : ''} />
            <span>📊 ${s.name}</span>
            ${s.term ? `<span class="tag tag-info">${s.term === 'hk1' ? 'HK1' : 'HK2'}</span>` : ''}
            <span class="hint">(${this.sheets[s.name].length - 1} dòng)</span>
          </label>
        `).join('')}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="btnBack">← Quay lại</button>
        <button class="btn btn-primary" id="btnAnalyze">Phân tích →</button>
      </div>
    `

    body.querySelector('#btnBack')?.addEventListener('click', () => this.renderFilePicker())
    body.querySelector('#btnAnalyze')?.addEventListener('click', () => {
      const selected = body.querySelector('input[name="sheetSelect"]:checked') as HTMLInputElement
      if (selected) {
        this.currentSheet = selected.value
        this.parseAndPreview()
      }
    })
  }

  private parseAndPreview(): void {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return

    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    const rows = this.sheets[this.currentSheet]
    if (!rows || rows.length < 2) {
      this.notificationManager.show('Sheet không có đủ dữ liệu', 'error')
      return
    }

    // Auto-detectTerm from term from content ofeterm: 'hk1' | 'hk2' = 'hk1'
    let term: 'hk1' | 'hk2' = 'hk1'
    let termSource: 'sheet' | 'content' | 'default' = 'default'
    
    // 1. Try to detect from sheet name
    const sheetTerm = detectTerm(this.currentSheet)
    if (sheetTerm) {
      term = sheetTerm
      termSource = 'sheet'
    } else {
      // 2. Try to detect from content (first few rows)
      const contentTerm = this.detectTermFromContent(rows)
      if (contentTerm) {
        term = contentTerm
        termSource = 'content'
      } else {
        // 3. Default to current active term
        const state = this.stateManager.getState()
        term = state.activeTerm === 'year' ? 'hk1' : state.activeTerm
        termSource = 'default'
      }
    }

    // Check for existing scores and show warning if needed
    if (this.hasExistingTermScores(cls, term)) {
      this.notificationManager.show(
        `Cảnh báo: Lớp này đã có điểm học kỳ ${term === 'hk1' ? 'HK1' : 'HK2'}. Nếu tiếp tục, điểm cũ sẽ bị ghi đè.`,
        'warning'
      );
    }

    const result = parseExcelSheet(this.currentSheet, rows, cls, term)

    if (result.matchedCols.length === 0 && result.validRows === 0) {
      this.renderNoMatch(result)
      return
    }

    this.renderPreview(result, term, termSource)
  }

  private renderNoMatch(result: ExcelImportResult): void {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return

    body.innerHTML = `
      <div class="step">
        <div class="text-center p-4">
          <div style="font-size:2.4rem">😕</div>
          <strong>Không khớp cột điểm</strong>
          <p class="hint">Không tìm thấy cột nào trong file Excel khớp với cột điểm của lớp.</p>
          ${result.unmatchedCols.length ? `<p class="hint mt-2">Cột trong Excel: ${result.unmatchedCols.join(', ')}</p>` : ''}
          <p class="hint">Cột điểm của lớp: ${this.getClassColumnLabels().join(', ')}</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="btnBack2">← Chọn file khác</button>
        <button class="btn btn-ghost" id="btnDownloadTemplate">📥 Tải mẫu Excel</button>
      </div>
    `

    body.querySelector('#btnBack2')?.addEventListener('click', () => this.renderFilePicker())
    body.querySelector('#btnDownloadTemplate')?.addEventListener('click', () => this.downloadTemplate())
  }

  private getClassColumnLabels(): string[] {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return []
    return cls.columns?.map(c => c.label) || []
  }

private downloadTemplate(): void {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return

    import('../../../config/columns.ts').then(mod => {
      const cols = cls.columns?.length ? cls.columns : mod.DEFAULT_COLS
      const headers = ['STT', 'Tên thánh', 'Họ đệm', 'Tên', ...cols.map(c => c.label), 'Ghi chú']

      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.aoa_to_sheet([headers])
        ws['!cols'] = [
          { wch: 5 },
          { wch: 15 },
          { wch: 15 },
          { wch: 10 },
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
        this.notificationManager.show('Đã tải mẫu Excel', 'success')
      })
    })
  }

  private hasExistingTermScores(cls: ClassData, term: 'hk1' | 'hk2'): boolean {
    return cls.students.some(student => {
      const termScores = student.scoresByTerm[term];
      return Object.values(termScores).some(scores => scores && scores.length > 0);
    });
  }

  private detectTermFromContent(rows: any[][]): 'hk1' | 'hk2' | null {
    // Check first few rows for term indicators
    const rowsToCheck = Math.min(5, rows.length);
    
    for (let i = 0; i < rowsToCheck; i++) {
      const row = rows[i];
      if (!row) continue;
      
      // Join all cells in the row and check for term patterns
      const rowText = row
        .map(cell => String(cell || '').trim())
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      // Check for common term indicators
      if (
        rowText.includes('hoc ky 1') ||
        rowText.includes('hoc ky i') ||
        rowText.includes('ky 1') ||
        rowText.includes('ki 1') ||
        rowText.includes('hk1') ||
        rowText.includes('hockey 1')
      ) {
        return 'hk1';
      }
      
      if (
        rowText.includes('hoc ky 2') ||
        rowText.includes('hoc ky ii') ||
        rowText.includes('ky 2') ||
        rowText.includes('ki 2') ||
        rowText.includes('hk2') ||
        rowText.includes('hockey 2')
      ) {
        return 'hk2';
      }
    }
    
    return null;
  }

  private async renderPreview(result: ExcelImportResult, term: 'hk1' | 'hk2', termSource: 'sheet' | 'content' | 'default' = 'sheet'): Promise<void> {
    const body = this.overlay?.querySelector('#modalBody')
    if (!body) return
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return
    const classCols = await import('../../../config/columns.ts').then(m => m.resolveClassColumns(cls))

    const previewRows = result.rows.slice(0, 10)
    const headerLabels = ['Tên thánh', 'Họ đệm', 'Tên', ...classCols.filter(c => result.matchedCols.some(m => m.mappedTo === c.key)).map(c => c.label), 'Ghi chú']

    // Determine term source text and styling
    let termSourceText = ''
    let termSourceClass = ''
    if (termSource === 'sheet') {
      termSourceText = '(từ tên sheet)'
      termSourceClass = 'tag-info'
    } else if (termSource === 'content') {
      termSourceText = '(từ nội dung file)'
      termSourceClass = 'tag-ok'
    } else {
      termSourceText = '(mặc định)'
      termSourceClass = 'tag-warn'
    }

    body.innerHTML = `
      <div class="step">
        <div class="d-flex gap-2 flex-wrap mb-2">
          <span class="tag tag-info">Sheet: ${this.currentSheet}</span>
          <span class="tag tag-info">Học kỳ: ${term === 'hk1' ? 'HK1' : 'HK2'}</span>
          <span class="tag ${termSourceClass}">${termSourceText}</span>
          <span class="tag ${result.validRows > 0 ? 'tag-ok' : 'tag-warn'}">${result.validRows}/${result.totalRows} dòng hợp lệ</span>
          <span class="tag tag-info">🇩🇪 ${result.matchedCols.length} cột khớp</span>
          ${result.unmatchedCols.length ? `<span class="tag tag-warn">🇩🇪 ${result.unmatchedCols.length} cột không khớp</span>` : ''}
        </div>

        ${result.unmatchedCols.length ? `<p class="hint text-danger">⚠️ Cột không khớp: ${result.unmatchedCols.join(', ')}</p>` : ''}

        <div class="table-wrap">
          <table>
            <thead>
              <tr>${headerLabels.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${previewRows.map(row => {
                const scores = classCols.map(c => {
                  const vals = row.scores[c.key]
                  return vals?.length ? vals.join(';') : ''
                })
                return `<tr>
                  <td>${row.tenThanh}</td>
                  <td>${row.hoDem}</td>
                  <td>${row.ten}</td>
                  ${scores.map(s => `<td>${s}</td>`).join('')}
                  <td>${row.ghiChu || ''}</td>
                </tr>`
              }).join('')}
              ${result.rows.length > 10 ? `<tr><td colspan="${headerLabels.length}" class="text-center text-muted">... và ${result.rows.length - 10} dòng nữa</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="btnBack3">← Quay lại</button>
        ${termSource === 'default' ? `
          <div class="my-2 p-2 bg-warning-soft rounded-sm" style="border: 1px solid #ffeaa7;">
            <strong>⚠️ Không thể tự động xác định học kỳ từ file</strong>
            <div style="margin-top: 6px;">
              <label class="d-flex items-center" style="gap:6px;font-size:.85rem;color:var(--text,#111)">
                <input type="radio" name="termSelect" value="hk1" ${term === 'hk1' ? 'checked' : ''} />
                Học kỳ 1 (HK1)
              </label>
              <label class="d-flex items-center" style="gap:6px;font-size:.85rem;color:var(--text,#111)">
                <input type="radio" name="termSelect" value="hk2" ${term === 'hk2' ? 'checked' : ''} />
                Học kỳ 2 (HK2)
              </label>
            </div>
          </div>
        ` : ''}
        <label class="d-flex items-center" style="gap:6px;font-size:.85rem;color:var(--text,#111)">
          <input type="checkbox" id="chkOverwrite" />
          Ghi đè điểm cũ
        </label>
        <button class="btn btn-success" id="btnImport">✅ Import ${result.validRows} dòng</button>
      </div>
    `

    body.querySelector('#btnBack3')?.addEventListener('click', () => this.renderSheetPicker())
    
    // Handle term selection if in default mode
    if (termSource === 'default') {
      const hk1Radio = body.querySelector('input[name="termSelect"][value="hk1"]') as HTMLInputElement
      const hk2Radio = body.querySelector('input[name="termSelect"][value="hk2"]') as HTMLInputElement
      
      hk1Radio?.addEventListener('change', () => { term = 'hk1' })
      hk2Radio?.addEventListener('change', () => { term = 'hk2' })
    }

    body.querySelector('#btnImport')?.addEventListener('click', () => {
      const chkOverwrite = body.querySelector('#chkOverwrite') as HTMLInputElement
      this.executeImport(result, term, chkOverwrite.checked)
    })
  }

  private async executeImport(result: ExcelImportResult, term: 'hk1' | 'hk2', overwrite: boolean): Promise<void> {
    const cls = this.stateManager.getClass(this.classId!)
    if (!cls) return

    const { applyImportedRows } = await import('../../../services/import/excelImport.ts')
    const updatedStudents = applyImportedRows(cls, result.rows, term, { overwrite, append: !overwrite })

    this.stateManager.setClassStudents(this.classId!, updatedStudents)

    this.close()
    this.notificationManager.show(
      `✅ Import thành công — ${result.validRows} học viên (${term === 'hk1' ? 'HK1' : 'HK2'})`,
      'success'
    )
    this.onComplete?.()
  }
}


