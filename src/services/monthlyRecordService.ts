import { BEHAVIOR_DETAILS, BEHAVIOR_TYPES, OTHER_LABEL, behaviorDetailLabel, behaviorTypeLabel } from "@/data/catalog";
import { labelsOf } from "@/services/diaryService";
import { activityFieldCounts, monthDates, type ActivityField } from "@/services/statsService";
import type { Activity, CountItem, Diary, ServiceUser } from "@/types";

/**
 * 월간 기록(월별활동일지 docx) 출력용 값 만들기.
 * 한 이용자의 한 달치 작성 완료 일지를 템플릿(src/assets/forms/monthly-record.template.docx)의 값으로 바꾸는 순수 함수다.
 *
 * 규칙
 * - 일별 표: 일지가 있는 날만 채우고, 없는 날은 날짜만 둔다. 1~16일은 앞 표, 17일~말일은 뒤 표
 * - 대표 활동·주요 지원·전반 반응: 그날 활동들에서 가장 많이 고른 값 하나. 같으면 선택지 순서가 앞선 것 (통계 집계와 같다)
 * - 지원 결과: 일지에 없는 항목이라 그날 도전적 행동 여부와 대표 반응으로 정한다 (SUPPORT_RESULT)
 * - 도전적 행동: 세부 항목별 횟수. 세는 법은 통계와 같다 (상위 '기타'는 내용이 있을 때만 1회)
 * - 월간 요약: 참여활동·지원방법·특이사항만 한 달 통계로 문장을 만들고, 주의사항·종합평가는 손으로 쓰게 비운다
 * - 작성자와 담당 팀장은 비운다 (서명란)
 */

/** 일별 표 한 줄. 키 이름이 템플릿의 {day}, {condition} … 과 같다 */
export interface MonthlyDayRow {
  day: number;
  condition: string;
  activity: string;
  support: string;
  reaction: string;
  result: string;
  behaviors: string;
  /** 그날 도전적 행동 총횟수. 일지가 없는 날은 빈칸 */
  count: number | "";
}

/** 월간 도전적 행동 항목별 누적 (그림 2개에 쓴다) */
export interface BehaviorTotal {
  label: string;
  count: number;
}

/** 템플릿 전체 값. 키 이름이 템플릿의 자리표시자와 같다 */
export interface MonthlyRecordData {
  clientName: string;
  year: number;
  month: number;
  firstHalf: MonthlyDayRow[];
  secondHalf: MonthlyDayRow[];
  summaryParticipation: string;
  summarySupport: string;
  summaryNotes: string;
  summaryCaution: string;
  summaryOverall: string;
}

/** 그림에 넣는 행동 항목 수 (양식 안내: 실제로 발생한 행동만 최대 5개) */
export const MAX_CHART_BEHAVIORS = 5;

/** 대표 반응 → 지원 결과. 도전적 행동이 있던 날은 반응과 상관없이 BEHAVIOR_RESULT */
export const SUPPORT_RESULT: Record<string, string> = {
  "적극적 참여": "자발적 참여·활동 지속",
  "안정적 참여": "안정적으로 마무리",
  "부분적 참여": "추가 안내 후 활동 지속",
  "참여하지 않음": "추가 지원 필요",
};
export const BEHAVIOR_RESULT = "지원 후 안정·재참여";

/** 가상이용자 A_2026-10_월간기록.docx */
export function monthlyRecordFileName(client: ServiceUser, year: number, month: number): string {
  const name = client.name.replace(/[\\/:*?"<>|]/g, "_");
  return name + "_" + year + "-" + String(month).padStart(2, "0") + "_월간기록.docx";
}

/** 그 달의 첫날과 말일 (YYYY-MM-DD) */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const dates = monthDates(year, month);
  return { from: dates[0], to: dates[dates.length - 1] };
}

// 세부 항목 이름이 여러 영역에 있으면(예: 꼬집기) 영역을 붙여 구분한다
const DUPLICATE_DETAIL_LABELS = (() => {
  const seen = new Map<string, number>();
  for (const meta of BEHAVIOR_TYPES) {
    for (const detail of BEHAVIOR_DETAILS[meta.type]) seen.set(detail.label, (seen.get(detail.label) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([label]) => label));
})();

/** 도전적 행동 항목 이름과 정렬 순서. 세부 '기타'·상위 '기타'는 적은 내용을 쓴다 */
function behaviorItems(activity: Activity): { label: string; order: number }[] {
  if (!activity.hasBehavior) return [];
  return activity.behaviors.flatMap((selection) => {
    const typeIndex = BEHAVIOR_TYPES.findIndex((t) => t.type === selection.type);
    const area = behaviorTypeLabel(selection.type);
    const otherText = selection.otherText?.trim();
    if (selection.type === "other") return otherText ? [{ label: otherText, order: typeIndex * 100 + 99 }] : [];
    return [...new Set(selection.detailIds)].map((id) => {
      const detailIndex = BEHAVIOR_DETAILS[selection.type].findIndex((d) => d.id === id);
      const detail = behaviorDetailLabel(selection.type, id);
      let label = detail;
      if (detail === OTHER_LABEL) label = otherText || area + " 기타";
      else if (DUPLICATE_DETAIL_LABELS.has(detail)) label = area + " " + detail;
      return { label, order: typeIndex * 100 + detailIndex };
    });
  });
}

/** 도전적 행동 항목별 횟수. 많은 순, 같으면 영역·세부 항목 순서 */
export function behaviorTotals(diaries: readonly Diary[]): BehaviorTotal[] {
  const map = new Map<string, { count: number; order: number }>();
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      for (const item of behaviorItems(activity)) {
        const prev = map.get(item.label);
        map.set(item.label, { count: (prev?.count ?? 0) + 1, order: Math.min(prev?.order ?? Infinity, item.order) });
      }
    }
  }
  return [...map]
    .sort(([, a], [, b]) => b.count - a.count || a.order - b.order)
    .map(([label, { count }]) => ({ label, count }));
}

