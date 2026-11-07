import type { StatsBehaviorRecord, StatsSummary } from "@/api/types";
import {
  BEHAVIOR_DETAILS,
  BEHAVIOR_TYPES,
  CATEGORY_ORDER,
  OTHER_LABEL,
  behaviorDetailLabel,
} from "@/data/catalog";
import { addDays, parseISODate, quarterOf, toISODate } from "@/lib/utils";
import { behaviorEntries, countActivityBehaviors } from "@/services/diaryService";
import type {
  BehaviorType,
  CountItem,
  Diary,
  StatPeriodUnit,
  StatisticPeriod,
} from "@/types";

/**
 * 통계 집계.
 * 계획서 「통계 집계 공통 규칙」을 가능한 한 그대로 적용한다 (지시서 1장 / 3장).
 * - 작성 완료 일지만 포함, 임시 저장 제외
 * - 동일 활동 내 동일 세부 행동은 1건, 다른 행동은 각각 1건
 * - 발생 일수는 날짜 유일값
 * - '기타' 자유 입력은 개별 항목으로 분리하지 않고 '기타'로 합산
 * - 단위는 '회'가 아니라 '건'
 */

export interface PeriodRange {
  /** 포함 */
  start: string;
  /** 포함 */
  end: string;
  label: string;
}

/** 해당 월과 만나는 일요일~토요일 7일 주간. 월 경계에서도 날짜를 자르지 않는다. */
function weeksInMonth(year: number, month: number): PeriodRange[] {
  const first = new Date(year, month - 1, 1);
  const last = toISODate(new Date(year, month, 0));
  const ranges: PeriodRange[] = [];
  let cursor = addDays(toISODate(first), -first.getDay());
  let week = 1;
  while (cursor <= last) {
    ranges.push({
      start: cursor,
      end: addDays(cursor, 6),
      label: year + "년 " + month + "월 " + week + "주차",
    });
    cursor = addDays(cursor, 7);
    week += 1;
  }
  return ranges;
}

export function weekCountOfMonth(year: number, month: number): number {
  return weeksInMonth(year, month).length;
}

/**
 * 오늘이 이 기간 안에 있는지 (아직 끝나지 않은 기간).
 * 이전 기간은 꽉 찬 기간 전체라서, 진행 중인 기간의 증감은 실제보다 줄어든 것처럼 보일 수 있다
 */
export function isPeriodInProgress(range: PeriodRange, today: string): boolean {
  return range.start <= today && today <= range.end; // 'YYYY-MM-DD'는 글자 비교가 곧 날짜 비교
}

export function periodRange(period: StatisticPeriod): PeriodRange {
  const { unit, year } = period;
  if (unit === "year") {
    return {
      start: toISODate(new Date(year, 0, 1)),
      end: toISODate(new Date(year, 11, 31)),
      label: year + "년",
    };
  }
  if (unit === "quarter") {
    const q = period.quarter ?? 1;
    const startMonth = (q - 1) * 3;
    return {
      start: toISODate(new Date(year, startMonth, 1)),
      end: toISODate(new Date(year, startMonth + 3, 0)),
      label: year + "년 " + q + "분기",
    };
  }
  if (unit === "month") {
    const m = period.month ?? 1;
    return {
      start: toISODate(new Date(year, m - 1, 1)),
      end: toISODate(new Date(year, m, 0)),
      label: year + "년 " + m + "월",
    };
  }
  const m = period.month ?? 1;
  const weeks = weeksInMonth(year, m);
  const index = Math.min(Math.max((period.week ?? 1) - 1, 0), weeks.length - 1);
  return weeks[index];
}

/** 조회 단위를 바꾸면 현재 날짜가 포함된 기간을 기본값으로 설정한다 (기간 선택 규칙 2) */
export function currentPeriod(unit: StatPeriodUnit, todayIso: string): StatisticPeriod {
  const today = parseISODate(todayIso);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  if (unit === "year") return { unit, year };
  if (unit === "quarter") return { unit, year, quarter: quarterOf(month) };
  if (unit === "month") return { unit, year, month };
  const weeks = weeksInMonth(year, month);
  const index = weeks.findIndex((w) => todayIso >= w.start && todayIso <= w.end);
  return { unit, year, month, week: (index < 0 ? 0 : index) + 1 };
}

