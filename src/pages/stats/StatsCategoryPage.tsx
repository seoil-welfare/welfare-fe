import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { FormSection } from "@/components/common/FormSection";
import { MetricCard } from "@/components/common/MetricCard";
import { HorizontalBars } from "@/components/stats/charts";
import { StatsScopeSection } from "@/components/stats/StatsScopeSection";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, treatPlaceholderAsPending, useServiceUsers } from "@/api/queries";
import { useStatsSummary } from "@/app/useStatsSummary";
import { findServiceUser } from "@/services/diaryService";
import type { ActivityField } from "@/services/statsService";
import { useStatsContext } from "@/app/StatsContext";

/**
 * 기타 카테고리 상세 통계 (/stats/:category).
 * 자료에 상세 목업이 없어 메인 카드의 같은 통계 구조를 확장한 데모 화면이다 (지시서 2장).
 * '자세히' 선택 시 상세 화면 구성은 FR-37·FR-43 미확정 사항이다.
 */

const CATEGORY_META: Record<
  string,
  { title: string; field: ActivityField | "condition"; unitLabel: string }
> = {
  reaction: { title: "이용자 반응 상세", field: "reaction", unitLabel: "활동별 선택 건수" },
  preSupport: { title: "사전 지원 상세", field: "preSupport", unitLabel: "활동별 선택 건수" },
  positiveSupport: {
    title: "긍정행동지원 상세",
    field: "positiveSupport",
    unitLabel: "활동별 선택 건수",
  },
  condition: { title: "컨디션 상세", field: "condition", unitLabel: "일지별 선택 건수" },
};

export function StatsCategoryPage() {
  const usersQuery = useServiceUsers();
  const { category } = useParams();
  const { userId, period } = useStatsContext();
  const { query: statsQuery, summary: stats } = useStatsSummary(userId, period);

  const meta = CATEGORY_META[category ?? ""] ?? {
    title: "통계 상세",
    field: "reaction" as ActivityField,
    unitLabel: "활동별 선택 건수",
  };

  const serviceUser = findServiceUser(usersQuery.data ?? [], userId);

  const items = stats[meta.field];

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const recorded = items.filter((item) => item.count > 0).length;

  // 기간·이용자를 바꾸는 동안 이전 결과로 계산한 수치를 보여 주지 않는다
  const loadState = treatPlaceholderAsPending(combineQueries([usersQuery, statsQuery]), [
    statsQuery,
  ]);
  if (loadState.isPending || loadState.isError) {
    return (
      <AppShell header={<AppHeader title={meta.title} backTo="/stats" />}>
        <div className="flex flex-col gap-3">
          <StatsScopeSection userName={serviceUser?.name} />
          <QueryGate state={loadState}>{() => null}</QueryGate>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<AppHeader title={meta.title} backTo="/stats" />}>
      <div className="flex flex-col gap-3">
        <StatsScopeSection userName={serviceUser?.name} />

        <div className="grid grid-cols-3 gap-3">
          <MetricCard value={total} unit="건" description="전체 선택" />
          <MetricCard value={recorded} unit="종" description="항목 종류" />
          <MetricCard value={stats.completedDiaries} unit="건" description="완료 일지" />
        </div>

        <FormSection title="항목별 기록 건수" description={meta.unitLabel + " 기준"}>
          <HorizontalBars items={items} />
        </FormSection>

      </div>
    </AppShell>
  );
}
