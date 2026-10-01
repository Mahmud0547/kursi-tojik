import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: { input: { tj: "index.html", ru: "ru/index.html", en: "en/index.html" } },
  },
});
