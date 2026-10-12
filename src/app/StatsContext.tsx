import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useServiceUsers } from "@/api/queries";
import { activeServiceUsers } from "@/services/diaryService";
import { currentPeriod } from "@/services/statsService";
import { useToday } from "@/lib/today";
import type { StatPeriodUnit, StatisticPeriod } from "@/types";

/**
 * 통계 메인에서 선택한 이용자·조회 기간·조회 단위를 상세 화면에서도 유지한다
 * (FR-44, FR-45, FR-51, FR-52).
 */
interface StatsContextValue {
  /** 이용자 목록을 불러오기 전에는 빈 문자열 */
  userId: string;
  setUserId: (userId: string) => void;
  period: StatisticPeriod;
  setPeriod: (period: StatisticPeriod) => void;
  unit: StatPeriodUnit;
  setUnit: (unit: StatPeriodUnit) => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  const usersQuery = useServiceUsers();
  const firstUserId = activeServiceUsers(usersQuery.data ?? [])[0]?.id ?? "";

  // 최초 진입 시 기본 선택 이용자는 미확정(FR-29)이라 첫 번째 활성 이용자를 쓴다.
  const [selectedUserId, setUserId] = useState("");
  // 최초 진입 기본값은 '월'이며 현재 연월이다 (FR-31)
  const [period, setPeriod] = useState<StatisticPeriod>(() => currentPeriod("month", today));

  const value = useMemo<StatsContextValue>(
    () => ({
      userId: selectedUserId || firstUserId,
      setUserId,
      period,
      setPeriod,
      unit: period.unit,
      setUnit: (unit) => setPeriod(currentPeriod(unit, today)),
    }),
    [selectedUserId, firstUserId, period, today],
  );

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStatsContext(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStatsContext must be used inside StatsProvider");
  return ctx;
}
