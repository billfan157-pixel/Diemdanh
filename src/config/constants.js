/**
 * Cấu hình cố định: cột điểm, alias import, storage keys, chế độ xem.
 */
(function (GL) {
  "use strict";

  GL.COLS = [
    { key: "dauGio", label: "Đầu giờ", short: "ĐG", defaultWeight: 1 },
    { key: "phut15", label: "15 phút", short: "15'", defaultWeight: 1 },
    { key: "motTiet", label: "1 tiết", short: "1T", defaultWeight: 2 },
    { key: "khaoKinh", label: "Khảo kinh", short: "KK", defaultWeight: 1 },
    { key: "daoDuc", label: "Đạo đức", short: "ĐĐ", defaultWeight: 1 },
    { key: "thi", label: "Thi", short: "Thi", defaultWeight: 3 },
  ];

  /** Cột danh tính học viên */
  GL.NAME_FIELDS = [
    { key: "tenThanh", label: "Tên thánh", short: "Thánh", placeholder: "VD: Anna" },
    { key: "hoDem", label: "Họ và tên đệm", short: "Họ đệm", placeholder: "VD: Nguyễn Ngọc Kim" },
    { key: "ten", label: "Tên", short: "Tên", placeholder: "VD: Anh" },
  ];

  /**
   * Thông tin học viên (ngoài họ tên).
   * type: text | date | tel | select
   */
  GL.INFO_FIELDS = [
    {
      key: "maHV",
      label: "Mã học viên",
      short: "Mã HV",
      placeholder: "VD: 2023219",
      type: "text",
    },
    {
      key: "ngaySinh",
      label: "Ngày sinh",
      short: "NS",
      placeholder: "dd/mm/yyyy",
      type: "date",
    },
    {
      key: "gioiTinh",
      label: "Giới tính",
      short: "GT",
      placeholder: "",
      type: "select",
      options: ["", "Nam", "Nữ"],
    },
    {
      key: "giaoXu",
      label: "Giáo xứ / Địa chỉ",
      short: "Giáo xứ",
      placeholder: "VD: GX Trảng Bom",
      type: "text",
    },
    {
      key: "phuHuynh",
      label: "Phụ huynh",
      short: "PH",
      placeholder: "Họ tên phụ huynh",
      type: "text",
    },
    {
      key: "sdt",
      label: "Số điện thoại",
      short: "SĐT",
      placeholder: "09xx xxx xxx",
      type: "tel",
    },
    {
      key: "email",
      label: "Email",
      short: "Email",
      placeholder: "email@example.com",
      type: "text",
    },
    {
      key: "ngayNhapHoc",
      label: "Ngày nhập học",
      short: "Nhập học",
      placeholder: "",
      type: "date",
    },
  ];

  /** Alias tiêu đề cột khi import Excel/Word (đã normalize) → key */
  GL.HEADER_ALIASES = {
    "ho ten": "fullName",
    "họ tên": "fullName",
    hoten: "fullName",
    "ten hoc vien": "fullName",
    "tên học viên": "fullName",
    "hoc vien": "fullName",
    "học viên": "fullName",
    "ho va ten": "fullName",
    "họ và tên": "fullName",
    "full name": "fullName",
    name: "fullName",
    "ten thanh": "tenThanh",
    "tên thánh": "tenThanh",
    "ten-thanh": "tenThanh",
    thanh: "tenThanh",
    ho: "hoDem",
    họ: "hoDem",
    "ho dem": "hoDem",
    "họ đệm": "hoDem",
    "ho va ten dem": "hoDem",
    "họ và tên đệm": "hoDem",
    "ten dem": "hoDem",
    "tên đệm": "hoDem",
    ten: "ten",
    tên: "ten",
    "ten goi": "ten",
    "tên gọi": "ten",
    "dau gio": "dauGio",
    "đầu giờ": "dauGio",
    daugio: "dauGio",
    dg: "dauGio",
    "15 phut": "phut15",
    "15 phút": "phut15",
    "15'": "phut15",
    "15p": "phut15",
    "15": "phut15",
    "1 tiet": "motTiet",
    "1 tiết": "motTiet",
    "mot tiet": "motTiet",
    "một tiết": "motTiet",
    "45 phut": "motTiet",
    "45 phút": "motTiet",
    "45'": "motTiet",
    "45p": "motTiet",
    "45": "motTiet",
    "khao kinh": "khaoKinh",
    "khảo kinh": "khaoKinh",
    khaokinh: "khaoKinh",
    kk: "khaoKinh",
    "dao duc": "daoDuc",
    "đạo đức": "daoDuc",
    daoduc: "daoDuc",
    dd: "daoDuc",
    đd: "daoDuc",
    thi: "thi",
    "thi hk": "thi",
    "thi hoc ky": "thi",
    "thi học kỳ": "thi",
    "cuoi ky": "thi",
    "cuối kỳ": "thi",
    exam: "thi",
    stt: "_skip",
    tt: "_skip",
    lop: "lop",
    lớp: "lop",
    "ten lop": "lop",
    "tên lớp": "lop",
    "lop hoc": "lop",
    "lớp học": "lop",
    "khoi": "lop",
    "khối": "lop",
    tb: "_skip",
    "trung binh": "_skip",
    "trung bình": "_skip",
    "xep loai": "_skip",
    "xếp loại": "_skip",
    "ghi chu": "ghiChu",
    "ghi chú": "ghiChu",
    ghichu: "ghiChu",
    note: "ghiChu",
    notes: "ghiChu",
    "nhan xet": "ghiChu",
    "nhận xét": "ghiChu",
    // thông tin HV
    "ma hoc vien": "maHV",
    "mã học viên": "maHV",
    "ma hv": "maHV",
    "mã hv": "maHV",
    mahv: "maHV",
    "ma so": "maHV",
    "mã số": "maHV",
    "ngay sinh": "ngaySinh",
    "ngày sinh": "ngaySinh",
    "nam sinh": "ngaySinh",
    "năm sinh": "ngaySinh",
    birthday: "ngaySinh",
    dob: "ngaySinh",
    "gioi tinh": "gioiTinh",
    "giới tính": "gioiTinh",
    gender: "gioiTinh",
    "giao xu": "giaoXu",
    "giáo xứ": "giaoXu",
    "dia chi": "giaoXu",
    "địa chỉ": "giaoXu",
    address: "giaoXu",
    "phu huynh": "phuHuynh",
    "phụ huynh": "phuHuynh",
    "ho ten phu huynh": "phuHuynh",
    "họ tên phụ huynh": "phuHuynh",
    "ten bo me": "phuHuynh",
    "tên bố mẹ": "phuHuynh",
    sdt: "sdt",
    "so dien thoai": "sdt",
    "số điện thoại": "sdt",
    "dien thoai": "sdt",
    "điện thoại": "sdt",
    phone: "sdt",
    tel: "sdt",
    email: "email",
    "e mail": "email",
    "ngay nhap hoc": "ngayNhapHoc",
    "ngày nhập học": "ngayNhapHoc",
    "ngay vao lop": "ngayNhapHoc",
    "ngày vào lớp": "ngayNhapHoc",
  };

  GL.STORAGE_KEY = "giao-ly-diem-v3";
  GL.OLD_KEY = "giao-ly-diem-v2";
  GL.VIEW_KEY = "giao-ly-view";
  GL.TERM_KEY = "giao-ly-term";
  GL.YEAR_FILTER_KEY = "giao-ly-year-filter";
  GL.HOME_VIEW_KEY = "giao-ly-home-view"; // dashboard | class
  GL.AUTH_KEY = "giao-ly-auth-v1";
  GL.SESSION_KEY = "giao-ly-session-v1";
  /** Face ID / vân tay (WebAuthn) — theo từng máy */
  GL.BIO_KEY = "giao-ly-bio-v1";
  GL.PRINT_KEY = "giao-ly-print-v1";
  GL.SETTINGS_KEY = "giao-ly-settings-v1";
  GL.BACKUP_META_KEY = "giao-ly-backup-meta-v1";
  /** Số ngày không backup thì nhắc (admin) */
  GL.BACKUP_REMIND_DAYS = 7;

  /** Học kỳ + cả năm */
  GL.TERMS = [
    { key: "hk1", label: "Học kỳ 1", short: "HK1" },
    { key: "hk2", label: "Học kỳ 2", short: "HK2" },
    { key: "year", label: "Cả năm", short: "CN" },
  ];

  GL.CLASS_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#16a34a",
    "#0891b2",
    "#4f46e5",
    "#ca8a04",
  ];

  GL.VIEW_MODES = [
    "cards",
    "table",
    "rank",
    "journal", // gộp thiếu điểm + theo dõi nhật ký
    "stats",
    "print",
    "year",
  ];

  /** Loại nhật ký học tập (không gồm điểm danh — app khác lo chuyên cần) */
  GL.LOG_TYPES = [
    {
      key: "hocBai",
      label: "Học bài / chuẩn bị",
      short: "Học bài",
      defaultLevel: "neg",
    },
    {
      key: "thaiDo",
      label: "Thái độ / đạo đức",
      short: "Thái độ",
      defaultLevel: "neu",
    },
    {
      key: "tienBo",
      label: "Tiến bộ",
      short: "Tiến bộ",
      defaultLevel: "pos",
    },
    {
      key: "canThiep",
      label: "Can thiệp / gặp PH",
      short: "Can thiệp",
      defaultLevel: "info",
    },
    {
      key: "ghiChu",
      label: "Ghi chú khác",
      short: "Ghi chú",
      defaultLevel: "neu",
    },
  ];

  GL.LOG_LEVELS = [
    { key: "pos", label: "Tích cực", short: "😊" },
    { key: "neu", label: "Trung tính", short: "·" },
    { key: "neg", label: "Cần lưu ý", short: "⚠" },
    { key: "info", label: "Can thiệp", short: "ℹ" },
  ];

  GL.VIEW_HINTS = {
    cards:
      "<strong>Nhập điểm:</strong> Xem chi tiết từng cột, thêm nhiều lần điểm (15', 1 tiết…). Phù hợp khi chấm bài.",
    table:
      "<strong>Bảng tổng hợp:</strong> Nhìn cả lớp một lúc. Gõ điểm trực tiếp vào ô (Enter để lưu). Phù hợp theo dõi nhanh.",
    rank: "<strong>Xếp hạng:</strong> Top 3 + danh sách theo TB giảm dần. Phù hợp khen thưởng, công bố kết quả.",
    stats:
      "<strong>Thống kê:</strong> Phân bố xếp loại &amp; TB từng cột. Phù hợp báo cáo lớp, đánh giá chất lượng.",
    print:
      "<strong>Bản in:</strong> Bảng sạch để in hoặc chiếu họp phụ huynh / ban giáo lý. Bấm In trang.",
    year:
      "<strong>Tổng điểm cả năm:</strong> TB HK1 hệ số <strong>1</strong>, TB HK2 hệ số <strong>2</strong> → TB năm = (TB1×1 + TB2×2) / 3. Xếp loại &amp; xếp hạng cả năm.",
    journal:
      "<strong>Theo dõi:</strong> Thiếu điểm + nhật ký (học bài, thái độ, tiến bộ, can thiệp). Không điểm danh. Lọc «thiếu điểm» / «cần quan tâm».",
  };
})((window.GL = window.GL || /** @type {GLNamespace} */ ({})));
