import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { PillToggle } from "@/components/ui/toggle-group";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState, ListSkeleton } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, useNews, useServiceUsers, useStaffList } from "@/api/queries";
import { useToday } from "@/lib/today";
import {
  eventKindLabel,
  groupNewsByDate,
  newsItems,
  type NewsItem,
} from "@/services/diaryService";
import { addDays, dateGroupLabel, formatTime, relativeDayLabel } from "@/lib/utils";

/**
 * 오늘의 소식 (2.1.3/FR-08 ~ FR-12).
 * - 최초 진입 시 오늘과 어제의 내역을 표시한다
 * - '지난 소식 더 보기'로 2일 전 및 그 이전을 기존 목록에 추가로 불러온다
 *   (한 번에 불러올 날짜 범위는 미확정 — 시연은 3일씩)
 * - 전체 / 등록만 / 수정만 필터는 추가로 불러온 내역에도 유지된다
 */

const LOAD_STEP_DAYS_DEMO_ONLY = 3;

type NewsFilter = "all" | "created" | "updated";

export function NewsPage() {
  const today = useToday();
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [daysBack, setDaysBack] = useState(1); // 오늘 + 어제

  const sinceDate = addDays(today, -daysBack);
  const newsQuery = useNews(sinceDate);
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();
  // 더 불러오는 동안에는 이전 목록을 그대로 보여 준다 (placeholderData)
  const loading = newsQuery.isFetching && newsQuery.isPlaceholderData;

  const directory = { serviceUsers: usersQuery.data ?? [], staff: staffQuery.data ?? [] };
  const entries = newsQuery.data ?? [];
  const items = newsItems(entries, directory, { filter, sinceDate });
  const allCount = newsItems(entries, directory, { filter: "all", sinceDate }).length;
  const createdCount = newsItems(entries, directory, { filter: "created", sinceDate }).length;
  const updatedCount = newsItems(entries, directory, { filter: "updated", sinceDate }).length;

  const oldestLoaded = relativeDayLabel(sinceDate, today);

  function loadMore() {
    setDaysBack((prev) => prev + LOAD_STEP_DAYS_DEMO_ONLY);
  }

  return (
    <AppShell header={<AppHeader title="오늘의 소식" backTo="/home" />}>
      <div className="flex flex-col gap-4">
        <PillToggle
          label="활동 내역 필터"
          // 통계 화면의 이용자·기간 선택과 같은 옅은 테두리 (선택된 pill은 그대로 네이비)
          itemClassName="border-input/40"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: "전체", count: allCount },
            { value: "created", label: "등록만", count: createdCount },
            { value: "updated", label: "수정만", count: updatedCount },
          ]}
        />

        <p className="tnum type-caption text-muted-foreground">
          {oldestLoaded}까지 불러왔어요 · {items.length}건
        </p>

        <QueryGate
          state={combineQueries([newsQuery, usersQuery, staffQuery])}
          skeleton={<ListSkeleton rows={4} />}
        >
          {() => (
            <NewsList items={items} today={today} onShowAll={() => setFilter("all")} />
          )}
        </QueryGate>

        <Button variant="outline" block onClick={loadMore} disabled={loading}>
          {loading ? "불러오는 중…" : "지난 소식 더 보기"}
        </Button>

      </div>
    </AppShell>
  );
}

function NewsList({
  items,
  today,
  onShowAll,
}: {
  items: NewsItem[];
  today: string;
  onShowAll: () => void;
}) {
  if (items.length === 0) {
    return (
      <Card variant="form">
        <EmptyState
          message="해당하는 활동 내역이 없어요."
          action={
            <Button variant="outline" size="dense" onClick={onShowAll}>
              전체 보기
            </Button>
          }
        />
      </Card>
    );
  }

  // 발생 날짜가 바뀌는 지점에서 목록을 끊는다
  return (
    <div className="flex flex-col gap-6">
      {groupNewsByDate(items).map((group) => (
        <section key={group.date} className="flex flex-col gap-2">
          <h2 className="sticky top-14 z-10 -mx-4 bg-background px-5 py-1.5 tnum type-caption font-medium text-muted-foreground xl:top-[77px]">
            {dateGroupLabel(group.date, today)}
            <span className="ml-1.5 font-normal">{group.items.length}건</span>
          </h2>
          <Card variant="list">
            <ul className="divide-y divide-border">
              {group.items.map((item) => (
                <li key={item.event.id}>
                  <Link
                    to={"/diaries/" + item.diary.id}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent"
                  >
                    <Avatar name={item.actorName} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate type-body font-medium">
                        {item.serviceUserName} 님 일지
                      </span>
                      <span className="truncate type-caption text-muted-foreground">
                        {item.actorName} · {formatTime(item.event.occurredAt)}
                        {/* 일지 날짜와 발생 날짜가 다를 때만 어떤 날짜의 일지인지 덧붙인다 */}
                        {item.diary.date !== item.occurredDate
                          ? " · " + relativeDayLabel(item.diary.date, today) + " 일지"
                          : ""}
                      </span>
                    </span>
                    <Badge
                      variant="soft"
                      tone={item.event.kind === "created" ? "primary" : "warning"}
                    >
                      {eventKindLabel(item.event.kind)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
