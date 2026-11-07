/**
 * 집계 검증 (개발 검증용).
 * fixture가 시연에 필요한 분포를 갖는지, 통계 집계 규칙이 기대대로 동작하는지 확인한다.
 */
import { DEMO_TODAY, SERVICE_USERS, generateFixtures } from "./fixtures";
import { countDiaryBehaviors } from "@/services/diaryService";
import { addDays } from "@/lib/utils";
import {
  activityFieldCounts,
  behaviorCountsByType,
  recordsFor,
  statsSummary,
  behaviorSummary,
  behaviorTrend,
  completedDiaries,
  conditionCounts,
  currentPeriod,
  isPeriodInProgress,
  periodRange,
  previousPeriod,
} from "@/services/statsService";

const { diaries, events } = generateFixtures(DEMO_TODAY);
const problems: string[] = [];

function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

console.log("[fixture 분포]");
expect("일지 생성", diaries.length > 50, diaries.length + "건");
expect(
  "완료/작성 중 분포",
  diaries.some((d) => d.status === "completed") && diaries.some((d) => d.status === "draft"),
  "완료 " +
    diaries.filter((d) => d.status === "completed").length +
    "건 / 작성 중 " +
    diaries.filter((d) => d.status === "draft").length +
    "건",
);
expect("오늘은 일지 없음 (새로 작성 시연용)", !diaries.some((d) => d.date === DEMO_TODAY), "0건");
expect(
  "최근 평일 타인 작성 중 일지",
  diaries.some(
    (d) => d.date < DEMO_TODAY && d.date >= addDays(DEMO_TODAY, -3) && d.status === "draft" && d.authorId === "stf-03",
  ),
  "stf-03 작성 중",
);
expect(
  "등록/수정 소식",
  events.some((e) => e.kind === "created") && events.some((e) => e.kind === "updated"),
  "등록 " +
    events.filter((e) => e.kind === "created").length +
    "건 / 수정 " +
    events.filter((e) => e.kind === "updated").length +
    "건",
);
expect(
  "종결 이용자의 과거 일지 보존",
  diaries.some((d) => d.userId === "usr-04"),
  diaries.filter((d) => d.userId === "usr-04").length + "건",
);
expect(
  "도전적 행동이 섞인 일지",
  diaries.some((d) => countDiaryBehaviors(d) > 0) && diaries.some((d) => countDiaryBehaviors(d) === 0),
  "행동 있음 " + diaries.filter((d) => countDiaryBehaviors(d) > 0).length + "건",
);

console.log("");
console.log("[통계 집계 — 월 단위, 전체 이용자]");
const period = currentPeriod("month", DEMO_TODAY);
const range = periodRange(period);
console.log("  기간: " + range.label + " (" + range.start + " ~ " + range.end + ")");

for (const user of SERVICE_USERS.filter((u) => u.status === "active")) {
  const completed = completedDiaries(diaries, user.id, range);
  const summary = behaviorSummary(diaries, user.id, period);
  const byType = behaviorCountsByType(completed);
  const typeSum = byType.selfHarm + byType.otherHarm + byType.destruction + byType.other;
  const response = statsSummary(diaries, user.id, period);
  const records = recordsFor(response, "all");

  console.log(
    "  " +
      user.name +
      ": 완료 " +
      completed.length +
      "건 / 행동 " +
      summary.count +
      "건 / 발생 " +
      summary.days +
      "일 / 증감 " +
      summary.delta,
  );
  expect(
    user.name + " 유형 합계 = 전체 건수",
    typeSum === summary.count,
    "유형합 " + typeSum + " vs 전체 " + summary.count,
  );
  expect(
    user.name + " 발생 일수 <= 완료 일지 수",
    summary.days <= completed.length,
    summary.days + " <= " + completed.length,
  );
  expect(
    user.name + " 발생 기록 존재 여부가 건수와 일치",
    (records.length > 0) === (summary.count > 0),
    records.length + "개 기록",
  );
}

console.log("");
console.log("[임시 저장 제외 확인]");
const user1 = SERVICE_USERS[0].id;
const allInRange = diaries.filter(
  (d) => d.userId === user1 && d.date >= range.start && d.date <= range.end,
);
const completedInRange = completedDiaries(diaries, user1, range);
expect(
  "임시 저장 일지는 집계에서 제외",
  completedInRange.every((d) => d.status === "completed") &&
    completedInRange.length <= allInRange.length,
  "전체 " + allInRange.length + "건 중 완료 " + completedInRange.length + "건",
);

