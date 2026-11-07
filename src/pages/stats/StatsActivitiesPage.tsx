import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { FormSection } from "@/components/common/FormSection";
import { MetricCard } from "@/components/common/MetricCard";
import { HorizontalBars } from "@/components/stats/charts";
import { StatsScopeSection } from "@/components/stats/StatsScopeSection";
import { PillToggle } from "@/components/ui/toggle-group";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, treatPlaceholderAsPending, useServiceUsers } from "@/api/queries";
import { useStatsSummary } from "@/app/useStatsSummary";
import { findServiceUser } from "@/services/diaryService";
import { reactionItemsFor, selectFocusActivity } from "@/services/statsService";
import { useStatsContext } from "@/app/StatsContext";

/**
 * 참여 활동 상세 통계 (2.1.10/FR-51 ~ FR-56).
 * - 전체 활동 건수 / 활동 종류 수 / '기타' 직접 입력 건수 (FR-53)
 * - 활동별 참여 건수 가로 막대 (FR-54)
 * - 활동별 도전적 행동 (FR-55) — behavior 주황
 * - 특정 활동의 이용자 반응 (FR-56) — 기준 카테고리 선택 UI는 시연용 보완
 */
export function StatsActivitiesPage() {
  const usersQuery = useServiceUsers();
  const { userId, period } = useStatsContext();
  const { query: statsQuery, summary: stats } = useStatsSummary(userId, period);
  const scope = JSON.stringify({ userId, period });
  const [selection, setSelection] = useState<{ scope: string; label: string } | null>(null);
  const focusActivity = selectFocusActivity(stats, selection?.scope === scope ? selection.label : undefined);

  const serviceUser = findServiceUser(usersQuery.data ?? [], userId);
  const summary = stats.activities;
  // 서버 통계가 주는 참여 활동 목록(숨긴 항목 포함)을 쓴다. 새로 추가된 활동도 고를 수 있다
  const activityOptions = summary.reactionByParticipation.map(({ label }) => ({ value: label, label }));

  // 기간·이용자를 바꾸는 동안 이전 결과로 계산한 수치를 보여 주지 않는다
  const loadState = treatPlaceholderAsPending(combineQueries([usersQuery, statsQuery]), [
    statsQuery,
  ]);
  if (loadState.isPending || loadState.isError) {
    return (
      <AppShell header={<AppHeader title="참여 활동 상세" backTo="/stats" />}>
        <div className="flex flex-col gap-3">
          <StatsScopeSection userName={serviceUser?.name} />
          <QueryGate state={loadState}>{() => null}</QueryGate>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<AppHeader title="참여 활동 상세" backTo="/stats" />}>
      <div className="flex flex-col gap-3">
        <StatsScopeSection userName={serviceUser?.name} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <MetricCard value={summary.totalCount} unit="건" description="전체 활동" />
          <MetricCard value={summary.kindCount} unit="종" description="활동 종류" />
          <MetricCard value={summary.otherCount} unit="건" description="‘기타’ 입력" />
        </div>

        <FormSection title="활동별 참여 건수" description="모든 활동 카테고리를 표시합니다.">
          <HorizontalBars items={stats.participation} />
        </FormSection>

        <FormSection
          title="활동별 도전적 행동"
          description="도전적 행동이 기록되지 않은 활동도 0건으로 표시합니다."
        >
          <HorizontalBars items={summary.behaviorByParticipation} tone="behavior" />
        </FormSection>

        <FormSection title="활동별 이용자 반응">
          {/* 기준 참여 활동을 고르는 UI는 목업에 없어 시연용으로 보완했다 (FR-56 미확정) */}
          <PillToggle
            label="기준 참여 활동"
            value={focusActivity}
            onValueChange={(label) => setSelection({ scope, label })}
            options={activityOptions}
          />
          <HorizontalBars items={reactionItemsFor(stats, focusActivity)} />
        </FormSection>
      </div>
    </AppShell>
  );
}
