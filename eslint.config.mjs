import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "supabase/.temp/**", "legacy-prototype/**", "public/legacy-prototype/**"]),
  nextPlugin.flatConfig.coreWebVitals,
  { files: ["**/*.{ts,tsx}"], languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { "no-console": "error" } },
]);
