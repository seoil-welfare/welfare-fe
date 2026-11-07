/** 월간 기록(월별활동일지) 출력 값 검증 (개발 검증용). 모든 이름은 가상 데이터다 */
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { generateFixtures, SERVICE_USERS } from "./fixtures";
import { DOCX_MIME } from "@/lib/export/dailyRecordDocx";
import { MONTHLY_IMAGE_PATHS, renderMonthlyRecordDocx } from "@/lib/export/monthlyRecordDocx";
import {
  behaviorTotals,
  monthlyRecordData,
  monthlyRecordFileName,
  monthRange,
} from "@/services/monthlyRecordService";
import type { Activity, Diary, ServiceUser } from "@/types";

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

const base: Activity = {
  id: "a",
  participation: [],
  detail: "",
  preSupport: [],
  reaction: [],
  positiveSupport: [],
  hasBehavior: false,
  behaviors: [],
};

function diary(date: string, activities: Partial<Activity>[], extra: Partial<Diary> = {}): Diary {
  return {
    id: "d-" + date,
    userId: client.id,
    date,
    authorId: "s-check",
    status: "completed",
    weather: "맑음",
    condition: "양호",
    notes: "",
    createdAt: date + "T17:00:00+09:00",
    updatedAt: date + "T17:00:00+09:00",
    activities: activities.map((a, i) => ({ ...base, id: "a" + i, ...a })),
    ...extra,
  };
}

const diaries: Diary[] = [
  // 10/2: 예술활동 2번 > 체육활동 1번. 반응은 적극적 1 · 안정적 1로 같으면 선택지 순서(적극적)가 앞선다
  diary("2026-10-02", [
    { participation: ["예술활동"], preSupport: ["모델링"], reaction: ["적극적 참여"] },
    { participation: ["예술활동", "체육활동"], preSupport: ["모델링", "휴식"], reaction: ["안정적 참여"] },
  ]),
  // 10/5: '기타'가 가장 많으면 적은 내용을 붙인다. 컨디션 기타도 같다
  diary(
    "2026-10-05",
    [
      { participation: ["기타"], participationOther: "산책", preSupport: ["없음"], reaction: ["부분적 참여"] },
    ],
    { condition: "기타", conditionOther: "수면 부족" },
  ),
  // 10/17: 도전적 행동. 꼬집기는 자해·타해 둘 다 있어 영역을 붙인다. 상위 '기타'는 내용이 있을 때만 센다
  diary("2026-10-17", [
    {
      participation: ["체육활동"],
      reaction: ["적극적 참여"],
      hasBehavior: true,
      behaviors: [
        { type: "selfHarm", detailIds: ["sh-1", "sh-9"] },
        { type: "other", detailIds: [], otherText: "소리 지르기" },
      ],
    },
    {
      participation: ["체육활동"],
      reaction: ["안정적 참여"],
      hasBehavior: true,
      behaviors: [
        { type: "selfHarm", detailIds: ["sh-1"] },
        { type: "other", detailIds: [], otherText: "  " },
      ],
    },
  ]),
];

console.log("[기간·파일 이름]");
expect("10월 첫날·말일", JSON.stringify(monthRange(2026, 10)) === '{"from":"2026-10-01","to":"2026-10-31"}', JSON.stringify(monthRange(2026, 10)));
expect("2월 말일", monthRange(2028, 2).to === "2028-02-29", monthRange(2028, 2).to);
expect("파일 이름", monthlyRecordFileName(client, 2026, 9) === "가상이용자 A_2026-09_월별활동일지.docx", monthlyRecordFileName(client, 2026, 9));

console.log("[일별 표]");
const data = monthlyRecordData(diaries, client, 2026, 10);
expect("앞 표 1~16일", data.firstHalf.length === 16 && data.firstHalf[15].day === 16, data.firstHalf.length + "줄");
expect("뒤 표 17~31일", data.secondHalf.length === 15 && data.secondHalf[14].day === 31, data.secondHalf.length + "줄");
const nov = monthlyRecordData([], client, 2026, 11);
expect("30일인 달은 뒤 표 14줄", nov.secondHalf.length === 14, nov.secondHalf.length + "줄");

const d2 = data.firstHalf[1];
expect("대표 활동 = 가장 많이 고른 것", d2.activity === "예술활동", d2.activity);
expect("주요 지원 = 가장 많이 고른 것", d2.support === "모델링", d2.support);
expect("반응이 같으면 선택지 순서", d2.reaction === "적극적 참여", d2.reaction);
expect("지원 결과를 추정하지 않음", !("result" in d2), JSON.stringify(d2));
expect("행동 없는 날", d2.behaviors === "-" && d2.count === 0, d2.behaviors + " / " + d2.count);

