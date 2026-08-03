import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["main.js", "dist/", "node_modules/"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: import.meta.dirname },
      globals: { document: "readonly", window: "readonly", navigator: "readonly", HTMLElement: "readonly", HTMLPreElement: "readonly", HTMLImageElement: "readonly", KeyboardEvent: "readonly", MouseEvent: "readonly", PointerEvent: "readonly", WheelEvent: "readonly", MutationObserver: "readonly", Node: "readonly", Element: "readonly", HTMLTableElement: "readonly" }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],
      "@typescript-eslint/no-floating-promises": "error"
    }
  }
);
