import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, NotebookPen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Avatar, Separator } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import {
  combineQueries,
  useDiaries,
  useNews,
  useServiceUsers,
  useStaffList,
} from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { useDraft } from "@/app/DraftContext";
import { useToday } from "@/lib/today";
import {
  activeServiceUsers,
  eventKindLabel,
  newsItems,
  type NewsItem,
} from "@/services/diaryService";
import { formatDateTime, formatLongDate } from "@/lib/utils";
import type { Diary } from "@/types";

/**
 * 일지 홈 (FR-04~FR-07).
 * - 오늘 날짜와 로그인한 계정명을 표시한다
 * - 오늘의 소식은 최신순 최대 3건. 0건이면 안내 문구
 * - 소식 영역 전체는 0건일 때도 클릭 가능하다. '더 보기'는 당일 3건 이상일 때만 보인다
 * - '오늘 일지 작성'은 담당 이용자에게 오늘 일지가 이미 있으면 새로 만들지 않고 그 일지로 안내한다
 *   (이용자 1명당 하루 1건)
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

  const { draft } = useDraft();
  // 오늘 이미 일지가 있어 새로 만들 수 없을 때 안내 팝업에 띄울 일지
  const [blockedDiary, setBlockedDiary] = useState<Diary | null>(null);

  function handleWriteToday() {
    // 작성하던 내용이 있으면 그대로 이어서 연다
    if (draft) {
      navigate("/diaries/new");
      return;
    }
    // 담당 이용자(1:1 매칭)를 대상으로 한다. 담당이 없으면 오늘 일지가 없는 첫 이용자
    const target =
      users.find((user) => user.assignedStaffId === currentStaff?.id) ??
      users.find((user) => !todayDiaries.some((d) => d.userId === user.id));
    if (!target) {
      toast.info("오늘은 모든 이용자의 일지가 이미 있어요.");
      return;
    }
    const existing = todayDiaries.find((d) => d.userId === target.id);
    if (existing) {
      setBlockedDiary(existing);
      return;
    }
    navigate("/diaries/new?userId=" + target.id);
  }

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
          {/* hero Card는 내용을 한 번 더 감싸므로 Card의 gap이 적용되지 않는다. 간격을 직접 준다 */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-transparent bg-white text-primary hover:bg-white/90"
              disabled={!usersQuery.isSuccess || !todayQuery.isSuccess}
              onClick={handleWriteToday}
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
        </section>
      </div>

      <ConfirmDialog
        open={blockedDiary !== null}
        onOpenChange={(open) => {
          if (!open) setBlockedDiary(null);
        }}
        title={
          blockedDiary?.status === "draft"
            ? "이 이용자는 이 날짜에 작성 중인 일지가 있어요."
            : "이 이용자는 이 날짜에 작성 완료된 일지가 있어요."
        }
        description="일지는 이용자 한 명당 하루 한 건이에요."
        confirmLabel="일지 보기"
        cancelLabel={null}
        tone="default"
        onConfirm={() => {
          if (blockedDiary) navigate("/diaries/" + blockedDiary.id);
        }}
      />
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
