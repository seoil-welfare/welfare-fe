import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { PillToggle } from "@/components/ui/toggle-group";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState, ListSkeleton } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { errorMessage } from "@/api/errors";
import {
  combineQueries,
  findOlderNewsDate,
  useNews,
  useServiceUsers,
  useStaffList,
} from "@/api/queries";
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
 * - '지난 소식 더 보기'는 소식이 없는 날을 건너뛰고, 그 이전에 소식이 있는 가장 가까운 날까지
 *   기존 목록에 추가로 불러온다. 1년 전까지 없으면 더 이상 없다고 알린다
 *   (한 번에 불러올 범위는 미확정 — 소식이 있는 하루씩)
 * - 전체 / 등록만 / 수정만 필터는 추가로 불러온 내역에도 유지된다.
 *   다음 날짜를 찾을 때도 지금 고른 필터에 맞는 소식이 있는 날을 찾는다
 */

/** '지난 소식 더 보기'로 거슬러 올라갈 수 있는 최대 기간(일) */
const MAX_LOOKBACK_DAYS = 365;

/** 통계 화면 선택 버튼과 같은 옅은 테두리 */
const SOFT_BORDER = "border-input/40";

type NewsFilter = "all" | "created" | "updated";

export function NewsPage() {
  const today = useToday();
  const client = useQueryClient();
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [sinceDate, setSinceDate] = useState(() => addDays(today, -1)); // 오늘 + 어제
  const [searching, setSearching] = useState(false);
  // 더 이전 소식이 없다고 확인된 필터. 'all'에서 없으면 어떤 필터로도 없다
  const [exhausted, setExhausted] = useState<NewsFilter[]>([]);

  const newsQuery = useNews(sinceDate);
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();
  // 더 불러오는 동안에는 이전 목록을 그대로 보여 준다 (placeholderData)
  const loading = searching || (newsQuery.isFetching && newsQuery.isPlaceholderData);
  const noMore = exhausted.includes("all") || exhausted.includes(filter);

  const directory = { serviceUsers: usersQuery.data ?? [], staff: staffQuery.data ?? [] };
  const entries = newsQuery.data ?? [];
  const items = newsItems(entries, directory, { filter, sinceDate });
  const allCount = newsItems(entries, directory, { filter: "all", sinceDate }).length;
  const createdCount = newsItems(entries, directory, { filter: "created", sinceDate }).length;
  const updatedCount = newsItems(entries, directory, { filter: "updated", sinceDate }).length;

  const oldestLoaded = relativeDayLabel(sinceDate, today);

  async function loadMore() {
    setSearching(true);
    try {
      const found = await findOlderNewsDate(client, {
        before: sinceDate,
        limit: addDays(today, -MAX_LOOKBACK_DAYS),
        filter,
      });
      if (found) {
        setSinceDate(found);
      } else {
        setExhausted((prev) => [...prev, filter]);
      }
    } catch (error) {
      toast.error(errorMessage(error, "지난 소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setSearching(false);
    }
  }

  return (
    <AppShell header={<AppHeader title="오늘의 소식" backTo="/home" />}>
      <div className="flex flex-col gap-4">
        <PillToggle
          label="활동 내역 필터"
          itemClassName={SOFT_BORDER}
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

        <Button
          variant="outline"
          block
          className={SOFT_BORDER}
          onClick={loadMore}
          disabled={loading || noMore}
        >
          {loading ? "불러오는 중…" : noMore ? "더 지난 소식이 없어요" : "지난 소식 더 보기"}
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
            <Button variant="outline" size="dense" className={SOFT_BORDER} onClick={onShowAll}>
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
