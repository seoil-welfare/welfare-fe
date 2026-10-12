import {
  BEHAVIOR_DETAILS,
  BEHAVIOR_TYPES,
  CONDITIONS,
  PARTICIPATION_OPTIONS,
  POSITIVE_SUPPORT_OPTIONS,
  PRE_SUPPORT_OPTIONS,
  REACTION_OPTIONS,
  WEATHERS,
} from "@/data/catalog";
import { addDays, parseISODate, pickSome, seededRandom, toISODate } from "@/lib/utils";
import type {
  Activity,
  BehaviorSelection,
  Diary,
  DiaryEvent,
  ServiceUser,
  Staff,
} from "@/types";

/**
 * 가상 데이터. 실명·주민등록번호·실제 행동기록을 쓰지 않는다 (지시서 0-8).
 * 모든 인물은 가상이며 실존 직원·이용자가 아니다.
 */

export const DEMO_TODAY = toISODate(new Date());

export const STAFF: readonly Staff[] = [
  {
    id: "stf-01",
    name: "가 담당",
    department: "주간활동지원팀",
    position: "사회복지사",
    role: "staff",
    loginId: "demo.staff1",
  },
  {
    id: "stf-02",
    name: "나 담당",
    department: "주간활동지원팀",
    position: "사회복지사",
    role: "staff",
    loginId: "demo.staff2",
  },
  {
    id: "stf-03",
    name: "다 담당",
    department: "주간활동지원팀",
    position: "사회복지사",
    role: "staff",
    loginId: "demo.staff3",
  },
  {
    id: "stf-04",
    name: "라 팀장",
    department: "주간활동지원팀",
    position: "팀장",
    role: "teamLead",
    loginId: "demo.lead",
  },
  {
    id: "stf-05",
    name: "마 국장",
    department: "사무국",
    // U4 미확정: '국장' 직위는 확인 전까지 승인된 직위로 표시하지 않는다
    position: "국장",
    role: "director",
    loginId: "demo.director",
    unconfirmedPosition: true,
  },
];

export const SERVICE_USERS: readonly ServiceUser[] = [
  { id: "usr-01", name: "김가상", birthDate: "1999-12-07", assignedStaffId: "stf-01", status: "active" },
  { id: "usr-02", name: "이예시", birthDate: "2001-04-18", assignedStaffId: "stf-02", status: "active" },
  { id: "usr-03", name: "박모의", birthDate: "1997-08-30", assignedStaffId: "stf-03", status: "active" },
  // 이용 종결 예시 — 활성 목록에서 제외되지만 과거 일지는 보존된다 (FR-91)
  { id: "usr-04", name: "최종결", birthDate: "1995-02-11", assignedStaffId: "stf-01", status: "closed" },
];

/** 'YYYY-MM-DD' + 시/분을 로컬 시각 ISO 문자열로 바꾼다. 시를 반드시 두 자리로 맞춘다. */
function atTime(date: string, hour: number, minute: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute, 0).toISOString();
}

function buildBehaviors(rand: () => number): BehaviorSelection[] {
  const typeCount = 1 + Math.floor(rand() * 2);
  const types = pickSome(BEHAVIOR_TYPES, rand, typeCount, typeCount);
  return types.map((meta) => {
    if (!meta.hasDetailPage) {
      // 상위 '기타'는 유효한 기록이 있으면 1건으로 집계한다 (FR-36)
      return { type: meta.type, detailIds: [], otherText: "예시 기록(확정 필요)" };
    }
    const details = pickSome(BEHAVIOR_DETAILS[meta.type], rand, 1, 2);
    const selection: BehaviorSelection = {
      type: meta.type,
      detailIds: details.map((d) => d.id),
    };
    if (details.some((d) => d.label === "기타")) {
      selection.otherText = "예시 입력(확정 필요)";
    }
    return selection;
  });
}

