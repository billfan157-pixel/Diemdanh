export class HelpModal {
  private overlay: HTMLElement | null = null

  constructor() {
  }

  open(): void {
    this.render()
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private render(): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'modal-overlay'
    this.overlay.innerHTML = `
<div class="modal-panel" style="max-width:480px">
  <h2>ℹ️ Hướng dẫn <button class="modal-close" id="helpModalClose">×</button></h2>
  <div style="display:grid;gap:12px;font-size:.85rem;line-height:1.5">
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
  <div class="actions" style="margin-top:12px">
    <button class="btn btn-secondary" id="helpModalCloseBtn">Đã hiểu</button>
  </div>
</div>`
    document.body.appendChild(this.overlay)

    const close = () => this.close()
    this.overlay.querySelector('#helpModalClose')?.addEventListener('click', close)
    this.overlay.querySelector('#helpModalCloseBtn')?.addEventListener('click', close)
    this.overlay.addEventListener('click', (e: Event) => {
      if (e.target === this.overlay) close()
    })
  }
}