/** 이전 동일 단위 기간 (FR-34) */
export function previousPeriod(period: StatisticPeriod): StatisticPeriod {
  const { unit, year } = period;
  if (unit === "year") return { unit, year: year - 1 };
  if (unit === "quarter") {
    const q = period.quarter ?? 1;
    return q === 1 ? { unit, year: year - 1, quarter: 4 } : { unit, year, quarter: q - 1 };
  }
  if (unit === "month") {
    const m = period.month ?? 1;
    return m === 1 ? { unit, year: year - 1, month: 12 } : { unit, year, month: m - 1 };
  }
  // 월별 주차 번호로 이동하면 월 경계의 같은 주를 두 번 비교하게 된다. 실제 시작일에서 7일을 뺀다.
  return currentPeriod("week", addDays(periodRange(period).start, -7));
}

/**
 * 기간 추이 그래프의 구간 수.
 * FR-35 미확정 사항의 제안값: 월 최근 6개월, 분기 최근 4분기, 연간 최근 5년.
 * 주간은 제안값이 없으므로 시연에서 최근 6주차를 사용한다.
 */
export const TREND_SEGMENTS: Record<StatPeriodUnit, number> = {
  week: 6,
  month: 6,
  quarter: 4,
  year: 5,
};

export function trendPeriods(period: StatisticPeriod): StatisticPeriod[] {
  const count = TREND_SEGMENTS[period.unit];
  const out: StatisticPeriod[] = [period];
  let cursor = period;
  for (let i = 1; i < count; i += 1) {
    cursor = previousPeriod(cursor);
    out.unshift(cursor);
  }
  return out;
}

export function completedDiaries(
  diaries: readonly Diary[],
  userId: string,
  range: PeriodRange,
): Diary[] {
  return diaries.filter(
    (d) =>
      d.userId === userId &&
      d.status === "completed" && // 임시 저장 제외
      d.date >= range.start &&
      d.date <= range.end,
  );
}

export interface BehaviorSummary {
  /** 세부 행동 선택 건수 합계 (FR-32) */
  count: number;
  /** 발생 일수 (FR-33) */
  days: number;
  /** 이전 동기간 대비 증감 (FR-34) */
  delta: number;
  /** 이전 동기간에 작성 완료 일지가 없었는지 (행동 건수가 아님) — 증감 표시 방식 미확정(FR-34) */
  previousEmpty: boolean;
}

export function behaviorSummary(
  diaries: readonly Diary[],
  userId: string,
  period: StatisticPeriod,
  typeFilter: BehaviorType | "all" = "all",
): BehaviorSummary {
  const current = completedDiaries(diaries, userId, periodRange(period));
  const previous = completedDiaries(diaries, userId, periodRange(previousPeriod(period)));
  const count = countBehaviorsIn(current, typeFilter);
  const prevCount = countBehaviorsIn(previous, typeFilter);
  const days = new Set(
    current.filter((d) => countBehaviorsIn([d], typeFilter) > 0).map((d) => d.date),
  ).size;
  return {
    count,
    days,
    delta: count - prevCount,
    // '이전 기간 기록 없음'은 이전 기간에 작성 완료 일지가 없을 때만이다 (백엔드 StatsService와 같음).
    // 일지는 있는데 도전적 행동이 0건이면 비교할 기록이 있는 것이라 증감(+N건)으로 보여 준다
    previousEmpty: previous.length === 0,
  };
}

export function countBehaviorsIn(
  diaries: readonly Diary[],
  typeFilter: BehaviorType | "all",
): number {
  let total = 0;
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      if (!activity.hasBehavior) continue;
      if (typeFilter === "all") {
        total += countActivityBehaviors(activity);
        continue;
      }
      total += behaviorEntries(activity).filter((entry) => entry.type === typeFilter).length;
    }
  }
  return total;
}

/** 유형별 건수 (FR-36 / FR-47) */
export function behaviorCountsByType(
  diaries: readonly Diary[],
): Record<BehaviorType, number> {
  const result: Record<BehaviorType, number> = {
    selfHarm: 0,
    otherHarm: 0,
    destruction: 0,
    other: 0,
  };
  for (const meta of BEHAVIOR_TYPES) {
    result[meta.type] = countBehaviorsIn(diaries, meta.type);
  }
  return result;
}

function labelWithType(type: BehaviorType, label: string): string {
  return (BEHAVIOR_TYPES.find((t) => t.type === type)?.label ?? "") + " · " + label;
}

export type ActivityField =
  | "participation"
  | "reaction"
  | "preSupport"
  | "positiveSupport";

/**
 * 활동별 선택 건수 집계 (FR-38~FR-41).
 * '기타'의 자유 입력은 개별 항목으로 분리하지 않고 '기타'로 합산한다.
 */
