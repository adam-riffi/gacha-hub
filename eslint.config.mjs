// Flat config (ESLint 9+). Typed-lint-free on purpose: fast, and typecheck
// already runs separately in CI.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-server/**",
      "**/node_modules/**",
      "api/**", // Vercel entry imports a build artifact via @ts-ignore
      "prisma/**",
      "**/generated/**", // the Prisma client
      "**/*.config.*",
      "apps/web/public/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // Explicit names (ADR 0011): no one- or two-letter names, area by area as each is renamed; x and y stay for
    // coordinates, `id` and `to` are words.
    files: ["packages/shared/src/**/*.ts", "apps/server/src/**/*.ts", "apps/web/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/generated/**"],
    rules: {
      "id-length": ["error", { min: 3, exceptions: ["id", "to", "x", "y", "_", "ok", "at", "on", "up", "of"], properties: "never" }],
    },
  },
  prettier,
);
