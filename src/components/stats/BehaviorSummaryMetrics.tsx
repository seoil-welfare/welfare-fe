import { Info } from "lucide-react";
import { MetricCard } from "@/components/common/MetricCard";
import { formatShortDate } from "@/lib/utils";
import type { BehaviorSummary } from "@/services/statsService";

/**
 * 도전적 행동 요약 카드 3개 (기록 건수 · 발생 일수 · 이전 기간 대비, FR-32~34).
 * 통계 메인과 도전적 행동 상세가 같이 쓴다.
 *
 * 진행 중인 기간(오늘이 기간 안)이면 증감 카드에 '진행 중'을 붙이고 아래에 안내 한 줄을 둔다.
 * 이전 기간은 꽉 찬 기간 전체라서, 덜 찬 이번 기간과 비교한 증감이 실제로 줄어든 것처럼 보이지 않게 한다.
 */
export function BehaviorSummaryMetrics({
  summary,
  inProgress,
  today,
}: {
  summary: BehaviorSummary;
  inProgress: boolean;
  today: string;
}) {
  // 이전 기간 기록이 없으면 증감 자체를 보여 주지 않으므로 진행 중 안내도 필요 없다
  const showProgress = inProgress && !summary.previousEmpty;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <MetricCard
          value={summary.count}
          unit="건"
          description="기록 건수"
          tone={summary.count > 0 ? "behavior" : "default"}
        />
        <MetricCard value={summary.days} unit="일" description="발생 일수" />
        <MetricCard
          value={summary.previousEmpty ? "–" : (summary.delta > 0 ? "+" : "") + summary.delta}
          unit={summary.previousEmpty ? undefined : "건"}
          description={
            summary.previousEmpty
              ? "이전 기간 기록 없음"
              : showProgress
                ? "이전 기간 대비 · 진행 중"
                : "이전 기간 대비"
          }
        />
      </div>
      {showProgress ? (
        <p className="flex items-start gap-1.5 px-1 type-caption text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="break-keep">
            아직 진행 중인 기간이에요. 오늘({formatShortDate(today)})까지의 기록을 이전 기간 전체와
            비교했어요.
          </span>
        </p>
      ) : null}
    </div>
  );
}
