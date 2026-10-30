/**
 * mock API 저장 흐름 검증 (개발 검증용).
 * 화면이 기대하는 서버 동작(명세 4장)을 mock 구현이 지키는지, 저장 결과가 달력·통계·소식 계산에
 * 반영되는지 확인한다. 실제 백엔드 동작을 보장하는 테스트가 아니다.
 */
import { isApiError } from "@/api/errors";
import { mockApi, setMockLatency } from "@/api/mock/mockApi";
import { readDb } from "@/api/mock/mockDb";
import { DEMO_TODAY } from "@/data/fixtures";
import { emptyActivity, emptyDraft } from "@/services/diaryService";
import { behaviorSummary, currentPeriod } from "@/services/statsService";
import { dayCompletion } from "@/services/diaryService";
import { addDays } from "@/lib/utils";

(globalThis as unknown as { window: unknown }).window = {
  localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
};
setMockLatency(false);

const problems: string[] = [];
function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

async function rejects(fn: () => Promise<unknown>): Promise<number | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    return isApiError(error) ? error.status : -1;
  }
}

async function main() {
  // 일지가 없는 날짜·이용자를 고른다 (주말은 fixture에 일지가 없다)
  const users = (await mockApi.serviceUsers.list()).filter((u) => u.status === "active");
  let date = DEMO_TODAY;
  for (let back = 1; back < 60; back += 1) {
    const candidate = addDays(DEMO_TODAY, -back);
    if ((await mockApi.diaries.list({ from: candidate, to: candidate })).length === 0) {
      date = candidate;
      break;
    }
  }
  const user = users[0];
  console.log("[대상] " + user.id + " · " + date);

  console.log("\n[인증]");
  expect(
    "로그인 전 저장은 401",
    (await rejects(() => mockApi.diaries.save({ ...emptyDraft(user.id, date), status: "draft" }))) === 401,
    "requireSession",
  );
  expect(
    "비밀번호 불일치는 401",
    (await rejects(() => mockApi.auth.login({ loginId: "demo.staff1", password: "x", autoLogin: false }))) === 401,
    "INVALID_CREDENTIALS",
  );
  const author = await mockApi.auth.login({ loginId: "demo.staff1", password: "demo1234", autoLogin: false });
  expect("로그인 후 me", (await mockApi.auth.me())?.id === author.id, author.id);

  console.log("\n[작성 중 → 작성 완료]");
  const eventsBefore = readDb().events.length;
  const activity = emptyActivity("act-temp-1");
  activity.hasBehavior = true;
  activity.behaviors = [{ type: "selfHarm", detailIds: ["sh-1", "sh-2"] }];
  const draft = await mockApi.diaries.save({
    ...emptyDraft(user.id, date),
    activities: [activity],
    status: "draft",
  });
  expect("작성 중 저장은 서버가 id 발급", draft.id.startsWith("dry-") && draft.status === "draft", draft.id);
  expect("작성 중 저장은 소식 없음", readDb().events.length === eventsBefore, "이벤트 수 유지");

  const completed = await mockApi.diaries.save({
    ...emptyDraft(user.id, date),
    diaryId: draft.id,
    updatedAt: draft.updatedAt,
    activities: [activity],
    status: "completed",
  });
  expect("완료 저장은 같은 일지 갱신", completed.id === draft.id && completed.status === "completed", completed.id);
  const createdEvents = readDb().events.filter((e) => e.diaryId === draft.id);
  expect(
    "처음 완료하면 created 1건",
    createdEvents.length === 1 && createdEvents[0].kind === "created",
    createdEvents.map((e) => e.kind).join(","),
  );
  expect("최초 작성자 유지", completed.authorId === author.id, completed.authorId);

  console.log("\n[다른 직원이 수정]");
  await mockApi.auth.login({ loginId: "demo.lead", password: "demo1234", autoLogin: false });
  const edited = await mockApi.diaries.save({
    ...emptyDraft(user.id, date),
    diaryId: draft.id,
    updatedAt: completed.updatedAt,
    activities: [activity],
    notes: "수정",
    status: "completed",
  });
  expect(
    "수정하면 최초 작성자 유지 + 마지막 수정자 기록",
    edited.authorId === author.id && edited.lastEditorId === "stf-04",
    edited.authorId + " / " + edited.lastEditorId,
  );
  expect(
    "완료 일지 재저장은 updated 이벤트",
    readDb().events.filter((e) => e.diaryId === draft.id).some((e) => e.kind === "updated"),
    "updated 존재",
  );

  console.log("\n[동시 수정]");
  const stale = await rejects(() =>
    mockApi.diaries.save({
      ...emptyDraft(user.id, date),
      diaryId: draft.id,
      updatedAt: draft.updatedAt,
      notes: "오래된 내용으로 덮어쓰기",
      status: "completed",
    }),
  );
  expect("불러온 뒤 다른 사람이 저장했으면 409", stale === 409, "DIARY_UPDATED_BY_OTHER");
  const kept = (await mockApi.diaries.get(draft.id)).notes;
  expect("먼저 저장한 내용 유지", kept === "수정", kept);

  console.log("\n[응답 유실 후 같은 내용으로 다시 저장 (diaryId 없음)]");
  const retry = await mockApi.diaries.save({ ...emptyDraft(user.id, date), status: "completed" });
  const sameDay = (await mockApi.diaries.list({ userId: user.id, from: date, to: date })).length;
  expect("현재 규칙(같은 날 기존 일지 갱신)상 일지가 늘지 않음", retry.id === draft.id && sameDay === 1, sameDay + "건");
  console.log("       참고: 이 경우 mock은 updated 이벤트를 하나 더 남긴다 (명세 B-2 협의 사항)");

  console.log("\n[저장 결과가 조회·계산에 반영]");
  const all = await mockApi.diaries.list({});
  const services = await mockApi.serviceUsers.list();
  const completion = dayCompletion(all, services, date);
  expect("달력 지표에 반영", completion !== null && completion.completed >= 1, JSON.stringify(completion));
  const news = await mockApi.news.list({ since: DEMO_TODAY });
  expect("오늘 소식에 반영", news.some((n) => n.diary.id === draft.id), news.length + "건");
  const stats = await mockApi.diaries.list({ userId: user.id, status: "completed" });
  const period = currentPeriod("month", date);
  const summary = behaviorSummary(stats, user.id, period);
  // 마지막 재저장에서 활동을 비웠으므로 이 일지의 도전적 행동은 0이어야 한다 (최신 저장 기준 집계)
  const thisDiary = stats.find((d) => d.id === draft.id);
  expect("통계는 최신 저장 내용 기준", thisDiary?.activities.length === 0, "활동 " + thisDiary?.activities.length + "건, 기간 합계 " + summary.count + "건");

  console.log("\n[이용자 종결 · 직원 아이디 중복]");
  const closed = await mockApi.serviceUsers.close(user.id);
  const afterClose = await mockApi.diaries.list({ userId: user.id });
  expect("종결은 삭제가 아님 (일지 유지)", closed.status === "closed" && afterClose.length > 0, afterClose.length + "건 유지");
  expect(
    "아이디 중복은 409",
    (await rejects(() =>
      mockApi.staff.create({ name: "x", loginId: "demo.staff1", department: "x", position: "x", role: "staff" }),
    )) === 409,
    "DUPLICATE_LOGIN_ID",
  );
  expect("없는 일지는 404", (await rejects(() => mockApi.diaries.get("nope"))) === 404, "notFound");

  console.log("");
  console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
  process.exit(problems.length === 0 ? 0 : 1);
}

void main();
