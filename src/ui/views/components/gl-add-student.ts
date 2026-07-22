import { LitElement, html } from 'lit'
import { StateManager } from '../../StateManager'
import type { NotificationManager } from '../../../services/NotificationManager'
import { INFO_FIELD_DEFS, type InfoField } from '../../../config/constants.ts'

export class GlAddStudent extends LitElement {
  createRenderRoot() { return this }

  static properties = {
    open: { type: Boolean, reflect: true },
    stateManager: { type: Object },
    classId: { type: String },
    notification: { type: Object },
  }

  declare open: boolean
  declare stateManager: StateManager
  declare classId: string
  declare notification: NotificationManager

  constructor() {
    super()
    this.open = false
  }

  connectedCallback() {
    super.connectedCallback()
    if (this.classId) this.open = true
    if (this.open) {
      this.updateComplete.then(() => {
        this.querySelector<HTMLInputElement>('#inputTenThanh')?.focus()
      })
    }
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      this.updateComplete.then(() => {
        this.querySelector<HTMLInputElement>('#inputTenThanh')?.focus()
      })
    }
  }

  private _onClose() {
    this.open = false
    this.dispatchEvent(new CustomEvent('gl-close', { bubbles: true, composed: true }))
  }

  private _onSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!this.classId) return

    const form = e.currentTarget as HTMLFormElement
    const data = new FormData(form)

    const holyName = (data.get('tenThanh') as string || '').trim()
    const lastName = (data.get('hoDem') as string || '').trim()
    const firstName = (data.get('ten') as string || '').trim()

    if (!firstName) {
      if (this.notification) this.notification.show('Vui lòng nhập tên học viên', 'warning')
      return
    }

    const infoValues = Object.fromEntries(
      INFO_FIELD_DEFS.map(f => [f.key, (data.get(`info_${f.key}`) as string || '').trim()])
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
    this._onClose()
  }

  private _onSubmitClick() {
    this.querySelector<HTMLFormElement>('#addForm')?.requestSubmit()
  }

  render() {
    return html`
      <gl-modal
        heading="Thêm học viên"
        subtitle="Nhập họ tên · có thể bổ sung thông tin thêm"
        size="md"
        ?open=${this.open}
        @gl-close=${this._onClose}
      >
        <form id="addForm" class="add-name-form" autocomplete="off" @submit=${this._onSubmit}>
          <div class="name-fields">
            <div>
              <label class="field-label" for="inputTenThanh">Tên thánh</label>
              <input id="inputTenThanh" class="input" type="text" name="tenThanh" placeholder="VD: Anna" autocomplete="off" />
            </div>
            <div>
              <label class="field-label" for="inputHoDem">Họ và tên đệm</label>
              <input id="inputHoDem" class="input" type="text" name="hoDem" placeholder="VD: Nguyễn Ngọc Kim" autocomplete="off" />
            </div>
            <div>
              <label class="field-label" for="inputTen">Tên</label>
              <input id="inputTen" class="input" type="text" name="ten" placeholder="VD: Anh" required autocomplete="off" />
            </div>
          </div>
          <details class="add-info-details">
            <summary>➕ Thông tin thêm (mã HV, ngày sinh, SĐT…)</summary>
            <div class="add-info-grid">
              ${INFO_FIELD_DEFS.map(f => {
                if (f.type === 'select') {
                  return html`
                    <div>
                      <label class="field-label" for="addInfo_${f.key}">${f.label}</label>
                      <select id="addInfo_${f.key}" class="input" name="info_${f.key}">
                        ${(f.options || []).map(o => html`<option value=${o}>${o || '—'}</option>`)}
                      </select>
                    </div>
                  `
                }
                return html`
                  <div>
                    <label class="field-label" for="addInfo_${f.key}">${f.label}</label>
                    <input id="addInfo_${f.key}" class="input" type=${f.type} name="info_${f.key}"
                      inputmode=${f.inputmode || ''} placeholder=${f.placeholder || ''} autocomplete="off" />
                  </div>
                `
              })}
            </div>
          </details>
          <p class="hint mt-1">
            Ví dụ: <strong>Anna</strong> · <strong>Nguyễn Ngọc Kim</strong> · <strong>Anh</strong>
          </p>
        </form>
        <div slot="footer" class="add-form-actions">
          <gl-button variant="ghost" @click=${this._onClose}>Đóng</gl-button>
          <gl-button variant="primary" @click=${this._onSubmitClick}>+ Thêm học viên</gl-button>
        </div>
      </gl-modal>
    `
  }
}

customElements.define('gl-add-student', GlAddStudent)

declare global {
  interface HTMLElementTagNameMap {
    'gl-add-student': GlAddStudent
  }
}
