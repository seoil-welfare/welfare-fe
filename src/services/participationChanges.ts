import type { Activity } from "@/types";

type Rename = { previous: string; next: string };
const listeners = new Set<(rename: Rename) => void>();

/** 관리 화면에서 바꾼 이름을 메모리에 열려 있는 입력에도 반영한다. 기록 자체는 DB 항목 ID로 유지된다. */
export function publishParticipationRename(previous: string, next: string): void {
  if (previous !== next) listeners.forEach((listener) => listener({ previous, next }));
}
export function subscribeParticipationRename(listener: (rename: Rename) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function renameActivityParticipation(activity: Activity, previous: string, next: string): Activity {
  if (!activity.participation.includes(previous)) return activity;
  return { ...activity, participation: [...new Set(activity.participation.map((label) => label === previous ? next : label))] };
}
