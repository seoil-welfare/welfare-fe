import { FormSection } from "@/components/common/FormSection";
import { PeriodPicker, UnitToggle } from "@/components/stats/PeriodPicker";
import { useStatsContext } from "@/app/StatsContext";
import { useToday } from "@/lib/today";
import { currentPeriod } from "@/services/statsService";

/**
 * 통계 상세 화면 상단의 조회 대상·기간 (FR-44, FR-45, FR-51, FR-52).
 * 데이터를 다시 불러오는 동안에도 기간을 바꿀 수 있도록 본문과 분리해 둔다.
 */
export function StatsScopeSection({ userName }: { userName?: string }) {
  const today = useToday();
  const { period, setPeriod, unit, setUnit } = useStatsContext();

  return (
    <FormSection>
      <div className="flex flex-col gap-2">
        <h2 className="type-heading">{userName ?? "이용자"} 님</h2>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker period={period} onChange={setPeriod} today={today} />
        </div>
        <UnitToggle
          unit={unit}
          onUnitChange={(next) => {
            setUnit(next);
            setPeriod(currentPeriod(next, today));
          }}
        />
      </div>
    </FormSection>
  );
}
