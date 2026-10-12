import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { FormSection } from "@/components/common/FormSection";
import { MetricCard } from "@/components/common/MetricCard";
import { DemoNote, EmptyState } from "@/components/common/states";
import { HorizontalBars } from "@/components/stats/charts";
import { PillToggle } from "@/components/ui/toggle-group";
import { StatsScopeSection } from "@/components/stats/StatsScopeSection";
import { BEHAVIOR_TYPES } from "@/data/catalog";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, treatPlaceholderAsPending, useServiceUsers } from "@/api/queries";
import { useStatsDiaries } from "@/app/useStatsDiaries";
import { useDemo } from "@/demo/DemoContext";
import { findServiceUser } from "@/services/diaryService";
import {
  behaviorCountsByType,
  behaviorDetailCounts,
  behaviorRecords,
  behaviorSummary,
  completedDiaries,
  periodRange,
} from "@/services/statsService";
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
  const { query: diariesQuery, diaries } = useStatsDiaries(userId, period);
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleRecords, setVisibleRecords] = useState(RECORDS_PAGE_SIZE_DEMO_ONLY);

  const range = periodRange(period);
  const completed = useMemo(
    () => completedDiaries(diaries, userId, range),
    [diaries, userId, range],
  );
  const serviceUser = findServiceUser(usersQuery.data ?? [], userId);
  const typeCounts = behaviorCountsByType(completed);

  // 유형 필터가 상단 요약까지 갱신하는지는 미확정이다 (FR-47). 데모 패널에서 켜고 끌 수 있다.
  const summaryFilter: Filter = flags.behaviorFilterUpdatesSummary ? filter : "all";
  const summary = behaviorSummary(diaries, userId, period, summaryFilter);

  const details = behaviorDetailCounts(completed, filter);
  const records = behaviorRecords(completed, filter);

  // 기간·이용자를 바꾸는 동안 이전 결과로 계산한 수치를 보여 주지 않는다
  const loadState = treatPlaceholderAsPending(combineQueries([usersQuery, diariesQuery]), [
    diariesQuery,
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

        <div className="grid grid-cols-3 gap-3">
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
            description={summary.previousEmpty ? "이전 기간 기록 없음" : "이전 기간 대비"}
          />
        </div>

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
          <DemoNote>
            유형 필터가 상단 요약까지 바꾸는 동작은 미확정 제안입니다(FR-47). 현재{" "}
            {flags.behaviorFilterUpdatesSummary ? "요약도 함께 갱신" : "요약은 전체 기준 유지"}{" "}
            상태이며, 데모 패널에서 바꿀 수 있습니다.
          </DemoNote>
        </FormSection>

        <FormSection title="세부 행동별 기록 건수">
          <HorizontalBars
            items={details}
            tone="behavior"
            emptyMessage="이 기간·유형에는 기록이 없어요."
          />
          <DemoNote>
            세부 행동 항목은 모두 ‘예시 항목(확정 필요)’입니다. 0건 세부 행동의 표시 여부도 미확정
            사항입니다(FR-48).
          </DemoNote>
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
          <DemoNote>
            발생 기록의 최초 표시 개수와 추가 조회 방식은 미확정이라 {RECORDS_PAGE_SIZE_DEMO_ONLY}건씩
            보여 줍니다(FR-49). 일지 상세로 이동할 때 해당 활동으로 자동 이동·강조할지도 미확정
            사항입니다(FR-50).
          </DemoNote>
        </FormSection>
      </div>
    </AppShell>
  );
}
