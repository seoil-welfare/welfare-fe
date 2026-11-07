import type { Activity } from "@/types";

/** 종료 24:00은 1440분. 시작에는 허용하지 않는다. */
export function activityMinutes(value: string | undefined, end = false): number | null {
  if (!value) return null;
  if (end && value === "24:00") return 1440;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function activityTimeError(activity: Activity, others: readonly Activity[]): string | undefined {
  const start = activityMinutes(activity.startTime);
  const end = activityMinutes(activity.endTime, true);
  if (start === null || end === null) return "시작·종료 시간을 모두 골라 주세요.";
  if (end <= start) return "종료 시간은 시작 시간보다 늦어야 해요.";
  if (others.some((other) => {
    if (other.id === activity.id) return false;
    const otherStart = activityMinutes(other.startTime);
    const otherEnd = activityMinutes(other.endTime, true);
    return otherStart !== null && otherEnd !== null && start < otherEnd && end > otherStart;
  })) return "활동 시간이 다른 활동과 겹쳐요.";
  return undefined;
}
