import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarDays, ChevronRight, NotebookPen, SquarePen, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { MainHeader } from "@/components/layout/AppHeader";
import { HomeShortcuts, type Shortcut } from "@/components/home/HomeShortcuts";
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
  findServiceUser,
  isUntouchedDraft,
  newsItems,
  type NewsItem,
} from "@/services/diaryService";
import { addDays, formatShortDate, formatTime, weekdayLabel } from "@/lib/utils";
import type { Diary } from "@/types";

/** 홈에 보여 줄 오늘의 소식 개수 */
const HOME_NEWS_LIMIT = 4;

/** '이어서 작성하기'에 띄울 작성 중 일지를 찾는 기간 */
const DRAFT_LOOKBACK_DAYS = 14;

/**
 * 일지 홈 (FR-04~FR-07).
 * - 상단 바로가기: ① 이어서 작성(쓰던 일지가 있을 때만) ② 일지 작성 ③ 이용자 등록
 * - 오늘 날짜와 로그인한 계정명을 표시한다
 * - 오늘의 소식은 최신순 최대 4건 (FR-07 원안 3건에서 늘림). 0건이면 안내 문구
 * - 소식 영역 전체는 0건일 때도 클릭 가능하다. '더 보기'는 소식 개수와 상관없이 항상 보인다
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
  const recentQuery = useDiaries({ from: addDays(today, -DRAFT_LOOKBACK_DAYS), to: today });
  const newsQuery = useNews(today);

  const users = activeServiceUsers(usersQuery.data ?? []);
  const todayDiaries = todayQuery.data ?? [];
  const todayNews = newsItems(
    newsQuery.data ?? [],
    { serviceUsers: usersQuery.data ?? [], staff: staffQuery.data ?? [] },
    { filter: "all", sinceDate: today },
  );
  const visibleNews = todayNews.slice(0, HOME_NEWS_LIMIT);

  // 최근 2주 안에 내가 쓰다 만 일지 중 가장 최근 것 (① 이어서 작성하기)
  const myDraft = (recentQuery.data ?? [])
    .filter((d) => d.status === "draft" && d.authorId === currentStaff?.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const { draft: rawDraft } = useDraft();
  // 아무것도 입력하지 않은 빈 일지는 '쓰던 일지'로 치지 않는다
  const draft = rawDraft && !isUntouchedDraft(rawDraft) ? rawDraft : null;
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

  const directory = { serviceUsers: usersQuery.data ?? [], staff: staffQuery.data ?? [] };
  const shortcuts: Shortcut[] = [];
  // ① 쓰던 일지가 있을 때만. 화면에 남은 입력(저장 전)이 서버의 작성 중 일지보다 우선한다
  if (draft) {
    const name = findServiceUser(directory.serviceUsers, draft.userId)?.name;
    shortcuts.push({
      id: "continue",
      tone: "continue",
      badge: "이어쓰기",
      title: "이어서 작성하기",
      description: (name ? name + "님 일지 · " : "") + "저장 전 작성 중",
      Icon: SquarePen,
      to: "/diaries/new",
    });
  } else if (myDraft) {
    const name = findServiceUser(directory.serviceUsers, myDraft.userId)?.name;
    shortcuts.push({
      id: "continue",
      tone: "continue",
      badge: "이어쓰기",
      title: "이어서 작성하기",
      description:
        (name ? name + "님 일지 · " : "") +
        (myDraft.date === today
          ? formatTime(myDraft.updatedAt) + "까지 작성함"
          : formatShortDate(myDraft.date) + " 작성 중"),
      Icon: SquarePen,
      to: "/diaries/" + myDraft.id,
    });
  }
  shortcuts.push(
    {
      id: "write",
      tone: "write",
      title: "일지 작성하기",
      description: "오늘 일지 새로 쓰기",
      Icon: NotebookPen,
      onClick: handleWriteToday,
      disabled: !usersQuery.isSuccess || !todayQuery.isSuccess,
    },
    {
      id: "register",
      tone: "register",
      title: "이용자 등록하기",
      description: "새 이용자 추가",
      Icon: UserPlus,
      to: "/users/new",
    },
  );

  return (
    // 오늘의 소식 카드가 하단 바 바로 위까지 늘어난다. 아래 여백은 위 여백(상단바~첫 카드)과 같은 16px
    <AppShell header={<MainHeader />} fill>
      <div className="flex flex-1 flex-col gap-4">
        <HomeShortcuts items={shortcuts} />

        <Card
          variant="form"
          elevation="home"
          className="flex items-center justify-between gap-3 py-3.5"
        >
          <p className="flex min-w-0 items-center gap-2 type-heading">
            <CalendarDays className="size-5 shrink-0 text-brand-gold" aria-hidden />
            <span className="tnum truncate">
              {formatShortDate(today)} {weekdayLabel(today)}요일
            </span>
          </p>
          {currentStaff ? (
            <p className="flex min-w-0 items-center gap-2 type-body">
              <Avatar name={currentStaff.name} className="size-7" />
              <span className="truncate">{currentStaff.name} 선생님</span>
            </p>
          ) : null}
        </Card>

        <QueryGate state={combineQueries([newsQuery, usersQuery, staffQuery])}>
          {() => <TodayNewsCard items={visibleNews} />}
        </QueryGate>
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

function TodayNewsCard({ items: visibleNews }: { items: NewsItem[] }) {
  return (
    <Card variant="list" elevation="home" className="flex flex-1 flex-col">
      {/* 소식 영역은 0건일 때도 눌러서 소식 화면으로 갈 수 있다 (FR-07) */}
      <Link
        to="/news"
        className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 hover:bg-accent"
      >
        <h2 className="type-heading">오늘의 소식</h2>
        {/* '더 보기'는 소식이 몇 건이든 항상 표시한다 (FR-07 원안은 홈 표시 개수 이상일 때만 → 요청으로 변경) */}
        <span className="flex items-center gap-0.5 type-caption font-medium text-muted-foreground">
          더 보기
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </Link>

      {visibleNews.length === 0 ? (
        <EmptyState
          // 늘어난 카드 안에서 세로 가운데에 둔다
          className="flex-1 justify-center"
          message="오늘의 소식이 아직 없습니다"
          action={
            <Button variant="outline" size="dense" className="border-input/40" asChild>
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
                className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-accent"
              >
                <Avatar name={item.serviceUserName} className="size-10" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* 첫 줄: 작성자 → 작업 유형 */}
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate type-body font-medium text-primary">
                      {item.actorName}
                    </span>
                    <Badge
                      variant="soft"
                      tone={item.event.kind === "created" ? "primary" : "warning"}
                      className="shrink-0"
                    >
                      {eventKindLabel(item.event.kind)}
                    </Badge>
                  </span>
                  <span className="truncate type-body">
                    {item.serviceUserName}님 일지를{" "}
                    {item.event.kind === "created" ? "작성했습니다." : "수정했습니다."}
                  </span>
                </span>
                {/* 시간은 행 오른쪽, 세로 가운데 */}
                <span className="shrink-0 tnum type-caption text-muted-foreground">
                  {formatTime(item.event.occurredAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
