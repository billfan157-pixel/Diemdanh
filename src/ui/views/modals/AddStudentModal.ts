import { StateManager } from '../../StateManager'
import { AuthManager } from '../../../core/auth/AuthManager'
import { INFO_FIELD_DEFS, type InfoField } from '../../../config/constants.ts'
import { createFocusTrap } from '../../../utils/focusTrap.ts'

export class AddStudentModal {
  private stateManager: StateManager
  private element: HTMLElement | null = null
  private classId: string | null = null
  private _focusTrap: ReturnType<typeof createFocusTrap> | null = null

  constructor(stateManager: StateManager, _authManager: AuthManager) {
    this.stateManager = stateManager
  }

  open(classId: string): void {
    this.classId = classId

    this.ensureModalElement()
    this.element?.classList.remove('hidden')

    const form = this.element?.querySelector('#addForm') as HTMLFormElement
    form?.reset()

    const inputTenThanh = this.element?.querySelector('#inputTenThanh') as HTMLInputElement
    inputTenThanh?.focus()
    if (this.element) this._focusTrap = createFocusTrap(this.element)
  }

  close(): void {
    this._focusTrap?.destroy()
    this._focusTrap = null
    this.element?.classList.add('hidden')
  }

  private renderInfoGrid(): string {
    return INFO_FIELD_DEFS.map(f => {
      const id = `addInfo_${f.key}`
      if (f.type === 'select') {
        const opts = (f.options || []).map(o =>
          `<option value="${this.escapeHtml(o)}">${o || '—'}</option>`
        ).join('')
        return `<div><label class="field-label" for="${id}">${f.label}</label><select id="${id}" class="input">${opts}</select></div>`
      }
      const inputmode = f.inputmode ? ` inputmode="${f.inputmode}"` : ''
      const placeholder = f.placeholder ? ` placeholder="${this.escapeHtml(f.placeholder)}"` : ''
      return `<div><label class="field-label" for="${id}">${f.label}</label><input id="${id}" class="input" type="${f.type}"${inputmode}${placeholder} autocomplete="off" /></div>`
    }).join('')
  }

  private ensureModalElement(): void {
    let modal = document.getElementById('addStudentModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'addStudentModal'
      modal.className = 'modal-overlay hidden'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')
      modal.setAttribute('aria-labelledby', 'addStudentModalTitle')

      modal.innerHTML = `
        <div class="modal-panel modal-panel-md">
          <div class="modal-head">
            <div>
              <h3 id="addStudentModalTitle">Thêm học viên</h3>
              <p class="modal-sub">Nhập họ tên · có thể bổ sung thông tin thêm</p>
            </div>
            <button type="button" class="icon-btn modal-close touch-ripple" id="addStudentModalClose" title="Đóng" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body">
            <form id="addForm" class="add-name-form" autocomplete="off">
              <div class="name-fields">
                <div>
                  <label class="field-label" for="inputTenThanh">Tên thánh</label>
                  <input id="inputTenThanh" class="input" type="text" placeholder="VD: Anna" autocomplete="off" />
                </div>
                <div>
                  <label class="field-label" for="inputHoDem">Họ và tên đệm</label>
                  <input id="inputHoDem" class="input" type="text" placeholder="VD: Nguyễn Ngọc Kim" autocomplete="off" />
                </div>
                <div>
                  <label class="field-label" for="inputTen">Tên</label>
                  <input id="inputTen" class="input" type="text" placeholder="VD: Anh" required autocomplete="off" />
                </div>
              </div>
              <details class="add-info-details">
                <summary>➕ Thông tin thêm (mã HV, ngày sinh, SĐT…)</summary>
                <div class="add-info-grid" id="addInfoGrid">
                  ${this.renderInfoGrid()}
                </div>
              </details>
              <p class="hint mt-1">
                Ví dụ: <strong>Anna</strong> · <strong>Nguyễn Ngọc Kim</strong> · <strong>Anh</strong>
              </p>
              <div class="add-form-actions">
                <button type="button" class="btn btn-ghost touch-ripple" id="addStudentModalCancel">Đóng</button>
                <button type="submit" class="btn btn-primary touch-ripple">+ Thêm học viên</button>
              </div>
            </form>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      this.bindEvents(modal)
    }
    this.element = modal
  }

  private bindEvents(modal: HTMLElement): void {
    const closeBtn = modal.querySelector('#addStudentModalClose')
    const cancelBtn = modal.querySelector('#addStudentModalCancel')
    const form = modal.querySelector('#addForm') as HTMLFormElement

    closeBtn?.addEventListener('click', () => this.close())
    cancelBtn?.addEventListener('click', () => this.close())

    form?.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!this.classId) return

      const holyNameInput = modal.querySelector('#inputTenThanh') as HTMLInputElement
      const lastNameInput = modal.querySelector('#inputHoDem') as HTMLInputElement
      const firstNameInput = modal.querySelector('#inputTen') as HTMLInputElement

      const holyName = holyNameInput.value.trim()
      const lastName = lastNameInput.value.trim()
      const firstName = firstNameInput.value.trim()

      if (!firstName) return

      const infoValues = Object.fromEntries(
        INFO_FIELD_DEFS.map(f => {
          const el = modal.querySelector(`#addInfo_${f.key}`) as HTMLInputElement | HTMLSelectElement
          return [f.key, el?.value?.trim() || '']
        })
      ) as Record<InfoField, string>

      this.stateManager.addStudent(this.classId, {
        tenThanh: holyName,
        hoDem: lastName,
        ten: firstName,
        name: [holyName, lastName, firstName].filter(Boolean).join(' '),
        maHV: infoValues.maHV,
        ngaySinh: infoValues.ngaySinh,
        gioiTinh: infoValues.gioiTinh,
        tenPhuHuynh: infoValues.tenPhuHuynh,
        sdPhuHuynh: infoValues.sdPhuHuynh,
        diaChi: infoValues.diaChi,
        email: infoValues.email,
        ghiChu: ''
      })
      this.close()
    })
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}