/** 그날 가장 많이 고른 값. '기타'면 처음 적힌 내용을 붙인다 */
function topLabel(diary: Diary, field: ActivityField): string {
  const top = activityFieldCounts([diary], field)[0]?.label;
  if (!top) return "";
  if (top !== OTHER_LABEL) return top;
  const otherKey = (field + "Other") as "participationOther" | "preSupportOther" | "reactionOther" | "positiveSupportOther";
  const otherText = diary.activities.map((a) => a[otherKey]).find((text) => text?.trim());
  return labelsOf([OTHER_LABEL], otherText)[0];
}

function dayRow(day: number, diary: Diary | undefined): MonthlyDayRow {
  if (!diary) {
    return { day, condition: "", activity: "", support: "", reaction: "", result: "", behaviors: "", count: "" };
  }
  const totals = behaviorTotals([diary]);
  const count = totals.reduce((sum, item) => sum + item.count, 0);
  const topReaction = activityFieldCounts([diary], "reaction")[0]?.label ?? ""; // '기타' 내용을 붙이기 전 값
  return {
    day,
    condition: labelsOf([diary.condition], diary.conditionOther)[0],
    activity: topLabel(diary, "participation"),
    support: topLabel(diary, "preSupport"),
    reaction: topLabel(diary, "reaction"),
    result: count > 0 ? BEHAVIOR_RESULT : (SUPPORT_RESULT[topReaction] ?? "-"),
    behaviors: count > 0 ? totals.map((item) => item.label + " " + item.count + "회").join(", ") : "-",
    count,
  };
}

/** 위에서 n개 이름을 '·'로 잇는다. 0회 항목과 '없음'은 뺀다 */
function topNames(items: readonly CountItem[], n: number): string {
  return items
    .filter((item) => item.count > 0 && item.label !== "없음")
    .slice(0, n)
    .map((item) => item.label)
    .join("·");
}

function summaryParticipation(diaries: readonly Diary[]): string {
  const participation = topNames(activityFieldCounts(diaries, "participation"), 3);
  const reaction = activityFieldCounts(diaries, "reaction")[0]?.label;
  if (!participation) return "";
  return participation + " 참여가 많았음." + (reaction ? " 가장 많은 반응은 " + reaction + "." : "");
}

/** 항목 이름에 따라 조사(을/를)가 달라지지 않게 '…은 이름.' 꼴로 끝낸다 */
function summarySupport(diaries: readonly Diary[]): string {
  const pre = topNames(activityFieldCounts(diaries, "preSupport"), 3);
  const positive = topNames(activityFieldCounts(diaries, "positiveSupport"), 3);
  const parts = [pre && "자주 사용한 사전 지원은 " + pre + ".", positive && "긍정행동지원은 " + positive + "."];
  return parts.filter(Boolean).join(" ");
}

function summaryNotes(diaries: readonly Diary[], totals: readonly BehaviorTotal[]): string {
  const total = totals.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return "이번 달 도전적 행동 없음.";
  const days = diaries.filter((d) => behaviorTotals([d]).length > 0).length;
  const items = totals.slice(0, MAX_CHART_BEHAVIORS).map((item) => item.label + " " + item.count + "회").join(", ");
  const more = totals.length > MAX_CHART_BEHAVIORS ? " 외 " + (totals.length - MAX_CHART_BEHAVIORS) + "개 항목" : "";
  return "도전적 행동 " + days + "일, 총 " + total + "회 (" + items + more + ").";
}

/** diaries: 이 이용자의 그 달 작성 완료 일지 (부르는 쪽이 고른다) */
export function monthlyRecordData(
  diaries: readonly Diary[],
  client: ServiceUser,
  year: number,
  month: number,
): MonthlyRecordData {
  const byDate = new Map(diaries.map((d) => [d.date, d]));
  const rows = monthDates(year, month).map((date, i) => dayRow(i + 1, byDate.get(date)));
  const totals = behaviorTotals(diaries);
  return {
    clientName: client.name,
    year,
    month,
    firstHalf: rows.slice(0, 16),
    secondHalf: rows.slice(16),
    summaryParticipation: summaryParticipation(diaries),
    summarySupport: summarySupport(diaries),
    summaryNotes: summaryNotes(diaries, totals),
    summaryCaution: "",
    summaryOverall: "",
  };
}
