/** 기관 양식 파일 검사 검증 (개발 검증용). 기본 양식을 고쳐 여러 경우를 만든다 */
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { checkReportForm } from "@/lib/export/reportFormCheck";

const problems: string[] = [];

function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

function load(path: string): ArrayBuffer {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

const DAILY = load("src/assets/forms/daily-record.template.docx");
const MONTHLY = load("src/assets/forms/monthly-record.template.docx");

/** 기본 양식의 본문 글자를 바꿔 새 양식을 만든다 */
function variant(template: ArrayBuffer, edit: (xml: string) => string): ArrayBuffer {
  const zip = new PizZip(template);
  zip.file("word/document.xml", edit(zip.file("word/document.xml")!.asText()));
  return zip.generate({ type: "arraybuffer" });
}

const show = (r: ReturnType<typeof checkReportForm>) =>
  (r.ok ? "등록 가능" : "막힘: " + r.errors.join(" / ")) + (r.unknownTags.length ? " · 모르는 칸: " + r.unknownTags.join(", ") : "");

console.log("[기본 양식]");
{
  const daily = checkReportForm("일별.docx", DAILY, "daily");
  expect("일별 기본 양식 통과", daily.ok && daily.unknownTags.length === 0, show(daily) + " · 채우는 칸 " + daily.filled.length);
  const monthly = checkReportForm("월별.docx", MONTHLY, "monthly");
  expect("월별 기본 양식 통과", monthly.ok && monthly.unknownTags.length === 0, show(monthly) + " · 채우는 칸 " + monthly.filled.length);
  const swapped = checkReportForm("일별.docx", DAILY, "monthly");
  expect("일별 양식을 월별로 올리면 모르는 칸 안내", swapped.unknownTags.length > 0, show(swapped));
}

console.log("[한글 표시]");
{
  const korean = variant(DAILY, (x) =>
    x.replace("{clientName}", "{이용자이름}").replace("{#activities}", "{#활동}").replace("{/activities}", "{/활동}")
      .replace("{participation}", "{참여활동}"),
  );
  const r = checkReportForm("기관양식.docx", korean, "daily");
  expect("한글 표시 양식 통과", r.ok && r.unknownTags.length === 0 && r.filled.includes("활동.참여활동"), show(r));
}

console.log("[경고]");
{
  const meal = variant(DAILY, (x) => x.replace("{weather}", "{weather} {식사량}"));
  const r = checkReportForm("식사량.docx", meal, "daily");
  expect("모르는 칸은 경고만", r.ok && r.unknownTags.includes("식사량"), show(r));
}

console.log("[막는 경우]");
{
  const unclosed = variant(DAILY, (x) => x.replace("{clientName}", "{clientName"));
  const r1 = checkReportForm("a.docx", unclosed, "daily");
  expect("닫는 괄호 없음", !r1.ok && r1.errors.some((e) => e.includes("닫는 괄호")), show(r1));

  const loop = variant(DAILY, (x) => x.replace("{/activities}", ""));
  const r2 = checkReportForm("b.docx", loop, "daily");
  expect("반복 짝 없음", !r2.ok && r2.errors.some((e) => e.includes("짝")), show(r2));

  const empty = variant(DAILY, (x) => x.replace(/\{[^{}<>]*\}/g, ""));
  const r3 = checkReportForm("c.docx", empty, "daily");
  expect("채울 칸 없음", !r3.ok && r3.errors[0].includes("하나도 없어요"), show(r3));

  const r4 = checkReportForm("기관양식.hwp", DAILY, "daily");
  expect("hwp 파일", !r4.ok && r4.errors[0].includes("한글(hwp)"), show(r4));

  const r5 = checkReportForm("가짜.docx", new TextEncoder().encode("not a zip").buffer as ArrayBuffer, "daily");
  expect("이름만 docx", !r5.ok && r5.errors[0].includes("Word(docx) 파일이 아니에요"), show(r5));

  const r6 = checkReportForm("큰파일.docx", new ArrayBuffer(6 * 1024 * 1024), "daily");
  expect("5MB 초과", !r6.ok && r6.errors[0].includes("5MB"), show(r6));
}

console.log("");
console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
process.exit(problems.length === 0 ? 0 : 1);
