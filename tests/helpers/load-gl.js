/**
 * Nạp module IIFE kiểu `window.GL` vào môi trường test (jsdom).
 * Trả về GL mới sạch cho mỗi lần gọi.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const ROOT = path.resolve(__dirname, "..", "..");

// jsdom không có crypto.subtle — dùng WebCrypto của Node
try {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
} catch {
  /* đã có */
}

export function loadGL(files) {
  // jsdom cung cấp window/localStorage/sessionStorage
  window.GL = {};
  for (const rel of files) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    // chạy trong scope global của jsdom
    vm.runInThisContext(code, { filename: rel });
  }
  return window.GL;
}

export function resetStorage() {
  localStorage.clear();
  sessionStorage.clear();
}
