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

  console.log("\n[미래 날짜]");
  const tomorrow = addDays(DEMO_TODAY, 1);
  expect(
    "내일 날짜로 새 일지 저장은 400",
    (await rejects(() => mockApi.diaries.save({ ...emptyDraft(user.id, tomorrow), status: "draft" }))) === 400,
    tomorrow,
  );
  expect(
    "거부된 저장은 아무것도 남기지 않음",
    (await mockApi.diaries.list({ from: tomorrow, to: tomorrow })).length === 0,
    "0건",
  );
  expect(
    "내일 달력은 아무도 새로 쓸 수 없음",
    (await mockApi.calendar.clientStatuses(tomorrow)).every((s) => !s.canCreate),
    "canCreate 전부 false",
  );
  expect(
    "오늘 달력은 일지 없는 이용자가 새로 쓸 수 있음",
    (await mockApi.calendar.clientStatuses(DEMO_TODAY)).some((s) => s.canCreate),
    "canCreate true 있음",
  );

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

  console.log("\n[추가한 참여 활동의 통계]");
  // 팀장이 참여 활동을 추가하고 그 활동으로 일지를 쓰면, 통계 기준 목록에도 나와야 한다 (백엔드는 DB 목록 기준)
  await mockApi.auth.login({ loginId: "demo.lead", password: "demo1234", autoLogin: false });
  await mockApi.categories.addParticipation("원예활동");
  await mockApi.categories.addParticipation("가상신규활동"); // 일지에 쓰지 않는 활동 (0건)
  const other = users[1];
  const garden = emptyActivity("act-garden");
  garden.startTime = "10:00";
  garden.endTime = "11:00";
  garden.participation = ["원예활동"];
  garden.reaction = ["적극적 참여"];
  await mockApi.diaries.save({ ...emptyDraft(other.id, date), activities: [garden], status: "completed" });
  const added = await mockApi.stats.summary({ userId: other.id, ...currentPeriod("month", date) });
  const gardenReaction = added.activities.reactionByParticipation.find((p) => p.label === "원예활동");
  expect(
    "활동별 이용자 반응 기준 목록에 추가한 활동 포함",
    gardenReaction !== undefined,
    added.activities.reactionByParticipation.map((p) => p.label).join(", "),
  );
  expect(
    "추가한 활동의 반응이 집계됨",
    gardenReaction?.reaction.find((r) => r.label === "적극적 참여")?.count === 1,
    (gardenReaction?.reaction ?? []).filter((r) => r.count > 0).map((r) => r.label + " " + r.count).join(", ") || "없음",
  );
  expect(
    "0건인 추가 활동도 참여 활동 건수에 나옴",
    added.participation.some((p) => p.label === "가상신규활동" && p.count === 0),
    "가상신규활동 " + (added.participation.find((p) => p.label === "가상신규활동")?.count ?? "없음"),
  );
  expect(
    "0건인 추가 활동도 활동별 도전적 행동에 나옴",
    added.activities.behaviorByParticipation.some((p) => p.label === "가상신규활동"),
    added.activities.behaviorByParticipation.length + "개 항목",
  );

  console.log("\n[역할 변경 · 관리 권한 이양] (be-지시-직원권한관리.md와 같은 규칙)");
  const login = (loginId: string) => mockApi.auth.login({ loginId, password: "demo1234", autoLogin: false });
  const lead = await login("demo.lead");
  expect(
    "계정 추가에 팀장 역할은 400",
    (await rejects(() =>
      mockApi.staff.create({ name: "x", loginId: "check.lead", department: "x", position: "x", role: "teamLead" as "staff" }),
    )) === 400,
    "담당자로만",
  );
  const added = await mockApi.staff.create({ name: "x", loginId: "check.new", department: "x", position: "x", role: "staff" });
  expect("계정 추가는 임시 비밀번호 12자를 준다", added.temporaryPassword.length === 12, added.role);
  expect(
    "추가한 계정은 임시 비밀번호로 로그인",
    (await mockApi.auth.login({ loginId: "check.new", password: added.temporaryPassword, autoLogin: false })).id === added.id,
    "check.new",
  );
  await login("demo.lead");
  const promoted = await mockApi.staff.changeRole("stf-02", "teamLead");
  expect("팀장이 담당자를 팀장으로", promoted.role === "teamLead" && promoted.position === "팀장", promoted.position);
  const demoted = await mockApi.staff.changeRole("stf-02", "staff");
  expect("팀장이 팀장을 담당자로", demoted.role === "staff", demoted.position);
  expect("국장 계정 역할 변경은 403", (await rejects(() => mockApi.staff.changeRole("stf-05", "staff"))) === 403, "FORBIDDEN");
  expect("내 역할 변경은 400", (await rejects(() => mockApi.staff.changeRole(lead.id, "staff"))) === 400, "VALIDATION_ERROR");
  expect(
    "역할 변경으로 국장은 400",
    (await rejects(() => mockApi.staff.changeRole("stf-02", "director" as "staff"))) === 400,
    "이양으로만",
  );
  expect(
    "팀장의 이양은 403",
    (await rejects(() => mockApi.staff.transferDirector("stf-02", "teamLead"))) === 403,
    "국장만",
  );
  await login("demo.staff2");
  expect("담당자의 역할 변경은 403", (await rejects(() => mockApi.staff.changeRole("stf-03", "teamLead"))) === 403, "FORBIDDEN");

  await login("demo.director");
  const moved = await mockApi.staff.transferDirector("stf-04", "teamLead");
  const directors = (await mockApi.staff.list()).filter((s) => s.role === "director");
  expect(
    "이양 후 팀장으로 남기",
    moved.director.id === "stf-04" && moved.previous.role === "teamLead" && moved.previous.active !== false,
    moved.director.name + " / " + moved.previous.name + " " + moved.previous.position,
  );
  expect("이양 후 국장은 한 명", directors.length === 1, directors.length + "명");

  await login("demo.lead"); // 이제 국장
  const handed = await mockApi.staff.transferDirector("stf-05", "deactivate");
  expect(
    "이양 후 계정 사용 중지",
    handed.previous.active === false && handed.previous.role === "teamLead" && handed.director.id === "stf-05",
    handed.previous.name + " active=" + handed.previous.active,
  );
  expect("사용 중지를 고르면 세션이 끊김", (await mockApi.auth.me()) === null, "me() null");

  console.log("");
  console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
  process.exit(problems.length === 0 ? 0 : 1);
}

void main();