function buildActivity(rand: () => number, index: number): Activity {
  const startHour = 9 + index * 2;
  const participation = pickSome(PARTICIPATION_OPTIONS, rand, 1, 2);
  const preSupport = pickSome(
    PRE_SUPPORT_OPTIONS.filter((o) => o !== "없음"),
    rand,
    1,
    2,
  );
  const reaction = pickSome(REACTION_OPTIONS, rand, 1, 1);
  const positiveSupport = pickSome(POSITIVE_SUPPORT_OPTIONS, rand, 1, 2);
  const hasBehavior = rand() < 0.38;

  const activity: Activity = {
    id: "act-" + index + "-" + Math.floor(rand() * 1e6).toString(36),
    startTime: String(startHour).padStart(2, "0") + ":00",
    endTime: String(startHour + 1).padStart(2, "0") + ":00",
    participation: [...participation],
    detail: "가상 활동 기록입니다. 시연용 예시 문장이며 실제 기록이 아닙니다.",
    preSupport: [...preSupport],
    reaction: [...reaction],
    positiveSupport: [...positiveSupport],
    hasBehavior,
    behaviors: hasBehavior ? buildBehaviors(rand) : [],
  };

  if (participation.includes("기타")) activity.participationOther = "산책";
  if (preSupport.includes("기타")) activity.preSupportOther = "예시 지원";
  if (reaction.includes("기타")) activity.reactionOther = "예시 반응";
  if (positiveSupport.includes("기타")) activity.positiveSupportOther = "예시 지원";
  return activity;
}

interface GeneratedData {
  diaries: Diary[];
  events: DiaryEvent[];
}

/**
 * 최근 약 10주의 일지를 생성한다.
 * - 완료 / 작성 중 / 미작성 분포를 섞는다
 * - 오늘 날짜에는 '타인이 작성 중인 일지'를 반드시 하나 포함한다
 * - 기록이 0건인 통계 항목이 생기도록 일부 카테고리는 선택하지 않는다
 */
