import { MetricCard } from "@/components/common/MetricCard";
import type { BehaviorSummary } from "@/services/statsService";

/**
 * 도전적 행동 요약 카드 3개 (기록 건수 · 발생 일수 · 직전 대비, FR-32~34).
 * 통계 메인과 도전적 행동 상세가 같이 쓴다.
 */
export function BehaviorSummaryMetrics({ summary }: { summary: BehaviorSummary }) {
  return (
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
          description={summary.previousEmpty ? "이전 기록 없음" : "직전 대비"}
        />
    </div>
  );
}
