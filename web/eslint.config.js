import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "index.html", "ru/", "en/", "public/sw.js", "test-results/", "playwright-report/", ".lighthouseci/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/no-non-null-assertion": "off" } },
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: globals.node } },
);
