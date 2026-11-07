import { daysBetween } from "@/lib/utils";
import type { Diary } from "@/types";

/** 조회 응답에서도 대상·기간·완료 여부를 확인하고, 동일 날짜는 최신 저장본만 출력한다. */
export function reportDiaries(diaries: readonly Diary[], userId: string, from: string, to: string): Diary[] {
  const byDate = new Map<string, Diary>();
  for (const diary of diaries) {
    if (diary.userId !== userId || diary.status !== "completed" || diary.date < from || diary.date > to) continue;
    const previous = byDate.get(diary.date);
    if (!previous || diary.updatedAt > previous.updatedAt) byDate.set(diary.date, diary);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const MAX_BUNDLE_DAYS = 92;

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function bundleRangeError(from: string, to: string, today: string): string | undefined {
  if (!from || !to) return "시작일과 종료일을 모두 골라 주세요.";
  if (!isDate(from) || !isDate(to)) return "시작일과 종료일을 올바른 날짜로 골라 주세요.";
  if (from > to) return "시작일이 종료일보다 늦어요.";
  if (to > today) return "오늘 이후 날짜는 출력할 수 없어요.";
  if (daysBetween(from, to) + 1 > MAX_BUNDLE_DAYS) return "한 번에 3개월(92일)까지 출력할 수 있어요.";
  return undefined;
}
