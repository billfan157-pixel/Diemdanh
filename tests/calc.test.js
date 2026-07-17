import { describe, it, expect, beforeEach } from "vitest";
import { loadGL, resetStorage } from "./helpers/load-gl.js";

const FILES = ["src/config/constants.js", "src/core/utils.js", "src/core/calc.js"];

describe("core/calc", () => {
  let GL;
  beforeEach(() => {
    resetStorage();
    GL = loadGL(FILES);
  });

  it("defaultWeights có đủ mọi cột với hệ số mặc định", () => {
    const w = GL.defaultWeights();
    for (const c of GL.COLS) expect(w[c.key]).toBe(c.defaultWeight);
  });

  it("colAvg tính trung bình cột, bỏ qua giá trị không hợp lệ", () => {
    expect(GL.colAvg([8, 9, 10])).toBeCloseTo(9);
    expect(GL.colAvg([])).toBeNull();
  });

  it("ensureStudentTerms migrate điểm phẳng cũ vào HK1", () => {
    const st = { name: "A", scores: { dauGio: [7, 9] } };
    GL.ensureStudentTerms(st);
    expect(st.scores).toBeUndefined();
    expect(st.scoresByTerm.hk1.dauGio).toEqual([7, 9]);
    expect(st.scoresByTerm.hk2.dauGio).toEqual([]);
  });

  it("studentTB tính TB có hệ số theo học kỳ", () => {
    const st = { name: "A" };
    GL.ensureStudentTerms(st);
    st.scoresByTerm.hk1.dauGio = [8];
    st.scoresByTerm.hk1.motTiet = [10];
    const w = GL.defaultWeights();
    // (8*1 + 10*2) / 3 ≈ 9.33
    expect(GL.studentTB(st, w, "hk1")).toBeCloseTo(28 / 3, 5);
    expect(GL.studentTB(st, w, "hk2")).toBeNull();
  });

  it("classify xếp loại đúng ngưỡng", () => {
    expect(GL.classify(9.5).label).toBeTruthy();
    expect(GL.classify(null).label).toBeDefined();
    const good = GL.classify(9);
    const weak = GL.classify(2);
    expect(good.label).not.toBe(weak.label);
  });

  it("parseScore chấp nhận số hợp lệ 0–10", () => {
    expect(GL.parseScore("8,5")).toBe(8.5);
    expect(GL.parseScore("11")).toBeNull();
    expect(GL.parseScore("abc")).toBeNull();
  });
});
