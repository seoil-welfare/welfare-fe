/** 월간 기록(월별활동일지) 출력 값 검증 (개발 검증용). 모든 이름은 가상 데이터다 */
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { generateFixtures, SERVICE_USERS } from "@/data/fixtures";
import { DOCX_MIME } from "@/lib/export/dailyRecordDocx";
import { MONTHLY_IMAGE_PATHS, renderMonthlyRecordDocx } from "@/lib/export/monthlyRecordDocx";
import {
  BEHAVIOR_RESULT,
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
expect("파일 이름", monthlyRecordFileName(client, 2026, 9) === "가상이용자 A_2026-09_월간기록.docx", monthlyRecordFileName(client, 2026, 9));

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
expect("지원 결과는 반응에서", d2.result === "자발적 참여·활동 지속", d2.result);
expect("행동 없는 날", d2.behaviors === "-" && d2.count === 0, d2.behaviors + " / " + d2.count);

const d5 = data.firstHalf[4];
expect("기타(내용)", d5.activity === "기타(산책)" && d5.condition === "기타(수면 부족)", d5.activity + " · " + d5.condition);
expect("주요 지원 '없음'도 그대로", d5.support === "없음", d5.support);
expect("부분적 참여 → 추가 안내 후 활동 지속", d5.result === "추가 안내 후 활동 지속", d5.result);

const d1 = data.firstHalf[0];
expect("일지 없는 날은 날짜만", d1.day === 1 && d1.activity === "" && d1.count === "", JSON.stringify(d1));

const d17 = data.secondHalf[0];
expect("행동 있는 날 지원 결과", d17.result === BEHAVIOR_RESULT, d17.result);
expect("행동 항목별 횟수", d17.behaviors === "머리 때리기 2회, 자해 꼬집기 1회, 소리 지르기 1회", d17.behaviors);
expect("당일 총횟수 (빈 상위 기타 제외)", d17.count === 4, String(d17.count));

console.log("[월간 요약]");
expect("참여활동 요약", data.summaryParticipation === "체육활동·예술활동·기타 참여가 많았음. 가장 많은 반응은 적극적 참여.", data.summaryParticipation);
expect("지원방법 요약", data.summarySupport === "자주 사용한 사전 지원은 모델링·휴식.", data.summarySupport);
expect("특이사항 요약", data.summaryNotes === "도전적 행동 1일, 총 4회 (머리 때리기 2회, 자해 꼬집기 1회, 소리 지르기 1회).", data.summaryNotes);
expect("주의사항·종합평가는 비움", data.summaryCaution === "" && data.summaryOverall === "", "손으로 작성");
expect("행동 없는 달", nov.summaryNotes === "이번 달 도전적 행동 없음." && nov.summaryParticipation === "", nov.summaryNotes);
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
  // 머리말은 탭 하나가 정해진 위치 하나로 가야 이름 길이가 바뀌어도 칸이 밀리지 않는다 (탭 위치 7개 = 탭 7번)
  const header = xml.match(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?이용자  가상이용자 A[\s\S]*?<\/w:p>/)?.[0] ?? "";
  const stops = header.match(/<w:tab w:val="left"/g)?.length ?? 0;
  const tabs = header.match(/<w:tab\/>/g)?.length ?? 0;
  expect("머리말 탭 위치 = 탭 수", stops === 7 && tabs === 7, "위치 " + stops + "개, 탭 " + tabs + "번");
  const tableRows = xml.match(/<w:tr[ >]/g)?.length ?? 0;
  expect("표 줄 = 머리글 2 + 31일", tableRows === 33, tableRows + "줄");
  expect("요약 문장", text.includes("체육활동·예술활동·기타 참여가 많았음"), "참여활동 칸");
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
