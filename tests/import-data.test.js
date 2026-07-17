import { describe, it, expect, beforeEach } from "vitest";
import { loadGL, resetStorage } from "./helpers/load-gl.js";

const FILES = [
  "src/config/constants.js",
  "src/core/utils.js",
  "src/core/calc.js",
  "src/services/import/data.js",
];

describe("services/import/data — rowsToStudents", () => {
  let GL;
  beforeEach(() => {
    resetStorage();
    GL = loadGL(FILES);
  });

  it("đọc ma trận header + điểm thành danh sách học viên", () => {
    const matrix = [
      ["Họ tên", "Đầu giờ", "15 phút", "1 tiết"],
      ["Nguyễn Văn A", "8", "9", "10"],
      ["Trần Thị B", "7,5", "", "6"],
    ];
    const students = GL.rowsToStudents(matrix);
    expect(students.length).toBe(2);
    expect(students[0].scoresByTerm.hk1.dauGio).toEqual([8]);
    expect(students[0].scoresByTerm.hk1.motTiet).toEqual([10]);
    expect(students[1].scoresByTerm.hk1.dauGio).toEqual([7.5]);
    expect(students[1].scoresByTerm.hk1.phut15).toEqual([]);
  });

  it("bỏ dòng trống và dòng không có tên", () => {
    const matrix = [
      ["Họ tên", "Đầu giờ"],
      ["", "9"],
      [],
      ["Lê C", "10"],
    ];
    const students = GL.rowsToStudents(matrix);
    expect(students.length).toBe(1);
    expect(students[0].scoresByTerm.hk1.dauGio).toEqual([10]);
  });

  it("parseScoreCell tách nhiều điểm trong 1 ô", () => {
    expect(GL.parseScoreCell("8; 9; 10")).toEqual([8, 9, 10]);
    expect(GL.parseScoreCell("8,5")).toEqual([8.5]);
    expect(GL.parseScoreCell("")).toEqual([]);
  });
});
