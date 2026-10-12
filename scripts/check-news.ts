/** 오늘의 소식 날짜 구분 검증 (개발 검증용) */
import { DEMO_TODAY, SERVICE_USERS, STAFF, generateFixtures } from "@/data/fixtures";
import { toNewsEntries } from "@/api/mock/mockApi";
import { groupNewsByDate, newsItems } from "@/services/diaryService";
import { addDays, dateGroupLabel } from "@/lib/utils";

const { diaries, events } = generateFixtures(DEMO_TODAY);
const directory = { serviceUsers: SERVICE_USERS, staff: STAFF };
// 서버(mock)가 내려 주는 형태로 만든다. 가장 넓은 범위로 받아 두고 화면처럼 sinceDate로 거른다
const entries = toNewsEntries(events, diaries, "0000-00-00");
const problems: string[] = [];

function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

// 화면 최초 진입 상태(오늘+어제) → '지난 소식 더 보기' 2회까지
for (const daysBack of [1, 4, 7]) {
  const since = addDays(DEMO_TODAY, -daysBack);
  const items = newsItems(entries, directory, { filter: "all", sinceDate: since });
  const groups = groupNewsByDate(items);

  console.log("");
  console.log("[" + since + " 이후 · " + items.length + "건 · " + groups.length + "개 그룹]");
  for (const g of groups) {
    console.log("  " + dateGroupLabel(g.date, DEMO_TODAY).padEnd(22) + g.items.length + "건");
  }

  const dates = groups.map((g) => g.date);
  expect(
    "그룹 날짜가 중복되지 않음 (날짜가 섞이지 않음)",
    new Set(dates).size === dates.length,
    dates.length + "개 그룹",
  );
  expect(
    "그룹이 최신순",
    dates.every((d, i) => i === 0 || dates[i - 1] > d),
    dates.join(" > "),
  );
  expect(
    "그룹 내 항목 합계 = 전체 건수",
    groups.reduce((s, g) => s + g.items.length, 0) === items.length,
    groups.reduce((s, g) => s + g.items.length, 0) + " vs " + items.length,
  );
  expect(
    "모든 항목의 발생 날짜가 속한 그룹과 일치",
    groups.every((g) => g.items.every((i) => i.occurredDate === g.date)),
    "일치",
  );
  expect(
    "조회 범위 밖 항목 없음",
    items.every((i) => i.occurredDate >= since),
    "가장 오래된 " + (dates[dates.length - 1] ?? "-"),
  );
  expect(
    "그룹 내 항목도 최신순",
    groups.every((g) =>
      g.items.every(
        (it, i) => i === 0 || g.items[i - 1].event.occurredAt >= it.event.occurredAt,
      ),
    ),
    "정렬 확인",
  );
}

// 필터를 걸어도 그룹이 유지되는지
console.log("");
for (const filter of ["created", "updated"] as const) {
  const items = newsItems(entries, directory, { filter, sinceDate: addDays(DEMO_TODAY, -7) });
  const groups = groupNewsByDate(items);
  expect(
    filter + " 필터에서도 그룹 날짜 중복 없음",
    new Set(groups.map((g) => g.date)).size === groups.length,
    groups.length + "개 그룹 / " + items.length + "건",
  );
  expect(
    filter + " 필터 결과가 해당 종류만 포함",
    items.every((i) => i.event.kind === filter),
    filter,
  );
}

console.log("");
console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
process.exit(problems.length === 0 ? 0 : 1);
