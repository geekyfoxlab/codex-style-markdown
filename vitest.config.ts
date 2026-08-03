import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { obsidian: new URL("./tests/mocks/obsidian.ts", import.meta.url).pathname } },
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"], restoreMocks: true }
});
