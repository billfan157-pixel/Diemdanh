export class HelpModal {
  private element: HTMLElement | null = null

  constructor() {}

  open(): void {
    this.ensureModal()
    const modal = this.element as any
    if (modal) { modal.open = true }
  }

  close(): void {
    const modal = this.element as any
    if (modal) { modal.open = false }
  }

  private ensureModal(): void {
    let modal = document.getElementById('helpModal')
    if (!modal) {
      modal = document.createElement('gl-modal')
      modal.id = 'helpModal'
      modal.setAttribute('heading', 'ℹ️ Hướng dẫn')

      modal.innerHTML = `
        <div class="grid gap-3 leading-normal" style="font-size:.85rem">
          <div>
            <strong>👤 Tài khoản</strong><br/>
            Mặc định: <code>admin</code> / PIN hiển thị trên màn hình đăng nhập.
            Vào sidebar → Cài đặt để đổi PIN hoặc cấu hình Cloud.
          </div>
          <div>
            <strong>📚 Lớp học</strong><br/>
            Tạo lớp mới ở màn hình danh sách lớp.
            Nhập danh sách học viên bằng file Excel hoặc thủ công.
          </div>
          <div>
            <strong>📝 Nhập điểm</strong><br/>
            Chọn lớp → chọn học viên → nhập điểm từng cột.
            Hỗ trợ view dạng Cards (mặc định), Table, và nhập hàng loạt.
          </div>
          <div>
            <strong>📊 Báo cáo</strong><br/>
            Dashboard tổng quan, báo cáo nhanh từng lớp, xuất CSV/Excel.
          </div>
          <div>
            <strong>☁️ Đồng bộ Cloud</strong><br/>
            Vào Cấu hình Cloud → nhập URL Supabase + Anon Key → Bật đồng bộ.
            Dữ liệu được tự động đồng bộ theo thời gian thực.
          </div>
          <div>
            <strong>💾 Sao lưu</strong><br/>
            Vào Sao lưu → chọn thư mục lưu → tự động sao lưu định kỳ.
          </div>
        </div>
        <gl-button slot="footer" variant="secondary" id="helpModalCloseBtn">Đã hiểu</gl-button>
      `
      document.body.appendChild(modal)
      modal.addEventListener('gl-close', () => this.close())
      modal.querySelector('#helpModalCloseBtn')?.addEventListener('click', () => this.close())
    }
    this.element = modal
  }
}
