/** 오늘의 소식 날짜 구분 검증 (개발 검증용) */
import { DEMO_TODAY, SERVICE_USERS, STAFF, generateFixtures } from "@/data/fixtures";
import { QueryClient } from "@tanstack/react-query";
import { setMockLatency, toNewsEntries } from "@/api/mock/mockApi";
import { writeDb } from "@/api/mock/mockDb";
import { findOlderNewsDate } from "@/api/queries";
import { groupNewsByDate, latestNewsDateBefore, newsItems } from "@/services/diaryService";
import { addDays, dateGroupLabel, dateOf } from "@/lib/utils";

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

// '지난 소식 더 보기': 소식이 없는 날을 건너뛰고 가장 가까운 날로 이동
console.log("");
console.log("[지난 소식 더 보기 — 다음 날짜 찾기]");
for (const filter of ["all", "created", "updated"] as const) {
  let mismatch = 0;
  for (let back = 0; back <= 60; back++) {
    const before = addDays(DEMO_TODAY, -back);
    // 비교용: 조건에 맞는 날짜를 모두 모아 가장 큰 값
    const dates = entries
      .filter(({ event }) => filter === "all" || event.kind === filter)
      .map(({ event }) => dateOf(event.occurredAt))
      .filter((d) => d < before);
    const expected = dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
    if (latestNewsDateBefore(entries, before, filter) !== expected) mismatch++;
  }
  expect(filter + " 필터: 61개 기준일 모두 직접 계산과 같음", mismatch === 0, mismatch + "개 다름");
}

// 며칠 비어 있는 경우를 직접 만들어 확인한다
const sample = entries[0];
const at = (date: string) => ({ ...sample, event: { ...sample.event, occurredAt: date + "T10:00:00+09:00" } });
const gap = [at("2026-10-20"), at("2026-10-11"), at("2026-10-02")];
expect("9일 빈 구간을 한 번에 건너뜀", latestNewsDateBefore(gap, "2026-10-20", "all") === "2026-10-11", "2026-10-20 → 2026-10-11");
expect("다음 구간도 이어서 찾음", latestNewsDateBefore(gap, "2026-10-11", "all") === "2026-10-02", "2026-10-11 → 2026-10-02");
expect("더 이전이 없으면 null", latestNewsDateBefore(gap, "2026-10-02", "all") === null, "null");

// 화면과 같은 방식으로 mock 서버에 범위를 넓혀 가며 묻기
async function checkWithMockServer() {
  setMockLatency(false);
  // 앱의 목 서버는 일지 없이 시작하므로, 위에서 만든 샘플 일지·소식을 넣고 묻는다
  writeDb((db) => ({ ...db, diaries, events }));
  const client = new QueryClient();
  const limit = addDays(DEMO_TODAY, -365);
  let cursor = addDays(DEMO_TODAY, -1);
  const visited: string[] = [];
  for (let i = 0; i < 400; i++) {
    const found = await findOlderNewsDate(client, { before: cursor, limit, filter: "all" });
    if (!found) break;
    visited.push(found);
    cursor = found;
  }
  const allDates = [...new Set(entries.map(({ event }) => dateOf(event.occurredAt)))]
    .filter((d) => d < addDays(DEMO_TODAY, -1) && d >= limit)
    .sort()
    .reverse();
  expect(
    "버튼을 계속 누르면 소식이 있는 날만 빠짐없이 차례로 펼침",
    JSON.stringify(visited) === JSON.stringify(allDates),
    visited.length + "번 이동, 가장 오래된 " + (visited[visited.length - 1] ?? "-"),
  );
  expect(
    "펼친 날짜의 캐시에는 그 날짜 이후 소식만 있음",
    visited.every((d) =>
      (client.getQueryData<typeof entries>(["news", d]) ?? []).every(
        ({ event }) => dateOf(event.occurredAt) >= d,
      ),
    ),
    "확인",
  );
}

void checkWithMockServer().then(() => {
  console.log("");
  console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
  process.exit(problems.length === 0 ? 0 : 1);
});