export function activityFieldCounts(
  diaries: readonly Diary[],
  field: ActivityField,
  // order: 항목 순서(0건 채우기·같은 건수 정렬 기준). 없으면 코드에 정해 둔 기본 목록을 쓴다
  options: { includeZero?: boolean; order?: readonly string[] } = {},
): CountItem[] {
  const order = options.order ?? CATEGORY_ORDER[field] ?? [];
  const map = new Map<string, number>();
  if (options.includeZero) order.forEach((label) => map.set(label, 0));

  for (const diary of diaries) {
    for (const activity of diary.activities) {
      for (const label of activity[field] as string[]) {
        map.set(label, (map.get(label) ?? 0) + 1);
      }
    }
  }
  return sortByCountThenOrder(map, order);
}

/** 컨디션은 일지별 선택 건수 (FR-42) */
export function conditionCounts(
  diaries: readonly Diary[],
  options: { includeZero?: boolean } = {},
): CountItem[] {
  const order = CATEGORY_ORDER.condition ?? [];
  const map = new Map<string, number>();
  if (options.includeZero) order.forEach((label) => map.set(label, 0));
  for (const diary of diaries) {
    map.set(diary.condition, (map.get(diary.condition) ?? 0) + 1);
  }
  return sortByCountThenOrder(map, order);
}

function sortByCountThenOrder(
  map: Map<string, number>,
  order: readonly string[],
): CountItem[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const ai = order.indexOf(a.label);
      const bi = order.indexOf(b.label);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
}

/** 참여 활동 상세 요약 (FR-53) */
export interface ParticipationSummary {
  totalCount: number;
  kindCount: number;
  otherCount: number;
}

export function participationSummary(diaries: readonly Diary[]): ParticipationSummary {
  let totalCount = 0;
  let otherCount = 0;
  const kinds = new Set<string>();
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      for (const label of activity.participation) {
        totalCount += 1;
        kinds.add(label);
        if (label === OTHER_LABEL && activity.participationOther?.trim()) otherCount += 1;
      }
    }
  }
  return { totalCount, kindCount: kinds.size, otherCount };
}

/**
 * 참여 활동 카테고리별 도전적 행동 건수 (FR-55).
 * 한 활동에서 여러 카테고리를 선택한 경우의 배분 방식은 미확정이다.
 * 시연에서는 선택된 모든 카테고리에 같은 건수를 계상한다 (중복 계상 가능).
 */
export function behaviorCountsByParticipation(
  diaries: readonly Diary[],
  order: readonly string[] = CATEGORY_ORDER.participation ?? [],
): CountItem[] {
  const map = new Map<string, number>();
  order.forEach((label) => map.set(label, 0)); // 0건도 표시한다 (공통 규칙 3)
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      const behaviorCount = countActivityBehaviors(activity);
      if (behaviorCount === 0) continue;
      for (const label of activity.participation) {
        map.set(label, (map.get(label) ?? 0) + behaviorCount);
      }
    }
  }
  return sortByCountThenOrder(map, order);
}

/** 특정 참여 활동에서 기록된 이용자 반응 (FR-56) */
export function reactionCountsForParticipation(
  diaries: readonly Diary[],
  participationLabel: string,
): CountItem[] {
  const order = CATEGORY_ORDER.reaction ?? [];
  const map = new Map<string, number>();
  order.forEach((label) => map.set(label, 0));
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      if (!activity.participation.includes(participationLabel)) continue;
      for (const label of activity.reaction) {
        map.set(label, (map.get(label) ?? 0) + 1);
      }
    }
  }
  return sortByCountThenOrder(map, order);
}

/** 도전적 행동 발생 기록 (FR-49) */
export interface BehaviorRecord {
  diaryId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  /** 유형 · 세부 행동명 */
  labels: string[];
  activityId: string;
}

/** 추이 그래프 데이터 (FR-35) */
export interface TrendPoint {
  label: string;
  count: number;
  isCurrent: boolean;
}

export function behaviorTrend(
  diaries: readonly Diary[],
  userId: string,
  period: StatisticPeriod,
): TrendPoint[] {
  const periods = trendPeriods(period);
  const currentLabel = periodRange(period).label;
  return periods.map((p) => {
    const range = periodRange(p);
    return {
      label: shortPeriodLabel(p),
      count: countBehaviorsIn(completedDiaries(diaries, userId, range), "all"),
      isCurrent: range.label === currentLabel,
    };
  });
}

function shortPeriodLabel(period: StatisticPeriod): string {
  if (period.unit === "month") return (period.month ?? 1) + "월";
  if (period.unit === "quarter") return (period.quarter ?? 1) + "분기";
  if (period.unit === "year") return String(period.year);
  return (period.week ?? 1) + "주차";
}

