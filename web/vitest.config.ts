import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Vitest 4 exits with code 1 when no test files match by default.
    // No test files exist yet in this task (they land in later TDD tasks),
    // so this keeps `npm test` green until real specs are added.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
