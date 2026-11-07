import { BEHAVIOR_DETAILS, BEHAVIOR_TYPES, OTHER_LABEL, behaviorDetailLabel, behaviorTypeLabel } from "@/data/catalog";
import { behaviorEntries, labelsOf } from "@/services/diaryService";
import { activityFieldCounts, monthDates, type ActivityField } from "@/services/statsService";
import { reportDiaries } from "@/services/exportService";
import type { Activity, CountItem, Diary, ServiceUser, Staff } from "@/types";

/**
 * 월간 기록(월별활동일지 docx) 출력용 값 만들기.
 * 한 이용자의 한 달치 작성 완료 일지를 템플릿(src/assets/forms/monthly-record.template.docx)의 값으로 바꾸는 순수 함수다.
 *
 * 규칙
 * - 일별 표: 일지가 있는 날만 채우고, 없는 날은 날짜만 둔다. 1~16일은 앞 표, 17일~말일은 뒤 표
 * - 대표 활동·주요 지원·전반 반응: 그날 활동들에서 가장 많이 고른 값 하나. 같으면 선택지 순서가 앞선 것 (통계 집계와 같다)
 * - 도전적 행동: 통계와 같은 세부 항목 선택 건수. 실제 발생 횟수나 지원 결과를 추정하지 않는다
 * - 특이사항은 입력 원문을 보존한다. 저장되지 않은 목표·평가·지원 결과 필드는 만들지 않는다
 * - 작성자는 저장된 authorId를 직원 목록과 대조한다. 이름을 찾지 못하면 비운다
 */

/** 일별 표 한 줄. 키 이름이 템플릿의 {day}, {condition} … 과 같다 */
export interface MonthlyDayRow {
  day: number;
  condition: string;
  activity: string;
  support: string;
  reaction: string;
  remarks: string;
  behaviors: string;
  /** 그날 도전적 행동 선택 건수. 일지가 없는 날은 빈칸 */
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
  authorNames: string;
  year: number;
  month: number;
  firstHalf: MonthlyDayRow[];
  secondHalf: MonthlyDayRow[];
  summaryParticipation: string;
  summarySupport: string;
  summaryNotes: string;
}

/** 그림에 넣는 행동 항목 수 (양식 안내: 실제로 발생한 행동만 최대 5개) */
export const MAX_CHART_BEHAVIORS = 5;

