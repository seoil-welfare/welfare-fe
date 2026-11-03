/** 일일 기록지 출력 값 검증 (개발 검증용). 모든 이름·생년월일은 가상 데이터다 */
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { generateFixtures, SERVICE_USERS } from "@/data/fixtures";
import { DOCX_MIME, renderDailyRecordBundleDocx, renderDailyRecordDocx } from "@/lib/dailyRecordDocx";
import { dailyRecordData, dailyRecordFileName, diaryBundleFileName } from "@/services/dailyRecordService";
import type { Diary, ServiceUser } from "@/types";

const problems: string[] = [];

function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

const client: ServiceUser = {
  id: "u-check",
  name: "가상이용자 A",
  birthDate: "2001-03-05",
  assignedStaffId: "s-check",
  status: "active",
};

const base = {
  participation: [],
  detail: "",
  preSupport: [],
  reaction: [],
  positiveSupport: [],
  hasBehavior: false,
  behaviors: [],
};

const diary: Diary = {
  id: "d-check",
  userId: client.id,
  date: "2026-09-21",
  authorId: "s-check",
  status: "completed",
  weather: "맑음",
  condition: "기타",
  conditionOther: "졸려 함",
  notes: "가상 특이사항",
  createdAt: "2026-09-21T17:00:00+09:00",
  updatedAt: "2026-09-21T17:00:00+09:00",
  // 일부러 시간 역순으로 넣어 정렬을 확인한다
  activities: [
    {
      ...base,
      id: "a2",
      startTime: "11:30",
      endTime: "12:00",
      participation: ["체육활동"],
      reaction: ["부분적 참여"],
      hasBehavior: true,
      behaviors: [
        { type: "destruction", detailIds: ["ds-1", "ds-other"], otherText: "책상 밀기" },
        { type: "other", detailIds: [], otherText: "소리 지르기" },
      ],
    },
    {
      ...base,
      id: "a1",
      startTime: "10:00",
      endTime: "10:30",
      participation: ["예술활동", "기타"],
      participationOther: "산책",
      preSupport: ["활동안내", "모델링"],
      detail: "색종이 꾸미기",
    },
  ],
};

console.log("[머리말]");
const data = dailyRecordData(diary, client);
expect("이용자 이름", data.clientName === "가상이용자 A", data.clientName);
expect("생년월일 6자리", data.birth6 === "010305", data.birth6);
expect(
  "작성일·요일",
  data.year === 2026 && data.month === 9 && data.day === 21 && data.weekday === "월",
  `${data.year}-${data.month}-${data.day} ${data.weekday}`,
);
expect("컨디션 기타(입력값)", data.condition === "기타(졸려 함)", data.condition);
expect("특이사항", data.notes === "가상 특이사항", data.notes);

console.log("[파일 이름]");
const fileName = dailyRecordFileName(diary, client);
expect("이용자이름_날짜_일일기록지.docx", fileName === "가상이용자 A_2026-09-21_일일기록지.docx", fileName);
const oddName = dailyRecordFileName(diary, { ...client, name: "가상/이용자:B" });
expect("파일 이름에 못 쓰는 글자는 _로", oddName === "가상_이용자_B_2026-09-21_일일기록지.docx", oddName);

console.log("[활동 표]");
const [first, second] = data.activities;
expect("활동 수만큼 줄", data.activities.length === 2, data.activities.length + "줄");
expect("시작 시간순 정렬", first.time === "10:00\n~\n10:30", JSON.stringify(first.time));
expect("여러 값은 줄바꿈, 기타(입력값)", first.participation === "예술활동\n기타(산책)", JSON.stringify(first.participation));
expect("사전지원 여러 값", first.preSupport === "활동안내\n모델링", JSON.stringify(first.preSupport));
expect("도전적 행동 없음 체크", first.noneMark === "■" && first.someMark === "□" && first.behaviors === "", first.noneMark + first.someMark);
expect("도전적 행동 있음 체크", second.noneMark === "□" && second.someMark === "■", second.noneMark + second.someMark);
expect(
  "도전적 행동 '영역 - 항목'",
  second.behaviors === "파괴행동 - 물건 던지기\n파괴행동 - 기타(책상 밀기)\n기타(소리 지르기)",
  JSON.stringify(second.behaviors),
);

