import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** 배포 빌드의 실제 JS·DOCX 자산으로 출력 경로를 검증한다. */
export default defineConfig({
  ...base,
  reporter: [["list"], ["json", { outputFile: "test-results/preview-results.json" }]],
  outputDir: "test-results/preview",
  use: { ...base.use, baseURL: "http://127.0.0.1:4174" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
