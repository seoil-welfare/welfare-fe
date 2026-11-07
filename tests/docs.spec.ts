import { test, expect } from "./fixtures";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const readme = readFileSync("README.md", "utf8");
const references = [
  [".env.example", "VITE_API_PROXY_TARGET"], ["scripts/prepare.mjs", "ZIP"], ["tests/", "test:qa"],
  ["src/app/useStatsSummary.ts", "useStatsSummary"], ["src/services/statsService.ts", "일요일~토요일 7일"],
  ["src/services/diaryService.ts", "behaviorEntries"], ["src/assets/forms/", "일별활동일지.docx"],
  ["src/api/types.ts", "서버 계약"], ["docs/backend-integration.md", "임시저장"], ["vite.config.ts", "PWA"],
];
for (const [path, text] of references) test(`12-04 문서 참조와 현재 규칙 ${path}`, () => {
  expect(existsSync(resolve(path))).toBeTruthy();
  expect(readme).toContain(text);
  expect(readme).not.toContain("실제로 저장하지 않음");
  expect(readme).not.toContain("useStatsDiaries");
  expect(readme).not.toContain("C:\\Users\\lante");
  expect(readme).not.toContain("cd project\\front");
});