const d5 = data.firstHalf[4];
expect("기타(내용)", d5.activity === "기타(산책)" && d5.condition === "기타(수면 부족)", d5.activity + " · " + d5.condition);
expect("주요 지원 '없음'도 그대로", d5.support === "없음", d5.support);
expect("부분적 참여를 그대로 출력", d5.reaction === "부분적 참여", d5.reaction);

const d1 = data.firstHalf[0];
expect("일지 없는 날은 날짜만", d1.day === 1 && d1.activity === "" && d1.count === "", JSON.stringify(d1));

const d17 = data.secondHalf[0];
expect("행동 선택 기록만 출력", d17.remarks.includes("행동 선택 기록:") && !d17.remarks.includes("재참여"), d17.remarks);
expect("행동 항목별 건수·영역", d17.behaviors === "자해 머리 때리기 2건, 자해 꼬집기 1건, 기타(소리 지르기) 1건", d17.behaviors);
expect("당일 총횟수 (빈 상위 기타 제외)", d17.count === 4, String(d17.count));

console.log("[월간 요약]");
expect("참여활동 요약", data.summaryParticipation === "참여 활동 선택 기록: 체육활동 3건·예술활동 2건·기타 1건. 가장 많이 선택한 반응: 적극적 참여.", data.summaryParticipation);
expect("지원방법 요약", data.summarySupport === "사전 지원 선택 기록: 모델링 2건·휴식 1건.", data.summarySupport);
expect("특이사항 요약", data.summaryNotes === "도전적 행동 선택 기록 1일, 총 4건 (자해 머리 때리기 2건, 자해 꼬집기 1건, 기타(소리 지르기) 1건).", data.summaryNotes);
expect("기록 없는 평가 필드 제거", !("summaryCaution" in data) && !("summaryOverall" in data), "없는 항목 제거");
expect("일지 없는 달", nov.summaryNotes === "" && nov.summaryParticipation === "", nov.summaryNotes);
expect("월간 누적 많은 순", JSON.stringify(behaviorTotals(diaries).map((t) => t.count)) === "[2,1,1]", JSON.stringify(behaviorTotals(diaries)));

console.log("[가상 데이터 전체]");
const { diaries: all } = generateFixtures();
const completed = all.filter((d) => d.status === "completed");
let rows = 0;
for (const user of SERVICE_USERS) {
  const mine = completed.filter((d) => d.userId === user.id && d.date.startsWith("2026-09"));
  const month = monthlyRecordData(mine, user, 2026, 9);
  rows += [...month.firstHalf, ...month.secondHalf].filter((r) => r.activity !== "").length;
}
const expected = completed.filter((d) => d.date.startsWith("2026-09") && d.activities.length > 0).length;
expect("9월 일지마다 대표 활동", rows === expected, rows + "줄 / 일지 " + expected + "건");

/** 실제 템플릿 파일에 값을 채워 만든 docx를 확인한다. 그림은 가짜 PNG로 바꿔 끼워 본다 */
async function checkRenderedDocx() {
  console.log("[docx 파일]");
  const template = readFileSync("src/assets/forms/monthly-record.template.docx");
  const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const blob = renderMonthlyRecordDocx(
    template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength),
    data,
    { totals: fakePng, chart: fakePng },
  );
  const zip = new PizZip(await blob.arrayBuffer());
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const text = [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");

  expect("파일 형식", blob.type === DOCX_MIME, blob.type);
  expect("남은 자리표시자 없음", !/[{}]/.test(text), text.match(/\{[^}]*\}/)?.[0] ?? "없음");
  expect("머리말 (글상자 두 벌)", (text.match(/가상이용자 A/g)?.length ?? 0) === 2 && text.includes("2026년 10월"), "이름·작성월");
  expect("양식 예시 이름이 남지 않음", !text.includes("김OO") && !text.includes("박OO"), "김OO·박OO 없음");
  expect("중복 글상자 없이 실제 머리말", !xml.includes("<w:txbxContent>") && text.includes("이용자: 가상이용자 A"), "일반 문단 머리말");
  const tableRows = xml.match(/<w:tr[ >]/g)?.length ?? 0;
  expect("표 줄 = 머리글 2 + 31일", tableRows === 33, tableRows + "줄");
  expect("요약 문장", text.includes(data.summaryParticipation), "실제 선택 건수");
  expect("양식 예시 요약이 남지 않음", !text.includes("전반적으로") && !text.includes("효과적이었고"), "예시 문장 없음");
  const swapped = [MONTHLY_IMAGE_PATHS.totals, MONTHLY_IMAGE_PATHS.chart].every(
    (path) => zip.file(path)?.asUint8Array().length === fakePng.length,
  );
  expect("그림 2개 바꿔 끼움", swapped, "image1·image2");
}

checkRenderedDocx()
  .catch((error) => {
    console.log("  FAIL docx 생성 — " + error);
    problems.push("docx 생성");
  })
  .finally(() => {
    console.log("");
    console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
    process.exit(problems.length === 0 ? 0 : 1);
  });