export function generateFixtures(today: string = DEMO_TODAY): GeneratedData {
  const rand = seededRandom(20261011);
  const diaries: Diary[] = [];
  const events: DiaryEvent[] = [];
  const activeUsers = SERVICE_USERS.filter((u) => u.status === "active");

  for (let back = 70; back >= 0; back -= 1) {
    const date = addDays(today, -back);
    // parseISODate를 쓴다. new Date("YYYY-MM-DD")는 UTC로 해석돼 시간대에 따라 요일이 밀린다.
    const weekday = parseISODate(date).getDay();
    // 주말에는 일지가 없다. 단 '오늘'은 회의 시연을 위해 항상 기록이 있게 둔다.
    if (back !== 0 && (weekday === 0 || weekday === 6)) continue;

    for (const user of activeUsers) {
      const roll = rand();
      // 미작성 분포
      if (roll < 0.18) continue;

      const isDraft = roll > 0.9;
      const author = STAFF.find((s) => s.id === user.assignedStaffId) ?? STAFF[0];
      const activityCount = 1 + Math.floor(rand() * 3);
      const activities = Array.from({ length: activityCount }, (_, i) => buildActivity(rand, i));
      const condition = CONDITIONS[Math.floor(rand() * CONDITIONS.length)];
      const createdAt = atTime(date, 9 + Math.floor(rand() * 3), 15);
      const updatedAt = atTime(date, 14 + Math.floor(rand() * 4), 40);

      const diary: Diary = {
        id: "dry-" + date + "-" + user.id,
        userId: user.id,
        date,
        authorId: author.id,
        status: isDraft ? "draft" : "completed",
        weather: WEATHERS[Math.floor(rand() * WEATHERS.length)],
        condition,
        conditionOther: condition === "기타" ? "컨디션 예시 메모" : undefined,
        activities,
        notes:
          rand() < 0.75
            ? "가상 특이사항입니다. 보호자 전달 사항 예시이며 실제 기록이 아닙니다."
            : "",
        createdAt,
        updatedAt: isDraft ? createdAt : updatedAt,
      };
      diaries.push(diary);

      // 작성 중인 일지는 소식의 등록·수정 내역으로 올리지 않는다 (작성 중 공통 규칙 1).
      // mock 서버의 일지 저장(src/api/mock/mockApi.ts)과 같은 규칙을 쓴다.
      if (!isDraft) {
        events.push({
          id: "evt-c-" + diary.id,
          diaryId: diary.id,
          kind: "created",
          actorId: author.id,
          occurredAt: createdAt,
        });
      }

      if (!isDraft && rand() < 0.35) {
        const editor = STAFF[Math.floor(rand() * 4)];
        diary.lastEditorId = editor.id;
        events.push({
          id: "evt-u-" + diary.id,
          diaryId: diary.id,
          kind: "updated",
          actorId: editor.id,
          occurredAt: updatedAt,
        });
      }
    }
  }

  /**
   * 오늘 날짜의 상태를 시연에 맞춰 고정한다.
   *  - usr-01: 작성 완료 + 등록·수정 소식
   *  - usr-02: 작성 완료 + 등록 소식
   *  - usr-03: 다른 담당자(stf-03)가 작성 중 (FR-71 상태 재현, 소식에는 올리지 않음)
   * 이렇게 두면 오늘 소식이 3건이 되어 '더 보기' 표시 조건(3건 이상)도 시연할 수 있다 (FR-07).
   */
  function forceToday(
    userId: string,
    authorId: string,
    status: "completed" | "draft",
    hour: number,
    withUpdate: boolean,
  ) {
    const id = "dry-" + today + "-" + userId;
    const createdAt = atTime(today, hour, 15);
    let diary = diaries.find((d) => d.id === id);
    if (!diary) {
      diary = {
        id,
        userId,
        date: today,
        authorId,
        status,
        weather: "맑음",
        condition: "양호",
        activities: Array.from({ length: 1 + Math.floor(rand() * 2) }, (_, i) =>
          buildActivity(rand, i),
        ),
        notes: "가상 특이사항입니다. 시연용 예시이며 실제 기록이 아닙니다.",
        createdAt,
        updatedAt: createdAt,
      };
      diaries.push(diary);
    }
    diary.status = status;
    diary.authorId = authorId;
    diary.createdAt = createdAt;
    diary.updatedAt = createdAt;
    diary.lastEditorId = undefined;

    // 이 일지에 달려 있던 기존 소식은 지우고 상태에 맞게 다시 만든다
    const kept = events.filter((e) => e.diaryId !== id);
    events.length = 0;
    events.push(...kept);

    if (status === "completed") {
      events.push({
        id: "evt-c-" + id,
        diaryId: id,
        kind: "created",
        actorId: authorId,
        occurredAt: createdAt,
      });
      if (withUpdate) {
        const updatedAt = atTime(today, hour + 3, 40);
        diary.lastEditorId = "stf-04";
        diary.updatedAt = updatedAt;
        events.push({
          id: "evt-u-" + id,
          diaryId: id,
          kind: "updated",
          actorId: "stf-04",
          occurredAt: updatedAt,
        });
      }
    }
  }

  forceToday("usr-01", "stf-01", "completed", 9, true);
  forceToday("usr-02", "stf-02", "completed", 10, false);
  forceToday("usr-03", "stf-03", "draft", 11, false);

  // 이용 종결된 이용자의 과거 기록도 보존한다 (FR-91)
  const closedDate = addDays(today, -40);
  const closedCreatedAt = atTime(closedDate, 9, 30);
  diaries.push({
    id: "dry-" + closedDate + "-usr-04",
    userId: "usr-04",
    date: closedDate,
    authorId: "stf-01",
    status: "completed",
    weather: "흐림",
    condition: "보통",
    activities: [buildActivity(rand, 0)],
    notes: "이용 종결 전 기록 예시입니다.",
    createdAt: closedCreatedAt,
    updatedAt: closedCreatedAt,
  });

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return { diaries, events };
}
