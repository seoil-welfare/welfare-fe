import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 2026-10-07 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 2026년 10월 7일 (수) — 가이드 10장 긴 형식 */
export function formatLongDate(iso: string): string {
  const date = parseISODate(iso);
  return (
    date.getFullYear() +
    "년 " +
    (date.getMonth() + 1) +
    "월 " +
    date.getDate() +
    "일 (" +
    WEEKDAYS[date.getDay()] +
    ")"
  );
}

/** 10월 7일 — 가이드 10장 짧은 형식 */
export function formatShortDate(iso: string): string {
  const date = parseISODate(iso);
  return date.getMonth() + 1 + "월 " + date.getDate() + "일";
}

/** 2026. 10. 07. — 숫자만 점으로 끊은 형식. 소식 카드에서 어떤 날짜의 일지인지 보여 줄 때 쓴다 */
export function formatDotDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y + ". " + m + ". " + d + ".";
}

export function weekdayLabel(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()];
}

/** 24시간제, 범위는 물결표 — 가이드 10장 */
export function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return "시간 미입력";
  if (start && end) return start + "~" + end;
  return start ?? end ?? "";
}

export function formatDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return d.getMonth() + 1 + "월 " + d.getDate() + "일 " + hh + ":" + mm;
}

/** ISO datetime에서 24시간제 시각만 뽑는다. 날짜를 머리글에서 이미 보여 줄 때 쓴다 */
export function formatTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

export function relativeDayLabel(iso: string, todayIso: string): string {
  const diff = daysBetween(todayIso, iso);
  if (diff === 0) return "오늘";
  if (diff === -1) return "어제";
  if (diff === -2) return "그저께";
  return formatShortDate(iso);
}

/** ISO datetime을 로컬 기준 'YYYY-MM-DD'로 바꾼다 */
export function dateOf(isoDateTime: string): string {
  return toISODate(new Date(isoDateTime));
}

/** 목록을 날짜로 끊을 때 쓰는 머리글. '오늘 · 10월 11일' / '10월 8일 (목)' */
export function dateGroupLabel(iso: string, todayIso: string): string {
  const diff = daysBetween(todayIso, iso);
  const short = formatShortDate(iso);
  if (diff === 0) return "오늘 · " + short;
  if (diff === -1) return "어제 · " + short;
  if (diff === -2) return "그저께 · " + short;
  return short + " (" + weekdayLabel(iso) + ")";
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime();
  return Math.round(ms / 86400000);
}

export function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix + "-" + rand + Date.now().toString(36).slice(-4);
}

/** 재현 가능한 fixture 생성을 위한 시드 난수 (mulberry32) */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickSome<T>(
  items: readonly T[],
  rand: () => number,
  min: number,
  max: number,
): T[] {
  const count = min + Math.floor(rand() * (max - min + 1));
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}

/** 분기 계산: 1~3월 1분기 (계획서 통계 기간 선택 규칙) */
export function quarterOf(month1to12: number): 1 | 2 | 3 | 4 {
  return (Math.floor((month1to12 - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}
