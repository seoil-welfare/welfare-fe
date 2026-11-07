import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  tsconfig: "./tsconfig.app.json",
  fullyParallel: true,
  workers: 4,
  timeout: 30_000,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure", timezoneId: "Asia/Seoul" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
