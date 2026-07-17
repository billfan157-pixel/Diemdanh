/** Cột điểm (định nghĩa trong src/config/constants.js). */
interface GLColumn {
  key: string;
  label: string;
  short: string;
  defaultWeight: number;
}

interface GLTerm {
  key: "hk1" | "hk2" | "year";
  label: string;
  short?: string;
}

type GLTermScores = import("./types.js").TermScores;
type GLStudent = import("./types.js").Student;

/**
 * Namespace toàn cục của app — các IIFE gắn hàm/state vào đây.
 * Khai báo dần các member đã được type-check; phần còn lại qua index signature.
 */
interface GLNamespace {
  // config/constants.js
  COLS: GLColumn[];
  TERMS: GLTerm[];
  activeTerm: "hk1" | "hk2" | "year";

  // core/calc.js
  defaultWeights(): Record<string, number>;
  emptyScores(): GLTermScores;
  cloneScores(src: GLTermScores | null | undefined): GLTermScores;
  ensureStudentTerms(st: GLStudent | null | undefined): GLStudent;
  getScores(st: GLStudent, term?: string): GLTermScores;
  studentTBContext(
    student: GLStudent,
    weights: Record<string, number>,
    term?: string
  ): number | null;
  colAvg(scores: number[] | null | undefined): number | null;
  studentTB(
    student: GLStudent,
    weights: Record<string, number>,
    term?: string
  ): number | null;
  YEAR_WEIGHTS: { hk1: number; hk2: number };
  studentYearTB(
    student: GLStudent,
    weights: Record<string, number>
  ): number | null;
  termLabel(term?: string): string;
  yearFormulaText(): string;
  classify(avg: number | null | undefined): {
    label: string;
    rank: string;
    score: string;
  };

  // các member chưa được khai báo chi tiết
  [key: string]: unknown;
}

interface Window {
  GL: GLNamespace;
  XLSX: unknown;
  JSZip: unknown;
  supabase: { createClient: (...args: unknown[]) => unknown };
}
