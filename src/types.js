/**
 * Định nghĩa type trung tâm (JSDoc) cho dữ liệu của app.
 * Import kiểu: các file khác tham chiếu qua {import("../types.js").Student}…
 * File này không có code chạy — chỉ typedef.
 */

/**
 * Điểm theo cột trong một học kỳ — key là GL.COLS[].key
 * (dauGio, muoiLam, motTiet, khaoKinh, daoDuc, thi), mỗi cột là mảng nhiều lần điểm.
 * @typedef {Object<string, number[]>} TermScores
 */

/**
 * Điểm chia theo học kỳ.
 * @typedef {Object} ScoresByTerm
 * @property {TermScores} hk1
 * @property {TermScores} hk2
 */

/**
 * Thông tin cá nhân của học viên.
 * @typedef {Object} StudentInfo
 * @property {string} [birthday]
 * @property {string} [phone]
 * @property {string} [parentPhone]
 * @property {string} [address]
 * @property {string} [note]
 */

/**
 * Một học viên trong lớp.
 * @typedef {Object} Student
 * @property {string} id
 * @property {string} name        Tên gọi (vd: "Hoa")
 * @property {string} saintName   Tên thánh (vd: "Anna")
 * @property {string} middleName  Họ đệm (vd: "Nguyễn Thị")
 * @property {ScoresByTerm} scoresByTerm
 * @property {TermScores} [scores] Legacy — điểm phẳng cũ, được migrate vào hk1 rồi xoá
 * @property {StudentInfo} [info]
 * @property {Object<string, string>} [learningLog] Nhật ký theo dõi (key = ngày)
 */

/**
 * Một lớp giáo lý.
 * @typedef {Object} GLClass
 * @property {string} id
 * @property {string} name
 * @property {string} [schoolYear]  Năm học (vd: "2025-2026")
 * @property {Student[]} students
 * @property {Object<string, number>} [weights] Hệ số cột điểm (×1…×3)
 */

/**
 * Tài khoản người dùng (Ban GL / GLV).
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} username
 * @property {string} displayName
 * @property {"ban_gl"|"glv"} role
 * @property {string} pinHash  "pbkdf2$<iter>$<saltB64>$<hashB64>" (legacy: số DJB2)
 * @property {boolean} [disabled]
 * @property {string[]} [classIds] Lớp được gán (GLV)
 * @property {number} [mustChangePin] 1 = bắt đổi PIN lần đăng nhập tới
 */

/**
 * Kho tài khoản lưu trong localStorage (giao-ly-auth-v1).
 * @typedef {Object} AuthStore
 * @property {number} version
 * @property {AuthUser[]} users
 */

/**
 * Trạng thái chính của app (giao-ly-* trong localStorage / snapshot cloud).
 * @typedef {Object} AppState
 * @property {GLClass[]} classes
 * @property {string|null} activeClassId
 */
