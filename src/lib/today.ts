import { useEffect, useState } from "react";
import { toISODate } from "@/lib/utils";

/** 오늘 날짜 'YYYY-MM-DD' (기기 시간대 기준) */
export function todayIso(): string {
  return toISODate(new Date());
}

/** 앱을 켜 둔 채 자정을 넘겨도 '오늘'이 바뀌도록 1분마다 확인한다 */
export function useToday(): string {
  const [today, setToday] = useState(todayIso);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayIso()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}
