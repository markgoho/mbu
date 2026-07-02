import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["lib/**", "**/*.test.ts", "src/test-utils/**", "vitest.config.ts"],
  },
  {
    files: ["**/*.ts"],
    ...eslint.configs.recommended,
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ["**/*.ts"],
  })),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