console.log("[가상 데이터 전체]");
// 시연용 일지 전부를 바꿔 봐도 예외 없이 활동 수만큼 줄이 나오는지
const { diaries } = generateFixtures();
const completed = diaries.filter((d) => d.status === "completed");
const mismatched = completed.filter((d) => {
  const user = SERVICE_USERS.find((u) => u.id === d.userId);
  return !user || dailyRecordData(d, user).activities.length !== d.activities.length;
});
expect("작성 완료 일지 전부 변환", completed.length > 0 && mismatched.length === 0, completed.length + "건 중 불일치 " + mismatched.length + "건");

/** 실제 템플릿 파일에 값을 채워 만든 docx 안의 본문 XML을 확인한다 */
async function checkRenderedDocx() {
  console.log("[docx 파일]");
  const template = readFileSync("src/assets/forms/daily-record.template.docx");
  const blob = renderDailyRecordDocx(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength), data);
  const xml = new PizZip(await blob.arrayBuffer()).file("word/document.xml")?.asText() ?? "";
  const text = [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");

  expect("파일 형식", blob.type === DOCX_MIME, blob.type);
  expect("남은 자리표시자 없음", !/[{}]/.test(text), text.match(/\{[^}]*\}/)?.[0] ?? "없음");
  expect("머리말 값 채움", text.includes("가상이용자 A") && text.includes("010305") && text.includes("2026년  9월  21일  월요일"), "이름·생년월일·작성일");
  // 머리말 2줄 + 활동 표(제목 1줄 + 활동 2줄) + 특이사항 1줄
  const rows = xml.match(/<w:tr[ >]/g)?.length ?? 0;
  expect("활동 수만큼 표 줄 생성", rows === 6, rows + "줄");
  expect("줄바꿈은 Word 줄바꿈으로", xml.includes("<w:br/>") && !text.includes("\n"), "<w:br/> 사용");
  expect("도전적 행동 내용", text.includes("파괴행동 - 물건 던지기"), "영역 - 항목");
}

/** 여러 건을 한 파일로 만들 때 일지마다 표가 반복되고, 두 번째부터 새 페이지에서 시작하는지 확인한다 */
async function checkBundleDocx() {
  console.log("[일지 모음 docx]");
  const template = readFileSync("src/assets/forms/daily-record.template.docx");
  const records = ["2026-09-21", "2026-09-22", "2026-09-24"].map((date) => dailyRecordData({ ...diary, date }, client));
  const blob = renderDailyRecordBundleDocx(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength), records);
  const xml = new PizZip(await blob.arrayBuffer()).file("word/document.xml")?.asText() ?? "";
  const text = [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");

  const tables = xml.match(/<w:tbl>/g)?.length ?? 0;
  const singleTables = 3; // 양식 1장 = 머리말·활동·특이사항 표 3개
  expect("일지 수만큼 양식 반복", tables === singleTables * records.length, tables + "개 표");
  expect("페이지 나누기는 일지 사이에만", (xml.match(/w:type="page"/g)?.length ?? 0) === records.length - 1, "일지 3건 → 2개");
  expect("남은 자리표시자 없음", !/[{}]/.test(text), text.match(/\{[^}]*\}/)?.[0] ?? "없음");
  expect("날짜마다 머리말", ["21일", "22일", "24일"].every((day) => text.includes("9월  " + day)), "9/21, 9/22, 9/24");
  expect("본문 끝 구역 설정 유지", xml.trimEnd().endsWith("</w:sectPr></w:body></w:document>"), "가로 A4 설정");

  const fileName = diaryBundleFileName(client, "2026-09-01", "2026-09-30");
  expect("이용자이름_기간_일지모음.docx", fileName === "가상이용자 A_2026-09-01~2026-09-30_일지모음.docx", fileName);
}

checkRenderedDocx()
  .then(checkBundleDocx)
  .catch((error) => {
    console.log("  FAIL docx 생성 — " + error);
    problems.push("docx 생성");
  })
  .finally(() => {
    console.log("");
    console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
    process.exit(problems.length === 0 ? 0 : 1);
  });
