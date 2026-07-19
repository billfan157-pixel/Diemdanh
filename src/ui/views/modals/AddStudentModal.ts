import { StateManager } from '../../StateManager'
import { AuthManager } from '../../../core/auth/AuthManager'

export class AddStudentModal {
  private stateManager: StateManager
  private element: HTMLElement | null = null
  private classId: string | null = null

  constructor(stateManager: StateManager, _authManager: AuthManager) {
    this.stateManager = stateManager
  }

  open(classId: string): void {
    this.classId = classId

    // Ensure template exists in DOM
    this.ensureModalElement()

    // Show modal
    this.element?.classList.remove('hidden')

    // Reset form
    const form = this.element?.querySelector('#addForm') as HTMLFormElement
    form?.reset()

    // Focus on holy name input
    const inputTenThanh = this.element?.querySelector('#inputTenThanh') as HTMLInputElement
    inputTenThanh?.focus()
  }

  close(): void {
    this.element?.classList.add('hidden')
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
            <button type="button" class="icon-btn modal-close" id="addStudentModalClose" title="Đóng" aria-label="Đóng">×</button>
          </div>
          <div class="modal-body">
            <form id="addForm" class="add-name-form" autocomplete="off">
              <div class="name-fields">
                <div>
                  <label class="field-label" for="inputTenThanh">Tên thánh</label>
                  <input id="inputTenThanh" class="input" type="text" placeholder="VD: Anna" />
                </div>
                <div>
                  <label class="field-label" for="inputHoDem">Họ và tên đệm</label>
                  <input id="inputHoDem" class="input" type="text" placeholder="VD: Nguyễn Ngọc Kim" />
                </div>
                <div>
                  <label class="field-label" for="inputTen">Tên</label>
                  <input id="inputTen" class="input" type="text" placeholder="VD: Anh" required />
                </div>
              </div>
              <details class="add-info-details">
                <summary>➕ Thông tin thêm (mã HV, ngày sinh, SĐT…)</summary>
                <div class="add-info-grid" id="addInfoGrid">
                  <!-- Optional info fields can be placed here if needed -->
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

      this.stateManager.addStudent(this.classId, {
        tenThanh: holyName,
        hoDem: lastName,
        ten: firstName,
        name: [holyName, lastName, firstName].filter(Boolean).join(' '),
        maHV: '',
        ngaySinh: '',
        gioiTinh: '',
        tenPhuHuynh: '',
        sdPhuHuynh: '',
        diaChi: '',
        email: '',
        ghiChu: ''
      })
      this.close()
    })
  }
}