console.log("");
console.log("[항목별 통계]");
const completed = completedDiaries(diaries, user1, range);
for (const field of ["participation", "reaction", "preSupport", "positiveSupport"] as const) {
  const items = activityFieldCounts(completed, field);
  const sorted = items.every((item, i) => i === 0 || items[i - 1].count >= item.count);
  expect(
    field + " 내림차순 정렬",
    sorted,
    items
      .slice(0, 3)
      .map((i) => i.label + " " + i.count + "건")
      .join(", ") || "기록 없음",
  );
}
const conditions = conditionCounts(completed);
expect(
  "컨디션 합계 = 완료 일지 수",
  conditions.reduce((s, c) => s + c.count, 0) === completed.length,
  conditions.reduce((s, c) => s + c.count, 0) + " vs " + completed.length,
);

console.log("");
console.log("[기간 이동]");
const prev = previousPeriod(period);
console.log("  이전 기간: " + periodRange(prev).label);
const trend = behaviorTrend(diaries, user1, period);
expect("추이 구간 수 (월: 6)", trend.length === 6, trend.map((t) => t.label).join(" "));
expect(
  "현재 기간만 강조",
  trend.filter((t) => t.isCurrent).length === 1,
  trend.find((t) => t.isCurrent)?.label ?? "없음",
);

console.log("");
console.log("[이전 기간 기록 없음]");
// 도전적 행동이 있는 완료 일지 1건을 이번 기간으로 삼고, 이전 기간에 행동 없는 완료 일지를 1건 만든다
const withBehavior = diaries.find(
  (d) => d.userId === user1 && d.status === "completed" && countDiaryBehaviors(d) > 0,
)!;
const thisPeriod = currentPeriod("month", withBehavior.date);
const noBehaviorBefore = {
  ...withBehavior,
  id: "chk-prev-no-behavior",
  date: periodRange(previousPeriod(thisPeriod)).start,
  activities: withBehavior.activities.map((a) => ({ ...a, hasBehavior: false, behaviors: [] })),
};
const behaviorsNow = countDiaryBehaviors(withBehavior);
const withPrev = behaviorSummary([noBehaviorBefore, withBehavior], user1, thisPeriod);
expect(
  "이전 기간에 일지는 있고 행동 0건이면 증감 표시",
  !withPrev.previousEmpty && withPrev.delta === behaviorsNow,
  "previousEmpty=" + withPrev.previousEmpty + ", delta=" + withPrev.delta + " (이번 " + behaviorsNow + "건)",
);
const withoutPrev = behaviorSummary([withBehavior], user1, thisPeriod);
expect(
  "이전 기간에 완료 일지가 없으면 기록 없음",
  withoutPrev.previousEmpty,
  "previousEmpty=" + withoutPrev.previousEmpty,
);


console.log("");
console.log("[진행 중인 기간]");
const thisMonth = periodRange(currentPeriod("month", DEMO_TODAY));
const lastMonth = periodRange(previousPeriod(currentPeriod("month", DEMO_TODAY)));
expect("이번 달은 진행 중", isPeriodInProgress(thisMonth, DEMO_TODAY), thisMonth.label);
expect("지난달은 진행 중 아님", !isPeriodInProgress(lastMonth, DEMO_TODAY), lastMonth.label);
expect("기간 첫날도 진행 중", isPeriodInProgress(thisMonth, thisMonth.start), thisMonth.start);
expect("기간 마지막 날도 진행 중", isPeriodInProgress(thisMonth, thisMonth.end), thisMonth.end);
expect(
  "기간이 끝난 다음 날은 진행 중 아님",
  !isPeriodInProgress(thisMonth, addDays(thisMonth.end, 1)),
  addDays(thisMonth.end, 1),
);

for (const unit of ["week", "quarter", "year"] as const) {
  const p = currentPeriod(unit, DEMO_TODAY);
  const r = periodRange(p);
  expect(
    unit + " 기간 계산",
    r.start <= DEMO_TODAY && DEMO_TODAY <= r.end,
    r.label + " (" + r.start + " ~ " + r.end + ")",
  );
}

console.log("");
if (problems.length === 0) {
  console.log("모든 검증 통과");
} else {
  console.log(problems.length + "개 검증 실패: " + problems.join(", "));
}
process.exit(problems.length === 0 ? 0 : 1);
