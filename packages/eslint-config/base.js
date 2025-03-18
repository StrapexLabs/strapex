import js from "@eslint/js"
import prettierRecommended from "eslint-plugin-prettier/recommended"
import importPlugin from "eslint-plugin-import"
import turboPlugin from "eslint-plugin-turbo"
import tseslint from "typescript-eslint"

export default tseslint.config(
  js.configs.recommended,
  prettierRecommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
    plugins: {
      turbo: turboPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json", "apps/*/tsconfig.json", "packages/*/tsconfig.json"],
        },
      },
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["sibling", "parent"], "index", "object"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
)