/** 기간 선택 바텀시트에서 쓰는 선택 가능 연도 범위. 범위는 미확정(FR-30) — 시연 기준 */
export function selectableYears(todayIso: string): number[] {
  const thisYear = parseISODate(todayIso).getFullYear();
  return [thisYear - 2, thisYear - 1, thisYear, thisYear + 1];
}

export function periodLabel(period: StatisticPeriod): string {
  return periodRange(period).label;
}

/** 달력 등에서 쓰는 월 단위 날짜 목록 */
export function monthDates(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, i) => toISODate(new Date(year, month - 1, i + 1)));
}

export function calendarGrid(year: number, month: number): string[] {
  const first = new Date(year, month - 1, 1);
  const start = toISODate(addDaysDate(first, -first.getDay()));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function addDaysDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* ---------- GET /stats/summary ---------- */

/**
 * GET /stats/summary 응답과 같은 값. mock 구현이 쓴다.
 * 백엔드 StatsService가 같은 규칙으로 SQL 집계한다. 규칙을 바꿀 때는 두 곳을 함께 바꾼다.
 *
 * participationOrder: 지금의 참여 활동 목록(이름, 목록 순서). 팀장이 추가한 활동도 들어 있어야
 * 0건 채우기와 활동별 이용자 반응의 기준 목록에 나온다 (백엔드는 DB 목록을 쓴다).
 * 빈 응답용으로 부를 때는 생략하면 코드에 정해 둔 기본 목록을 쓴다.
 */
export function statsSummary(
  diaries: readonly Diary[],
  userId: string,
  period: StatisticPeriod,
  participationOrder: readonly string[] = CATEGORY_ORDER.participation ?? [],
): StatsSummary {
  const range = periodRange(period);
  const completed = completedDiaries(diaries, userId, range);
  const previous = completedDiaries(diaries, userId, periodRange(previousPeriod(period)));
  const prevByType = behaviorCountsByType(previous);
  const typeSummary = {} as StatsSummary["behavior"]["typeSummary"];
  for (const meta of BEHAVIOR_TYPES) {
    const current = behaviorSummary(diaries, userId, period, meta.type);
    typeSummary[meta.type] = {
      count: current.count,
      days: current.days,
      delta: current.count - prevByType[meta.type],
    };
  }
  const summary = behaviorSummary(diaries, userId, period);
  return {
    period: { unit: period.unit, ...range },
    completedDiaries: completed.length,
    behavior: {
      ...summary,
      byType: behaviorCountsByType(completed),
      typeSummary,
      trend: behaviorTrend(diaries, userId, period),
      details: behaviorDetailIdCounts(completed),
      records: behaviorRecordRows(completed),
    },
    participation: activityFieldCounts(completed, "participation", {
      includeZero: true,
      order: participationOrder,
    }),
    reaction: activityFieldCounts(completed, "reaction", { includeZero: true }),
    preSupport: activityFieldCounts(completed, "preSupport", { includeZero: true }),
    positiveSupport: activityFieldCounts(completed, "positiveSupport", { includeZero: true }),
    condition: conditionCounts(completed, { includeZero: true }),
    activities: {
      ...participationSummary(completed),
      behaviorByParticipation: behaviorCountsByParticipation(completed, participationOrder),
      reactionByParticipation: participationOrder.map((label) => ({
        label,
        reaction: reactionCountsForParticipation(completed, label),
      })),
    },
  };
}

/** 세부 행동 코드별 건수 (1건 이상만, 유형 순서 → 목록 순서) */
function behaviorDetailIdCounts(diaries: readonly Diary[]): StatsSummary["behavior"]["details"] {
  const counts = new Map<string, number>();
  const key = (type: BehaviorType, detailId: string) => type + "|" + detailId;
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      if (!activity.hasBehavior) continue;
      for (const entry of behaviorEntries(activity)) {
        counts.set(key(entry.type, entry.detailId), (counts.get(key(entry.type, entry.detailId)) ?? 0) + 1);
      }
    }
  }
  const out: StatsSummary["behavior"]["details"] = [];
  for (const meta of BEHAVIOR_TYPES) {
    const ids = meta.type === "other" ? ["other"] : BEHAVIOR_DETAILS[meta.type].map((d) => d.id);
    for (const detailId of ids) {
      const count = counts.get(key(meta.type, detailId));
      if (count) out.push({ type: meta.type, detailId, count });
    }
  }
  return out;
}

