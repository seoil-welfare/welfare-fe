import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { FormSection } from "@/components/common/FormSection";
import { EmptyState } from "@/components/common/states";
import { HorizontalBars } from "@/components/stats/charts";
import { PillToggle } from "@/components/ui/toggle-group";
import { StatsScopeSection } from "@/components/stats/StatsScopeSection";
import { BEHAVIOR_TYPES } from "@/data/catalog";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, treatPlaceholderAsPending, useServiceUsers } from "@/api/queries";
import { useStatsSummary } from "@/app/useStatsSummary";
import { useDemo } from "@/demo/DemoContext";
import { findServiceUser } from "@/services/diaryService";
import {
  detailItemsFor,
  isPeriodInProgress,
  periodRange,
  recordsFor,
  summaryFor,
} from "@/services/statsService";
import { BehaviorSummaryMetrics } from "@/components/stats/BehaviorSummaryMetrics";
import { useToday } from "@/lib/today";
import { useStatsContext } from "@/app/StatsContext";
import { formatShortDate, formatTimeRange, weekdayLabel } from "@/lib/utils";
import type { BehaviorType } from "@/types";

/**
 * 도전적 행동 상세 통계 (2.1.9/FR-44 ~ FR-50).
 * - 조회 이용자·기간·단위는 통계 메인에서 가져와 유지한다
 * - '전체/타해/자해/파괴행동/기타' 필터에 각 유형의 건수를 표시한다
 * - 세부 행동별 가로 막대 + 발생 기록 최신순, 기록 선택 시 일지 상세로 이동
 */

const RECORDS_PAGE_SIZE_DEMO_ONLY = 5;

type Filter = BehaviorType | "all";

export function StatsBehaviorsPage() {
  const { flags } = useDemo();
  const usersQuery = useServiceUsers();
  const { userId, period } = useStatsContext();
  const today = useToday();
  const { query: statsQuery, summary: stats } = useStatsSummary(userId, period);
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleRecords, setVisibleRecords] = useState(RECORDS_PAGE_SIZE_DEMO_ONLY);

  const serviceUser = findServiceUser(usersQuery.data ?? [], userId);
  const typeCounts = stats.behavior.byType;

  // 유형 필터가 상단 요약까지 갱신하는지는 미확정이다 (FR-47). 데모 패널에서 켜고 끌 수 있다.
  const summaryFilter: Filter = flags.behaviorFilterUpdatesSummary ? filter : "all";
  const summary = summaryFor(stats, summaryFilter);

  const details = detailItemsFor(stats, filter);
  const records = recordsFor(stats, filter);

  // 기간·이용자를 바꾸는 동안 이전 결과로 계산한 수치를 보여 주지 않는다
  const loadState = treatPlaceholderAsPending(combineQueries([usersQuery, statsQuery]), [
    statsQuery,
  ]);
  if (loadState.isPending || loadState.isError) {
    return (
      <AppShell header={<AppHeader title="도전적 행동 상세" backTo="/stats" />}>
        <div className="flex flex-col gap-3">
          <StatsScopeSection userName={serviceUser?.name} />
          <QueryGate state={loadState}>{() => null}</QueryGate>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<AppHeader title="도전적 행동 상세" backTo="/stats" />}>
      <div className="flex flex-col gap-3">
        <StatsScopeSection userName={serviceUser?.name} />

        <BehaviorSummaryMetrics
          summary={summary}
          inProgress={isPeriodInProgress(periodRange(period), today)}
          today={today}
        />

        <FormSection title="유형 필터">
          <PillToggle
            label="도전적 행동 유형"
            value={filter}
            onValueChange={(next) => {
              setFilter(next);
              setVisibleRecords(RECORDS_PAGE_SIZE_DEMO_ONLY);
            }}
            options={[
              {
                value: "all" as Filter,
                label: "전체",
                count: BEHAVIOR_TYPES.reduce((sum, t) => sum + typeCounts[t.type], 0),
              },
              ...BEHAVIOR_TYPES.map((meta) => ({
                value: meta.type as Filter,
                label: meta.label,
                count: typeCounts[meta.type],
              })),
            ]}
          />
        </FormSection>

        <FormSection title="세부 행동별 기록 건수">
          <HorizontalBars
            items={details}
            tone="behavior"
            emptyMessage="이 기간·유형에는 기록이 없어요."
          />
        </FormSection>

        <FormSection
          title="발생 기록"
          description={records.length + "건 · 최신순"}
        >
          {records.length === 0 ? (
            <EmptyState message="이 기간·유형에는 발생 기록이 없어요." />
          ) : (
            <>
              <Card variant="list">
                <ul className="divide-y divide-border">
                  {records.slice(0, visibleRecords).map((record, index) => (
                    <li key={record.diaryId + record.activityId + index}>
                      <Link
                        to={"/diaries/" + record.diaryId}
                        className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent"
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="tnum type-body font-medium">
                            {formatShortDate(record.date)} ({weekdayLabel(record.date)}){" · "}
                            {formatTimeRange(record.startTime, record.endTime)}
                          </span>
                          <span className="type-caption text-behavior break-keep">
                            {record.labels.join(", ")}
                          </span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              {visibleRecords < records.length ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleRecords((prev) => prev + RECORDS_PAGE_SIZE_DEMO_ONLY)
                  }
                  className="min-h-11 rounded-control type-body font-medium text-primary hover:bg-accent"
                >
                  더 보기 ({records.length - visibleRecords}건)
                </button>
              ) : null}
            </>
          )}
        </FormSection>
      </div>
    </AppShell>
  );
}
