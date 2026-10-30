import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { MainHeader } from "@/components/layout/AppHeader";
import { FormSection } from "@/components/common/FormSection";
import { MetricCard } from "@/components/common/MetricCard";
import { ChartSkeleton, EmptyState } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { BehaviorDonut, HorizontalBars, TrendBars } from "@/components/stats/charts";
import { PeriodPicker, UnitToggle } from "@/components/stats/PeriodPicker";
import { combineQueries, treatPlaceholderAsPending, useServiceUsers } from "@/api/queries";
import { useStatsSummary } from "@/app/useStatsSummary";
import { useToday } from "@/lib/today";
import { activeServiceUsers } from "@/services/diaryService";
import { currentPeriod, nonZero, periodRange, summaryFor } from "@/services/statsService";
import { useStatsContext } from "@/app/StatsContext";
import type { CountItem } from "@/types";

/**
 * 통계 메인 (2.1.8/FR-29 ~ FR-43).
 * - 이용자·조회 기간·조회 단위 선택이 실제 데이터에 연결된다
 * - 행동 선택 건수 / 발생 일수 / 이전 동기간 대비 증감
 * - 기간 추이 바 차트 + 유형 도넛
 * - 참여활동·이용자 반응·사전 지원·긍정행동지원·컨디션 상위 3개 + 더 보기 + '자세히' 이동
 */
export function StatsPage() {
  const today = useToday();
  const usersQuery = useServiceUsers();
  const { userId, setUserId, period, setPeriod, unit, setUnit } = useStatsContext();
  const { query: statsQuery, summary: stats } = useStatsSummary(userId, period);
  const users = activeServiceUsers(usersQuery.data ?? []);

  const range = periodRange(period);
  const summary = summaryFor(stats, "all");
  const typeCounts = stats.behavior.byType;
  const trend = stats.behavior.trend;

  if (usersQuery.isSuccess && users.length === 0) {
    return (
      <AppShell header={<MainHeader />}>
        <EmptyState message="통계를 볼 이용자가 없어요. 먼저 이용자를 등록해 주세요." />
      </AppShell>
    );
  }

  return (
    <AppShell header={<MainHeader />}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 px-1">
          {/* 화면 이름은 하단 탭에 있어 화면 낭독기용으로만 남긴다 */}
          <h1 className="sr-only">통계</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-40 flex-1">
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger aria-label="통계 조회 이용자" triggerSize="dense" className="border-input/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} 님
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PeriodPicker period={period} onChange={setPeriod} today={today} />
          </div>
          <UnitToggle
            unit={unit}
            onUnitChange={(next) => {
              setUnit(next);
              setPeriod(currentPeriod(next, today));
            }}
          />
          <p className="tnum type-caption text-muted-foreground">
            {range.label} · 작성 완료 일지 {stats.completedDiaries}건 기준 (임시 저장 제외)
          </p>
        </div>

        {/* 기간·이용자를 바꾸는 동안 이전 결과로 계산한 수치를 보여 주지 않는다 */}
        <QueryGate
          state={treatPlaceholderAsPending(combineQueries([usersQuery, statsQuery]), [
            statsQuery,
          ])}
          skeleton={
            <div className="flex flex-col gap-3">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          }
        >
          {() => (
            <>
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h2 className="type-heading">도전적 행동</h2>
                  <Button variant="ghost" size="dense" asChild>
                    <Link to="/stats/behaviors">
                      자세히
                      <ChevronRight aria-hidden />
                    </Link>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    value={summary.count}
                    unit="건"
                    description="기록 건수"
                    tone={summary.count > 0 ? "behavior" : "default"}
                  />
                  <MetricCard value={summary.days} unit="일" description="발생 일수" />
                  <MetricCard
                    value={
                      summary.previousEmpty
                        ? "–"
                        : (summary.delta > 0 ? "+" : "") + summary.delta
                    }
                    unit={summary.previousEmpty ? undefined : "건"}
                    description={summary.previousEmpty ? "이전 기간 기록 없음" : "이전 기간 대비"}
                  />
                </div>

                <FormSection title="기간 추이" description={"단위: 건 · " + range.label + " 강조"}>
                  <TrendBars points={trend} />
                </FormSection>

                <FormSection title="유형별 비율">
                  <BehaviorDonut counts={typeCounts} />
                </FormSection>
              </section>

              <TopItemsSection
                title="참여 활동"
                to="/stats/activities"
                items={nonZero(stats.participation)}
              />
              <TopItemsSection
                title="이용자 반응"
                to="/stats/reaction"
                items={nonZero(stats.reaction)}
              />
              <TopItemsSection
                title="사전 지원"
                to="/stats/preSupport"
                items={nonZero(stats.preSupport)}
              />
              <TopItemsSection
                title="긍정행동지원"
                to="/stats/positiveSupport"
                items={nonZero(stats.positiveSupport)}
              />
              <TopItemsSection
                title="컨디션"
                to="/stats/condition"
                items={nonZero(stats.condition)}
                note="컨디션은 일지별 선택 건수로 셉니다."
              />
            </>
          )}
        </QueryGate>

      </div>
    </AppShell>
  );
}

/** 상위 3개 + '더 보기' + '자세히' (FR-38~FR-43) */
function TopItemsSection({
  title,
  to,
  items,
  note,
}: {
  title: string;
  to: string;
  items: CountItem[];
  note?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > 3;

  return (
    <FormSection
      title={title}
      description={note}
      action={
        <Button variant="ghost" size="dense" asChild>
          <Link to={to}>
            자세히
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState message="이 기간에는 기록이 없어요." />
      ) : (
        <>
          <HorizontalBars items={items} maxVisible={expanded ? undefined : 3} />
          {hasMore ? (
            <Button
              variant="ghost"
              size="dense"
              block
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "접기" : "더 보기 (" + (items.length - 3) + "개)"}
            </Button>
          ) : null}
        </>
      )}
    </FormSection>
  );
}
