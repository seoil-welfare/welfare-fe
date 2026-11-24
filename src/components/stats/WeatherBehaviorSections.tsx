import { FormSection } from "@/components/common/FormSection";
import { LoadFailureState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/misc";
import { HorizontalBars } from "@/components/stats/charts";
import { useWeatherStats } from "@/api/queries";
import type { WeatherStatsItem } from "@/api/types";
import { errorMessage } from "@/api/errors";

/**
 * 날씨별·온도별 도전적 행동 (복지관 요청, GET /stats/weather).
 * - "비 7건 (5일 중)"처럼 그 날씨였던 날 수를 함께 보여 준다. 날 수는 작성 완료 일지 기준
 * - 그 날씨(구간)였던 날이 없는 줄은 뺀다. 순서는 건수가 아니라 목록 순서 그대로 (날씨끼리 비교하기 쉽게)
 * - 온도를 고르지 않은 일지(온도 칸이 생기기 전 일지 포함)는 온도별에서 빠지므로 아래에 한 줄로 알린다
 * - 유형 필터와 상관없이 전체 유형 기준이다
 */
export function WeatherBehaviorSections({ userId, from, to }: { userId: string; from: string; to: string }) {
  const query = useWeatherStats({ userId, from, to });

  if (query.isError) {
    return (
      <FormSection title="날씨·온도별 도전적 행동">
        <LoadFailureState
          reason={errorMessage(query.error, "날씨별 기록을 불러오지 못했어요.")}
          onRetry={() => void query.refetch()}
        />
      </FormSection>
    );
  }
  // 기간·이용자를 바꾸는 동안 이전 결과를 보여 주지 않는다
  if (query.isPending || query.isPlaceholderData) {
    return (
      <FormSection title="날씨·온도별 도전적 행동">
        <div className="flex flex-col gap-3" role="status" aria-label="불러오는 중">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-1.5 p-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </FormSection>
    );
  }

  const stats = query.data;
  const excluded = stats.temperatureExcluded;
  return (
    <>
      <FormSection title="날씨별 도전적 행동" description="전체 유형 · 작성 완료 일지 기준">
        <HorizontalBars
          items={bars(stats.weather)}
          tone="behavior"
          emptyMessage="이 기간에는 작성 완료 일지가 없어요."
        />
      </FormSection>

      <FormSection title="온도별 도전적 행동" description="전체 유형 · 작성 완료 일지 기준">
        <HorizontalBars
          items={bars(stats.temperature.map((band) => ({ ...band, label: band.label + " " + band.range })))}
          tone="behavior"
          emptyMessage="이 기간에는 온도를 고른 일지가 없어요."
        />
        {excluded.days > 0 ? (
          <p className="tnum type-caption break-keep text-muted-foreground">
            온도를 고르지 않은 일지 {excluded.days}일(도전적 행동 {excluded.behaviorCount}건)은 온도별 집계에서 빠졌어요.
          </p>
        ) : null}
      </FormSection>
    </>
  );
}

/** 그 날씨(구간)였던 날이 있는 줄만, 건수 옆에 "(N일 중)" */
function bars(items: readonly WeatherStatsItem[]) {
  return items
    .filter((item) => item.days > 0)
    .map((item) => ({ label: item.label, count: item.behaviorCount, note: item.days + "일 중" }));
}
