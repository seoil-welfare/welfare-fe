import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { MainHeader } from "@/components/layout/AppHeader";
import { RecordCalendar } from "@/components/calendar/RecordCalendar";
import { EmptyState } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import {
  combineQueries,
  treatPlaceholderAsPending,
  useCalendarDay,
  useCalendarDays,
  useStaffList,
} from "@/api/queries";
import { useDemo } from "@/demo/DemoContext";
import { useToday } from "@/lib/today";
import { findStaff, type DayCompletion } from "@/services/diaryService";
import { calendarGrid } from "@/services/statsService";
import { formatLongDate, parseISODate } from "@/lib/utils";

/**
 * 달력 (2.1.7 — 정식 FR 미작성).
 * 날짜 지표는 이번 회의 제안안인 완료 비율 N/3을 기본값으로 쓴다 (지시서 4.3).
 * 승인 전 제안이며, 데모 패널에서 기존 원형 게이지와 비교할 수 있다.
 * 1024px 이상에서 가용 폭을 충족할 때만 달력 + 상세 2열이다 (가이드 5-2).
 */
export function CalendarPage() {
  const { flags } = useDemo();
  const navigate = useNavigate();
  const today = useToday();

  const [selectedDate, setSelectedDate] = useState(today);
  const initial = parseISODate(today);
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth() + 1,
  });

  // 달력 칸은 화면에 보이는 6주(42일)의 숫자만, 날짜 목록은 선택한 날짜만 불러온다.
  const grid = calendarGrid(view.year, view.month);
  const monthQuery = useCalendarDays({ from: grid[0], to: grid[grid.length - 1] });
  const dayQuery = useCalendarDay(selectedDate);
  const staffQuery = useStaffList();

  const completionByDate = new Map<string, DayCompletion>(
    (monthQuery.data ?? []).map((day) => [
      day.date,
      {
        completed: day.completed,
        total: day.target,
        saved: day.completed + day.draft,
        hasBehavior: day.hasBehavior,
      },
    ]),
  );
  const statuses = dayQuery.data ?? [];
  const staff = staffQuery.data ?? [];

  // 일지는 이용자 1명당 하루 1건이라, 일지가 없는 이용자만 새로 작성할 수 있다
  const usersWithoutDiary = statuses.filter((s) => s.canCreate);

  return (
    <AppShell width="full" header={<MainHeader />}>
      <div className="mx-auto flex w-full max-w-360 flex-col gap-6 lg:flex-row lg:items-start">
        <Card variant="form" className="min-w-0 flex-1 lg:min-w-120">
          {/* 화면 이름은 하단 탭에 있어 화면 낭독기용으로만 남긴다 */}
          <h1 className="sr-only">달력</h1>
          <RecordCalendar
            year={view.year}
            month={view.month}
            selectedDate={selectedDate}
            today={today}
            onSelectDate={setSelectedDate}
            onMonthChange={(year, month) => setView({ year, month })}
            completionOf={(date) => completionByDate.get(date) ?? null}
            indicator={flags.calendarIndicator}
          />
          <div className="mt-4 flex flex-col gap-2">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 type-caption text-muted-foreground">
              <li className="tnum">
                {flags.calendarIndicator === "completion"
                  ? "숫자: 완료 일지 수 / 대상 이용자 " + statuses.length + "명"
                  : "원형 게이지: 완료 비율 (비교용)"}
              </li>
              <li className="flex items-center gap-1">
                <span aria-hidden className="size-1.5 rounded-full bg-behavior" />
                도전적 행동 기록 있음
              </li>
            </ul>
          </div>
        </Card>

        {/* 모바일은 달력 아래, 1024px 이상에서는 옆에 놓는다 */}
        <section className="w-full min-w-0 lg:w-90 lg:shrink-0 xl:w-101">
          {/*
            날짜를 바꾸는 동안 이전 날짜 데이터로 이용자별 상태를 그리면 일지가 있는 이용자가
            '미작성'으로 보이고, 누르면 새 일지 작성으로 이동할 수 있다. 갱신 중에는 목록을 막는다.
          */}
          <QueryGate
            // 달력 칸 숫자를 못 불러온 경우도 여기서 알린다. 칸만 비면 일지가 없는 달로 오해할 수 있다
            state={treatPlaceholderAsPending(
              combineQueries([monthQuery, dayQuery, staffQuery]),
              [dayQuery],
            )}
          >
            {() => (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 px-1">
                  <h2 className="type-heading">{formatLongDate(selectedDate)}</h2>
                  <p className="tnum type-caption text-muted-foreground">
                    완료 {statuses.filter((s) => s.status === "completed").length}건 · 작성 중{" "}
                    {statuses.filter((s) => s.status === "draft").length}건 · 대상 {statuses.length}명
                  </p>
                </div>

                <Card variant="list">
                  {statuses.length === 0 ? (
                    <EmptyState message="등록된 이용자가 없어요." />
                  ) : (
                    <ul className="divide-y divide-border">
                      {statuses.map((user) => {
                        const author = user.authorId ? findStaff(staff, user.authorId) : undefined;

                        return (
                          <li key={user.clientId}>
                            <button
                              type="button"
                              onClick={() => {
                                if (user.diaryId) {
                                  navigate("/diaries/" + user.diaryId);
                                } else {
                                  // 미작성이면 해당 이용자·날짜로 새 일지 작성으로 이동한다
                                  navigate(
                                    "/diaries/new?userId=" + user.clientId + "&date=" + selectedDate,
                                  );
                                }
                              }}
                              className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
                            >
                              <Avatar name={user.clientName} />
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate type-body font-medium">{user.clientName}</span>
                                <span className="truncate type-caption text-muted-foreground">
                                  {user.status !== "none"
                                    ? (author?.name ?? "알 수 없음") +
                                      " 작성" +
                                      (user.behaviorCount > 0
                                        ? " · 도전적 행동 " + user.behaviorCount + "건"
                                        : "")
                                    : "일지를 작성하면 여기에 보여요"}
                                </span>
                              </span>
                              {user.status !== "none" ? (
                                <Badge
                                  variant="outline"
                                  tone={user.status === "completed" ? "primary" : "neutral"}
                                >
                                  {user.status === "completed" ? "등록" : "작성 중"}
                                </Badge>
                              ) : (
                                <span className="flex shrink-0 items-center gap-1 type-caption text-muted-foreground">
                                  <Plus className="size-4" aria-hidden />
                                  미작성
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                {usersWithoutDiary.length > 0 ? (
                  // 아직 일지가 없는 이용자를 대상으로 작성 화면을 연다
                  <Button variant="dashed" asChild>
                    <Link
                      to={
                        "/diaries/new?userId=" +
                        usersWithoutDiary[0].clientId +
                        "&date=" +
                        selectedDate
                      }
                    >
                      <Plus aria-hidden />이 날짜에 일지 작성
                      <span className="tnum type-caption text-muted-foreground">
                        남은 {usersWithoutDiary.length}명
                      </span>
                    </Link>
                  </Button>
                ) : null /* 전원이 일지를 가지고 있으면 작성 버튼을 두지 않는다. 목록의 상태 배지로 알 수 있다 */}
              </div>
            )}
          </QueryGate>
        </section>
      </div>
    </AppShell>
  );
}
