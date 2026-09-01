import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({ test: { environment: "node", exclude: [...configDefaults.exclude, ".codex-demo-clean-deploy/**"] }, resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/server-only.ts") } } });
