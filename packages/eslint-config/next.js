import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import importPlugin from "eslint-plugin-import";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tailwind from "eslint-plugin-tailwindcss";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import pluginNext from "@next/eslint-plugin-next";

export default tseslint.config(
  js.configs.recommended,
  prettierRecommended,
  ...tailwind.configs["flat/recommended"],
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    plugins: {
      turbo: turboPlugin,
      "@next/next": pluginNext,
      "react-hooks": pluginReactHooks,
    },
    settings: {
      tailwindcss: {
        callees: ["cn", "cva"],
        config: "tailwind.config.ts",
      },
      react: { version: "detect" },
      "import/resolver": {
        typescript: {
          project: ["./tsconfig.json"],
        },
      },
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["sibling", "parent"],
            "index",
            "object",
          ],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "@/**", group: "internal" },
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "tailwindcss/classnames-order": "error",
      "tailwindcss/no-custom-classname": "off",
      "react/react-in-jsx-scope": "off",
      ...pluginReactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", ".next/**"],
  },
);
