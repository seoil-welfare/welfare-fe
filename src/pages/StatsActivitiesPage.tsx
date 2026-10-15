import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { FormSection } from "@/components/common/FormSection";
import { MetricCard } from "@/components/common/MetricCard";
import { HorizontalBars } from "@/components/stats/charts";
import { StatsScopeSection } from "@/components/stats/StatsScopeSection";
import { PillToggle } from "@/components/ui/toggle-group";
import { PARTICIPATION_OPTIONS } from "@/data/catalog";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, treatPlaceholderAsPending, useServiceUsers } from "@/api/queries";
import { useStatsDiaries } from "@/app/useStatsDiaries";
import { findServiceUser } from "@/services/diaryService";
import {
  activityFieldCounts,
  behaviorCountsByParticipation,
  completedDiaries,
  participationSummary,
  periodRange,
  reactionCountsForParticipation,
} from "@/services/statsService";
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
  const { query: diariesQuery, diaries } = useStatsDiaries(userId, period);
  const [focusActivity, setFocusActivity] = useState<string>(PARTICIPATION_OPTIONS[0]);

  const range = periodRange(period);
  const completed = useMemo(
    () => completedDiaries(diaries, userId, range),
    [diaries, userId, range],
  );
  const serviceUser = findServiceUser(usersQuery.data ?? [], userId);
  const summary = participationSummary(completed);

  // 기간·이용자를 바꾸는 동안 이전 결과로 계산한 수치를 보여 주지 않는다
  const loadState = treatPlaceholderAsPending(combineQueries([usersQuery, diariesQuery]), [
    diariesQuery,
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

        <div className="grid grid-cols-3 gap-3">
          <MetricCard value={summary.totalCount} unit="건" description="전체 참여 활동 기록" />
          <MetricCard value={summary.kindCount} unit="종" description="기록된 활동 종류" />
          <MetricCard value={summary.otherCount} unit="건" description="‘기타’ 직접 입력" />
        </div>

        <FormSection title="활동별 참여 건수" description="모든 활동 카테고리를 표시합니다.">
          <HorizontalBars items={activityFieldCounts(completed, "participation", { includeZero: true })} />
        </FormSection>

        <FormSection
          title="활동별 도전적 행동"
          description="도전적 행동이 기록되지 않은 활동도 0건으로 표시합니다."
        >
          <HorizontalBars items={behaviorCountsByParticipation(completed)} tone="behavior" />
        </FormSection>

        <FormSection title="활동별 이용자 반응">
          {/* 기준 참여 활동을 고르는 UI는 목업에 없어 시연용으로 보완했다 (FR-56 미확정) */}
          <PillToggle
            label="기준 참여 활동"
            value={focusActivity}
            onValueChange={setFocusActivity}
            options={PARTICIPATION_OPTIONS.map((label) => ({ value: label, label }))}
          />
          <HorizontalBars items={reactionCountsForParticipation(completed, focusActivity)} />
        </FormSection>
      </div>
    </AppShell>
  );
}
