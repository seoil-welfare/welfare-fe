import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, NotebookPen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, Separator } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { DemoNote, EmptyState } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import {
  combineQueries,
  useDiaries,
  useNews,
  useServiceUsers,
  useStaffList,
} from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { useToday } from "@/lib/today";
import {
  activeServiceUsers,
  eventKindLabel,
  newsItems,
  type NewsItem,
} from "@/services/diaryService";
import { formatDateTime, formatLongDate } from "@/lib/utils";

/**
 * 일지 홈 (FR-04~FR-07).
 * - 오늘 날짜와 로그인한 계정명을 표시한다
 * - 오늘의 소식은 최신순 최대 3건. 0건이면 안내 문구
 * - 소식 영역 전체는 0건일 때도 클릭 가능하다. '더 보기'는 당일 3건 이상일 때만 보인다
 */
export function HomePage() {
  const navigate = useNavigate();
  const today = useToday();
  const currentStaff = useCurrentStaff();
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();
  const todayQuery = useDiaries({ from: today, to: today });
  const newsQuery = useNews(today);

  const users = activeServiceUsers(usersQuery.data ?? []);
  const todayDiaries = todayQuery.data ?? [];
  const todayNews = newsItems(
    newsQuery.data ?? [],
    { serviceUsers: usersQuery.data ?? [], staff: staffQuery.data ?? [] },
    { filter: "all", sinceDate: today },
  );
  const visibleNews = todayNews.slice(0, 3);
  const showMore = todayNews.length >= 3;

  const myDraft = todayDiaries.find(
    (d) => d.status === "draft" && d.authorId === currentStaff?.id,
  );

  return (
    <AppShell gutter="home">
      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <span className="type-brand text-primary">원광 일지</span>
          {currentStaff ? <Avatar name={currentStaff.name} /> : null}
        </header>

        <Card variant="form" elevation="home" className="flex flex-col gap-1">
          <p className="tnum type-caption text-muted-foreground">{formatLongDate(today)}</p>
          <p className="type-heading">
            {currentStaff?.name ?? "담당자"} 님, 오늘도 잘 부탁해요.
          </p>
          <p className="type-caption text-muted-foreground">
            {currentStaff?.department} · {currentStaff?.position}
            {currentStaff?.unconfirmedPosition ? " (U4 미확정 예시)" : ""}
          </p>
        </Card>

        {/* 홈 전용 hero 카드. 일반 Card/Button의 배경으로 확장하지 않는다 (가이드 2-3 7번) */}
        <Card variant="hero" elevation="home" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="type-heading">오늘 일지</span>
            <span className="type-caption text-primary-foreground/80">
              {usersQuery.isSuccess && todayQuery.isSuccess
                ? "대상 이용자 " + users.length + "명 · 오늘 저장된 일지 " + todayDiaries.length + "건"
                : "오늘 기록을 불러오는 중…"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-transparent bg-white text-primary hover:bg-white/90"
              onClick={() => navigate("/diaries/new")}
            >
              <Plus aria-hidden />
              오늘 일지 작성
            </Button>
            {myDraft ? (
              <Button
                variant="outline"
                className="border-white/60 bg-transparent text-primary-foreground hover:bg-white/10"
                asChild
              >
                <Link to={"/diaries/" + myDraft.id}>
                  <NotebookPen aria-hidden />
                  이어서 작성
                </Link>
              </Button>
            ) : null}
          </div>
        </Card>

        <section className="flex flex-col gap-2">
          {/* 소식 영역 전체가 0건일 때도 클릭 가능하다 (FR-07) */}
          <Link
            to="/news"
            className="flex items-center justify-between gap-2 rounded-control px-1 py-1 hover:bg-accent"
          >
            <h2 className="type-heading">오늘의 소식</h2>
            <span className="flex items-center gap-1 type-caption text-muted-foreground">
              전체 보기
              <ChevronRight className="size-4" aria-hidden />
            </span>
          </Link>

          <QueryGate state={combineQueries([newsQuery, usersQuery, staffQuery])}>
            {() => <TodayNewsCard items={visibleNews} showMore={showMore} />}
          </QueryGate>
          <DemoNote>
            가상 직원·가상 이용자의 예시 기록입니다. 실제 활동 이력이 아닙니다.
          </DemoNote>
        </section>
      </div>
    </AppShell>
  );
}

function TodayNewsCard({ items: visibleNews, showMore }: { items: NewsItem[]; showMore: boolean }) {
  return (
    <Card variant="list" elevation="home">
      {visibleNews.length === 0 ? (
        <EmptyState
          message="오늘의 소식이 아직 없습니다"
          action={
            <Button variant="outline" size="dense" asChild>
              <Link to="/news">지난 소식 보기</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {visibleNews.map((item) => (
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
                    {item.actorName} · {formatDateTime(item.event.occurredAt)}
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
      )}

      {/* '더 보기'는 당일 활동 내역이 3건 이상일 때만 표시한다 (FR-07) */}
      {showMore ? (
        <>
          <Separator />
          <div className="p-3">
            <Button variant="ghost" block asChild>
              <Link to="/news">더 보기</Link>
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
