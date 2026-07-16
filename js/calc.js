/**
 * Tính điểm: TB cột, TB có hệ số, xếp loại, học kỳ.
 */
(function (GL) {
  "use strict";

  GL.defaultWeights = function defaultWeights() {
    var w = {};
    GL.COLS.forEach(function (c) {
      w[c.key] = c.defaultWeight;
    });
    return w;
  };

  GL.emptyScores = function emptyScores() {
    var s = {};
    GL.COLS.forEach(function (c) {
      s[c.key] = [];
    });
    return s;
  };

  /** Clone object điểm các cột */
  GL.cloneScores = function cloneScores(src) {
    var out = GL.emptyScores();
    if (!src) return out;
    GL.COLS.forEach(function (c) {
      out[c.key] = Array.isArray(src[c.key]) ? src[c.key].slice() : [];
    });
    return out;
  };

  /**
   * Đảm bảo học viên có scoresByTerm.hk1 / hk2.
   * Dữ liệu cũ (st.scores phẳng) → chuyển vào HK1.
   */
  GL.ensureStudentTerms = function ensureStudentTerms(st) {
    if (!st) return st;
    if (!st.scoresByTerm || typeof st.scoresByTerm !== "object") {
      st.scoresByTerm = {
        hk1: GL.emptyScores(),
        hk2: GL.emptyScores(),
      };
    }
    if (!st.scoresByTerm.hk1) st.scoresByTerm.hk1 = GL.emptyScores();
    if (!st.scoresByTerm.hk2) st.scoresByTerm.hk2 = GL.emptyScores();

    // migrate flat scores → HK1 (chỉ 1 lần)
    if (st.scores && typeof st.scores === "object") {
      var hasFlat = GL.COLS.some(function (c) {
        return st.scores[c.key] && st.scores[c.key].length;
      });
      var hk1Empty = !GL.COLS.some(function (c) {
        return st.scoresByTerm.hk1[c.key] && st.scoresByTerm.hk1[c.key].length;
      });
      if (hasFlat && hk1Empty) {
        st.scoresByTerm.hk1 = GL.cloneScores(st.scores);
      }
      delete st.scores;
    }

    // đảm bảo mỗi cột là mảng
    ["hk1", "hk2"].forEach(function (term) {
      GL.COLS.forEach(function (c) {
        if (!Array.isArray(st.scoresByTerm[term][c.key])) {
          st.scoresByTerm[term][c.key] = [];
        }
      });
    });

    return st;
  };

  /** Lấy object điểm theo học kỳ (mặc định kỳ đang chọn; year → hk1 chỉ để đọc an toàn) */
  GL.getScores = function getScores(st, term) {
    GL.ensureStudentTerms(st);
    term = term || GL.activeTerm || "hk1";
    if (term !== "hk1" && term !== "hk2") term = "hk1";
    return st.scoresByTerm[term];
  };

  /** TB theo ngữ cảnh: year → TB cả năm */
  GL.studentTBContext = function studentTBContext(student, weights, term) {
    term = term || GL.activeTerm || "hk1";
    if (term === "year") return GL.studentYearTB(student, weights);
    return GL.studentTB(student, weights, term);
  };

  GL.colAvg = function colAvg(scores) {
    if (!scores || !scores.length) return null;
    return (
      scores.reduce(function (a, b) {
        return a + b;
      }, 0) / scores.length
    );
  };

  /** TB có trọng số — theo học kỳ (mặc định kỳ đang chọn) */
  GL.studentTB = function studentTB(student, weights, term) {
    var bag = GL.getScores(student, term);
    var sum = 0;
    var wSum = 0;
    for (var i = 0; i < GL.COLS.length; i++) {
      var col = GL.COLS[i];
      var avg = GL.colAvg(bag[col.key]);
      if (avg == null) continue;
      var w = Number(weights[col.key]) || 0;
      if (w <= 0) continue;
      sum += avg * w;
      wSum += w;
    }
    return wSum === 0 ? null : sum / wSum;
  };

  /**
   * TB cả năm = (TB HK1 × hs1 + TB HK2 × hs2) / (hs1 + hs2)
   * Mặc định: HK1 ×1, HK2 ×2 → (TB1 + 2×TB2) / 3
   * Nếu thiếu 1 kỳ: chỉ lấy TB kỳ còn lại (không nhân hệ số chéo).
   */
  GL.YEAR_WEIGHTS = { hk1: 1, hk2: 2 };

  GL.studentYearTB = function studentYearTB(student, weights) {
    var t1 = GL.studentTB(student, weights, "hk1");
    var t2 = GL.studentTB(student, weights, "hk2");
    var w1 = Number(GL.YEAR_WEIGHTS.hk1) || 1;
    var w2 = Number(GL.YEAR_WEIGHTS.hk2) || 2;
    if (t1 == null && t2 == null) return null;
    if (t1 == null) return t2;
    if (t2 == null) return t1;
    return (t1 * w1 + t2 * w2) / (w1 + w2);
  };

  GL.termLabel = function termLabel(term) {
    term = term || GL.activeTerm || "hk1";
    var t = GL.TERMS.find(function (x) {
      return x.key === term;
    });
    return t ? t.label : term;
  };

  /** Công thức mô tả TB cả năm */
  GL.yearFormulaText = function yearFormulaText() {
    var w1 = Number(GL.YEAR_WEIGHTS.hk1) || 1;
    var w2 = Number(GL.YEAR_WEIGHTS.hk2) || 2;
    return (
      "TB cả năm = (TB HK1 × " +
      w1 +
      " + TB HK2 × " +
      w2 +
      ") / " +
      (w1 + w2) +
      "  ·  nếu thiếu 1 kỳ thì lấy TB kỳ còn lại"
    );
  };

  GL.classify = function classify(avg) {
    if (avg == null) {
      return { label: "Chưa đủ điểm", rank: "rank-none", score: "score-none" };
    }
    if (avg >= 9) return { label: "Xuất sắc", rank: "rank-xs", score: "score-xs" };
    if (avg >= 8) return { label: "Giỏi", rank: "rank-g", score: "score-g" };
    if (avg >= 6.5) return { label: "Khá", rank: "rank-k", score: "score-k" };
    if (avg >= 5) return { label: "Trung bình", rank: "rank-tb", score: "score-tb" };
    return { label: "Yếu", rank: "rank-y", score: "score-y" };
  };
})(window.GL = window.GL || {});
