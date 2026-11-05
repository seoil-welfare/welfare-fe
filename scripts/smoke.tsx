/**
 * 라우트 스모크 테스트 (개발 검증용).
 * 모든 주요 경로를 서버 렌더링해 화면이 예외 없이 마운트되는지 확인한다.
 * 화면이 쓰는 조회를 mock API로 채운 뒤 다시 렌더링하므로, 로딩 화면이 아니라 데이터가 들어간 화면을 검사한다.
 * 브라우저 상호작용까지 검증하지는 않는다.
 */
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "@/api/queries";
import { setMockLatency } from "@/api/mock/mockApi";
import { DraftProvider } from "@/app/DraftContext";
import { DemoProvider } from "@/demo/DemoContext";
import { AppRoutes } from "@/app/router";
import { DEMO_TODAY, generateFixtures } from "@/data/fixtures";

// mock 서버가 localStorage에서 세션을 복원하도록 persist 상태를 주입한다.
const store = new Map<string, string>([
  ["wonkwang-demo:flags", JSON.stringify({ persist: true })],
  ["wonkwang-demo:session", JSON.stringify({ currentStaffId: "stf-04" })],
]);

(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
  setTimeout,
  clearTimeout,
};

setMockLatency(false);

// 상세 화면용: 가장 최근 일지 (오늘 날짜에는 일지가 없다)
const diaryId = [...generateFixtures(DEMO_TODAY).diaries].sort((a, b) =>
  b.date.localeCompare(a.date),
)[0].id;

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/home",
  "/news",
  "/diaries/new",
  "/diaries/new/activities/new",
  "/diaries/new/activities/new/behaviors/selfHarm",
  "/diaries/new/activities/new/behaviors/otherHarm",
  "/diaries/new/activities/new/behaviors/destruction",
  "/calendar",
  "/diaries/" + diaryId,
  "/diaries/does-not-exist",
  "/stats",
  "/stats/behaviors",
  "/stats/activities",
  "/stats/reaction",
  "/stats/preSupport",
  "/stats/positiveSupport",
  "/stats/condition",
  "/mypage",
  "/profile",
  "/users",
  "/users/new",
  "/users/usr-01",
  "/users/nope",
  "/staff",
  "/staff/new",
  "/staff/stf-04",
  "/staff/nope",
  "/exports/diaries",
  "/exports/monthly",
  "/settings/password",
  "/settings/participation",
  "/this/route/does/not/exist",
];

function render(client: QueryClient, route: string): string {
  return renderToString(
    <QueryClientProvider client={client}>
      <DraftProvider>
        <DemoProvider>
          <MemoryRouter initialEntries={[route]}>
            <AppRoutes />
          </MemoryRouter>
        </DemoProvider>
      </DraftProvider>
    </QueryClientProvider>,
  );
}

/**
 * 렌더링 중 등록된 조회를 모두 불러온다. 앞 조회 결과에 따라 새 조회가 생기므로 몇 번 반복한다.
 * 꺼 둔 조회(enabled: false, 예: 이용자를 고르기 전의 통계)는 앱에서도 부르지 않으므로 건너뛴다.
 */
async function renderWithData(route: string): Promise<{ html: string; failedQueries: number }> {
  const client = createQueryClient();
  let html = render(client, route);
  for (let pass = 0; pass < 4; pass += 1) {
    const pending = client
      .getQueryCache()
      .getAll()
      .filter((query) => query.state.status === "pending" && query.options.queryFn && query.options.enabled !== false);
    if (pending.length === 0) break;
    await Promise.allSettled(pending.map((query) => query.fetch()));
    html = render(client, route);
  }
  const failedQueries = client
    .getQueryCache()
    .getAll()
    .filter((query) => query.state.status === "error").length;
  return { html, failedQueries };
}

async function main() {
  let failures = 0;

  for (const route of ROUTES) {
    try {
      const { html, failedQueries } = await renderWithData(route);
      const size = html.length;
      const note =
        failedQueries > 0 ? ", 실패 조회 " + failedQueries + "건(404 확인용 경로면 정상)" : "";
      if (size < 80) {
        // '/' 는 /login 리다이렉트라 렌더 결과가 비어 있을 수 있다
        console.log("  ~ " + route.padEnd(48) + " (" + size + " bytes, redirect" + note + ")");
      } else {
        console.log("  OK " + route.padEnd(48) + " (" + size + " bytes" + note + ")");
      }
    } catch (error) {
      failures += 1;
      console.log("  FAIL " + route);
      console.log("     " + (error instanceof Error ? error.message : String(error)));
    }
  }

  console.log("");
  console.log(failures === 0 ? "모든 라우트 렌더 성공" : failures + "개 라우트 실패");
  process.exit(failures === 0 ? 0 : 1);
}

void main();
