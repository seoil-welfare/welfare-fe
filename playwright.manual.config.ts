import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./manual",
  workers: 2,
  fullyParallel: true,
  timeout: 45_000,
  tsconfig: "./tsconfig.app.json",
  outputDir: "test-results/manual",
  reporter: [["list"], ["json", { outputFile: "../사용자매뉴얼/제작자료/capture-results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:4175",
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 1.5,
    isMobile: true, hasTouch: true,
    locale: "ko-KR", timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
