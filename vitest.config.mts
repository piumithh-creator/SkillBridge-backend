import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 900000, // first run may download a MongoDB binary
    fileParallelism: false
  }
});
