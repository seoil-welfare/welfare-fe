import { OTHER_LABEL } from "@/data/catalog";
import { dateOf } from "@/lib/utils";
import type { DiaryRef, NewsEntry } from "@/api/types";
import type {
  Activity,
  Diary,
  DiaryDraft,
  DiaryEvent,
  DiaryEventKind,
  ServiceUser,
  Staff,
} from "@/types";

/**
 * 일지 화면 계산.
 * API에서 받은 목록을 입력으로 받는 순수 함수다. 데이터를 불러오는 일은 src/api가 맡는다.
 */

export function findServiceUser(
  serviceUsers: readonly ServiceUser[],
  userId: string,
): ServiceUser | undefined {
  return serviceUsers.find((u) => u.id === userId);
}

export function findStaff(staff: readonly Staff[], staffId: string): Staff | undefined {
  return staff.find((s) => s.id === staffId);
}

export function activeServiceUsers(serviceUsers: readonly ServiceUser[]): ServiceUser[] {
  return serviceUsers.filter((u) => u.status === "active");
}

export function diariesOnDate(diaries: readonly Diary[], date: string): Diary[] {
  return diaries
    .filter((d) => d.date === date)
    .sort((a, b) => a.userId.localeCompare(b.userId));
}

/** 날짜별 일지 완료 비율 N/3 (지시서 4.3). 분모는 현재 활성 이용자 수 */
export interface DayCompletion {
  completed: number;
  total: number;
  saved: number;
  hasBehavior: boolean;
}

export function dayCompletion(
  diaries: readonly Diary[],
  serviceUsers: readonly ServiceUser[],
  date: string,
): DayCompletion | null {
  const saved = diariesOnDate(diaries, date).filter(
    (d) => findServiceUser(serviceUsers, d.userId)?.status === "active",
  );
  // 일지가 전혀 저장되지 않은 날짜에는 지표를 표시하지 않는다 (지시서 4.3)
  if (saved.length === 0) return null;
  return {
    completed: saved.filter((d) => d.status === "completed").length,
    total: activeServiceUsers(serviceUsers).length,
    saved: saved.length,
    hasBehavior: saved.some((d) => countDiaryBehaviors(d) > 0),
  };
}

/** 일지 1건의 도전적 행동 세부 항목 선택 건수 (FR-58) */
export function countDiaryBehaviors(diary: Diary): number {
  return diary.activities.reduce((sum, activity) => sum + countActivityBehaviors(activity), 0);
}

/**
 * 활동 1건의 도전적 행동 건수.
 * 동일 활동 내 동일 세부 행동은 1건, 다른 행동은 각각 1건.
 * 최상위 '기타' 유형은 유효한 기록이 있으면 1건 (통계 집계 공통 규칙 3).
 */
export function countActivityBehaviors(activity: Activity): number {
  if (!activity.hasBehavior) return 0;
  return activity.behaviors.reduce((sum, selection) => {
    if (selection.type === "other") {
      return sum + (selection.otherText?.trim() ? 1 : 0);
    }
    return sum + new Set(selection.detailIds).size;
  }, 0);
}

/** 오늘의 소식 목록 (FR-06, FR-08~FR-12) */
export interface NewsItem {
  event: DiaryEvent;
  diary: DiaryRef;
  actorName: string;
  serviceUserName: string;
  /** 등록·수정이 발생한 날짜 (YYYY-MM-DD). 목록의 정렬·조회 범위·날짜 구분의 기준이다 */
  occurredDate: string;
}

/**
 * 활동 내역은 등록 또는 수정이 '발생한 시각'을 기준으로 최신순 정렬하고,
 * 조회 범위(sinceDate)도 같은 기준을 쓴다 (2.1.N 공통 규칙).
 * 일지 날짜와 발생 날짜는 다를 수 있다 — 예: 지난주 일지를 오늘 수정한 경우.
 * 이름은 서버가 내려 준 id로 이용자·직원 목록에서 찾는다.
 */
export function newsItems(
  entries: readonly NewsEntry[],
  directory: { serviceUsers: readonly ServiceUser[]; staff: readonly Staff[] },
  options: { filter: "all" | "created" | "updated"; sinceDate?: string },
): NewsItem[] {
  return entries
    .filter(({ event }) => (options.filter === "all" ? true : event.kind === options.filter))
    .map(({ event, diary }) => ({
      event,
      diary,
      actorName: findStaff(directory.staff, event.actorId)?.name ?? "알 수 없음",
      serviceUserName: findServiceUser(directory.serviceUsers, diary.userId)?.name ?? "알 수 없음",
      occurredDate: dateOf(event.occurredAt),
    }))
    .filter((item) => !options.sinceDate || item.occurredDate >= options.sinceDate)
    .sort((a, b) => b.event.occurredAt.localeCompare(a.event.occurredAt));
}

export interface NewsGroup {
  /** YYYY-MM-DD */
  date: string;
  items: NewsItem[];
}

/**
 * 발생 날짜가 바뀌는 지점에서 목록을 끊는다.
 * 입력이 최신순으로 정렬되어 있으므로 그룹도 최신순이며 날짜가 섞이지 않는다.
 */
export function groupNewsByDate(items: readonly NewsItem[]): NewsGroup[] {
  const groups: NewsGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.occurredDate) {
      last.items.push(item);
    } else {
      groups.push({ date: item.occurredDate, items: [item] });
    }
  }
  return groups;
}

export function eventKindLabel(kind: DiaryEventKind): string {
  return kind === "created" ? "등록" : "수정";
}

/** 활동 요약 문구 (FR-12, FR-60) */
export function activitySummary(activity: Activity): string {
  const parts = labelsOf(activity.participation, activity.participationOther);
  const reaction = labelsOf(activity.reaction, activity.reactionOther);
  const left = parts.length > 0 ? parts.join(", ") : "참여 활동 미선택";
  const right = reaction.length > 0 ? reaction.join(", ") : "반응 미선택";
  return left + " · " + right;
}

/** '기타'가 선택되고 직접 입력이 있으면 '기타(입력값)'으로 보여 준다 */
export function labelsOf(selected: readonly string[], otherText?: string): string[] {
  return selected.map((label) =>
    label === OTHER_LABEL && otherText?.trim() ? OTHER_LABEL + "(" + otherText.trim() + ")" : label,
  );
}

export function emptyDraft(userId: string, date: string): DiaryDraft {
  return {
    userId,
    date,
    weather: "맑음", // FR-10 기본값
    condition: "양호", // FR-11 기본값
    activities: [],
    notes: "",
  };
}

export function draftFromDiary(diary: Diary): DiaryDraft {
  return {
    diaryId: diary.id,
    userId: diary.userId,
    date: diary.date,
    weather: diary.weather,
    condition: diary.condition,
    conditionOther: diary.conditionOther,
    activities: diary.activities.map((a) => ({ ...a })),
    notes: diary.notes,
  };
}

export function emptyActivity(id: string): Activity {
  return {
    id,
    participation: [],
    detail: "",
    preSupport: [],
    reaction: [],
    positiveSupport: [],
    hasBehavior: false,
    behaviors: [],
  };
}

/** 활동 목록은 시작 시간순으로 정렬한다 (일지 상세 공통 규칙 2) */
export function sortActivities(activities: readonly Activity[]): Activity[] {
  return [...activities].sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
}
