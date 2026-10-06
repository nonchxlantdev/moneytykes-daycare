import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
    // node:sqlite (used only by the in-memory test database) prints an experimental warning.
    execArgv: ["--no-warnings=ExperimentalWarning"],
  },
});