/** 가상이용자 A_2026-10_월간기록.docx */
export function monthlyRecordFileName(client: ServiceUser, year: number, month: number): string {
  const name = client.name.replace(/[\\/:*?"<>|]/g, "_");
  return name + "_" + year + "-" + String(month).padStart(2, "0") + "_월별활동일지.docx";
}

/** 그 달의 첫날과 말일 (YYYY-MM-DD) */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const dates = monthDates(year, month);
  return { from: dates[0], to: dates[dates.length - 1] };
}

/** 도전적 행동 항목 이름과 정렬 순서. 세부 '기타'·상위 '기타'는 적은 내용을 쓴다 */
function behaviorItems(activity: Activity): { label: string; order: number }[] {
  return behaviorEntries(activity).map(({ type, detailId, otherText }) => {
    const typeIndex = BEHAVIOR_TYPES.findIndex((t) => t.type === type);
    const area = behaviorTypeLabel(type);
    const detailIndex = BEHAVIOR_DETAILS[type].findIndex((d) => d.id === detailId);
    const detail = type === "other" ? OTHER_LABEL : behaviorDetailLabel(type, detailId);
    const label = type === "other" ? area + "(" + otherText + ")"
      : area + " " + (detail === OTHER_LABEL && otherText ? "기타(" + otherText + ")" : detail);
    return { label, order: typeIndex * 100 + (type === "other" ? 99 : detailIndex) };
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
    return { day, condition: "", activity: "", support: "", reaction: "", remarks: "", behaviors: "", count: "" };
  }
  const totals = behaviorTotals([diary]);
  const count = totals.reduce((sum, item) => sum + item.count, 0);
  const behaviors = count > 0 ? totals.map((item) => item.label + " " + item.count + "건").join(", ") : "-";
  return {
    day,
    condition: labelsOf([diary.condition], diary.conditionOther)[0],
    activity: topLabel(diary, "participation"),
    support: topLabel(diary, "preSupport"),
    reaction: topLabel(diary, "reaction"),
    remarks: [diary.notes, count > 0 ? "행동 선택 기록: " + behaviors : ""].filter(Boolean).join("\n"),
    behaviors,
    count,
  };
}

/** 위에서 n개 이름을 '·'로 잇는다. 0회 항목과 '없음'은 뺀다 */
function topNames(items: readonly CountItem[], n: number): string {
  return items
    .filter((item) => item.count > 0 && item.label !== "없음")
    .slice(0, n)
    .map((item) => item.label + " " + item.count + "건")
    .join("·");
}

function summaryParticipation(diaries: readonly Diary[]): string {
  const participation = topNames(activityFieldCounts(diaries, "participation"), 3);
  const reaction = activityFieldCounts(diaries, "reaction")[0]?.label;
  if (!participation) return "";
  return "참여 활동 선택 기록: " + participation + "." + (reaction ? " 가장 많이 선택한 반응: " + reaction + "." : "");
}

/** 항목 이름에 따라 조사(을/를)가 달라지지 않게 '…은 이름.' 꼴로 끝낸다 */
function summarySupport(diaries: readonly Diary[]): string {
  const pre = topNames(activityFieldCounts(diaries, "preSupport"), 3);
  const positive = topNames(activityFieldCounts(diaries, "positiveSupport"), 3);
  const parts = [pre && "사전 지원 선택 기록: " + pre + ".", positive && "긍정행동지원 선택 기록: " + positive + "."];
  return parts.filter(Boolean).join(" ");
}

function summaryNotes(diaries: readonly Diary[], totals: readonly BehaviorTotal[]): string {
  const total = totals.reduce((sum, item) => sum + item.count, 0);
  if (!diaries.length) return "";
  const days = diaries.filter((d) => behaviorTotals([d]).length > 0).length;
  const items = totals.slice(0, MAX_CHART_BEHAVIORS).map((item) => item.label + " " + item.count + "건").join(", ");
  const more = totals.length > MAX_CHART_BEHAVIORS ? " 외 " + (totals.length - MAX_CHART_BEHAVIORS) + "개 항목" : "";
  const summary = "도전적 행동 선택 기록 " + days + "일, 총 " + total + "건" + (total ? " (" + items + more + ")." : ".");
  return [summary, ...diaries.filter((d) => d.notes.trim()).map((d) => d.date + ": " + d.notes)].join("\n");
}

/** diaries: 이 이용자의 그 달 작성 완료 일지 (부르는 쪽이 고른다) */
export function monthlyRecordData(
  diaries: readonly Diary[],
  client: ServiceUser,
  year: number,
  month: number,
  staff: readonly Staff[] = [],
): MonthlyRecordData {
  const { from, to } = monthRange(year, month);
  diaries = reportDiaries(diaries, client.id, from, to);
  const byDate = new Map(diaries.map((d) => [d.date, d]));
  const rows = monthDates(year, month).map((date, i) => dayRow(i + 1, byDate.get(date)));
  const totals = behaviorTotals(diaries);
  return {
    clientName: client.name,
    authorNames: [...new Set(diaries.map((d) => staff.find((person) => person.id === d.authorId)?.name).filter(Boolean))].join(", "),
    year,
    month,
    firstHalf: rows.slice(0, 16),
    secondHalf: rows.slice(16),
    summaryParticipation: summaryParticipation(diaries),
    summarySupport: summarySupport(diaries),
    summaryNotes: summaryNotes(diaries, totals),
  };
}
