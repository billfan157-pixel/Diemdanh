import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages phục vụ ở /Diemdanh/ — dùng đường dẫn tương đối cho mọi asset
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 1500, // xlsx là bundle lớn
  },
  server: {
    port: 8080,
  },
  preview: {
    port: 8080,
  },
});
