/**
 * 커밋 메시지 형식 검사 (docs/commit-convention.md).
 * .githooks/commit-msg가 커밋할 때마다 부른다. 형식이 틀리면 1로 끝나 커밋이 취소된다.
 *
 * 직접 확인: node scripts/check-commit-msg.mjs --message "feat: 홈 화면 추가"
 */
import { readFileSync } from "node:fs";

const TYPES = ["feat", "fix", "style", "refactor", "docs", "chore", "test"];
const MAX_SUBJECT = 50;

const args = process.argv.slice(2);
const raw = args[0] === "--message" ? (args[1] ?? "") : readFileSync(args[0], "utf8");

// git이 넣는 주석(#)과 앞쪽 빈 줄은 빼고 첫 줄만 본다
const lines = raw.split(/\r?\n/).filter((line) => !line.startsWith("#"));
const subject = (lines.find((line) => line.trim() !== "") ?? "").trim();

// git이 자동으로 만드는 메시지는 그대로 통과시킨다
if (/^(Merge|Revert|fixup!|squash!) /.test(subject)) process.exit(0);

const problems = [];
const match = subject.match(/^([a-z]+)(\([a-z0-9-]+\))?: (.+)$/);

if (!match) {
  problems.push("형식이 '<타입>: <설명>'이 아니에요. 콜론 뒤에 한 칸 띄어 주세요.");
} else {
  const [, type, , description] = match;
  if (!TYPES.includes(type)) {
    problems.push("'" + type + "'은(는) 쓸 수 없는 타입이에요.");
  }
  if ([...description].length > MAX_SUBJECT) {
    problems.push("설명이 " + [...description].length + "자예요. " + MAX_SUBJECT + "자 이내로 줄여 주세요.");
  }
  if (/[.。]$/.test(description)) {
    problems.push("설명 끝에 마침표를 붙이지 않아요.");
  }
}

if (problems.length > 0) {
  console.error("");
  console.error("커밋이 취소됐어요. 커밋 메시지 형식을 확인해 주세요.");
  console.error("");
  console.error("  입력: " + (subject || "(비어 있음)"));
  for (const problem of problems) console.error("  - " + problem);
  console.error("");
  console.error("  형식: <타입>: <무엇을 했는지>");
  console.error("  타입: " + TYPES.join(", "));
  console.error("  예시: feat: 홈 상단 바로가기 카드 추가");
  console.error("  규칙: docs/commit-convention.md");
  console.error("");
  process.exit(1);
}