/** 발생 기록 (활동 1개 = 1줄, 날짜·시작 시각 최신순) */
function behaviorRecordRows(diaries: readonly Diary[]): StatsBehaviorRecord[] {
  const records: StatsBehaviorRecord[] = [];
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      if (!activity.hasBehavior) continue;
      const behaviors: StatsBehaviorRecord["behaviors"] = [];
      for (const meta of BEHAVIOR_TYPES) {
        const order = BEHAVIOR_DETAILS[meta.type].map((d) => d.id);
        behaviors.push(...behaviorEntries(activity).filter((entry) => entry.type === meta.type)
          .sort((a, b) => order.indexOf(a.detailId) - order.indexOf(b.detailId)));
      }
      if (behaviors.length === 0) continue;
      records.push({
        diaryId: diary.id,
        date: diary.date,
        startTime: activity.startTime,
        endTime: activity.endTime,
        activityId: activity.id,
        behaviors,
      });
    }
  }
  return records.sort(
    (a, b) => b.date.localeCompare(a.date) || (b.startTime ?? "").localeCompare(a.startTime ?? ""),
  );
}

/* ---------- 통계 응답 → 화면 값 ---------- */

/** 상단 요약. 유형을 고르면 그 유형만 센다 (FR-47). '이전 기록 없음'은 전체 기준 */
export function summaryFor(summary: StatsSummary, filter: BehaviorType | "all"): BehaviorSummary {
  const { behavior } = summary;
  if (filter === "all") {
    return {
      count: behavior.count,
      days: behavior.days,
      delta: behavior.delta,
      previousEmpty: behavior.previousEmpty,
    };
  }
  return { ...behavior.typeSummary[filter], previousEmpty: behavior.previousEmpty };
}

/** 세부 행동별 건수 막대 (FR-48). '전체'에서는 '유형 · 행동' 이름으로 보여 준다 */
export function detailItemsFor(summary: StatsSummary, filter: BehaviorType | "all"): CountItem[] {
  const items: CountItem[] = [];
  for (const detail of summary.behavior.details) {
    if (filter !== "all" && detail.type !== filter) continue;
    if (detail.type === "other") {
      items.push({ label: OTHER_DIRECT_LABEL, count: detail.count });
      continue;
    }
    const label = behaviorDetailLabel(detail.type, detail.detailId);
    items.push({ label: filter === "all" ? labelWithType(detail.type, label) : label, count: detail.count });
  }
  // '기타'만 고른 경우에는 0건이어도 막대 하나를 보여 준다
  if (filter === "other" && items.length === 0) items.push({ label: OTHER_DIRECT_LABEL, count: 0 });
  return items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const OTHER_DIRECT_LABEL = "기타 (직접 입력)";

/** 발생 기록 (FR-49). 고른 유형의 행동이 없는 활동은 뺀다 */
export function recordsFor(summary: StatsSummary, filter: BehaviorType | "all"): BehaviorRecord[] {
  const records: BehaviorRecord[] = [];
  for (const record of summary.behavior.records) {
    const labels = record.behaviors
      .filter((b) => filter === "all" || b.type === filter)
      .map((b) =>
        b.type === "other"
          ? "기타 · " + (b.otherText ?? "")
          : labelWithType(b.type, behaviorDetailLabel(b.type, b.detailId)),
      );
    if (labels.length === 0) continue;
    records.push({
      diaryId: record.diaryId,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      labels,
      activityId: record.activityId,
    });
  }
  return records;
}

/** 이용자 반응 막대 (FR-56) — 고른 참여 활동 기준 */
export function reactionItemsFor(summary: StatsSummary, participationLabel: string): CountItem[] {
  return (
    summary.activities.reactionByParticipation.find((p) => p.label === participationLabel)?.reaction ?? []
  );
}

/** 현재 응답에 유효한 선택을 유지하고, 최초/기간 변경 시 기록이 가장 많은 활동을 고른다. */
export function selectFocusActivity(summary: StatsSummary, preferred?: string): string {
  const options = summary.activities.reactionByParticipation;
  if (preferred && options.some((o) => o.label === preferred)) return preferred;
  const counts = new Map(summary.participation.map((item) => [item.label, item.count]));
  return [...options].sort((a, b) => (counts.get(b.label) ?? 0) - (counts.get(a.label) ?? 0))[0]?.label ?? "";
}

/** 통계 메인 카드는 0건 항목을 빼고 보여 준다 */
export function nonZero(items: readonly CountItem[]): CountItem[] {
  return items.filter((item) => item.count > 0);
}
