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
  useDiaries,
  useServiceUsers,
  useStaffList,
} from "@/api/queries";
import { useDemo } from "@/demo/DemoContext";
import { useToday } from "@/lib/today";
import {
  activeServiceUsers,
  countDiaryBehaviors,
  dayCompletion,
  diariesOnDate,
  findStaff,
} from "@/services/diaryService";
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

  // 화면에 보이는 6주(42일)만 불러온다. 선택한 날짜가 그 밖이면 따로 불러온다.
  const grid = calendarGrid(view.year, view.month);
  const monthQuery = useDiaries({ from: grid[0], to: grid[grid.length - 1] });
  const selectedInGrid = selectedDate >= grid[0] && selectedDate <= grid[grid.length - 1];
  const dayQuery = useDiaries({ from: selectedDate, to: selectedDate }, { enabled: !selectedInGrid });
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();

  const monthDiaries = monthQuery.data ?? [];
  const serviceUsers = usersQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const users = activeServiceUsers(serviceUsers);
  const dayDiaries = diariesOnDate(selectedInGrid ? monthDiaries : (dayQuery.data ?? []), selectedDate);

  /**
   * 일지는 이용자 1명당 하루 1건이다.
   * 그래서 아직 일지가 없는 이용자만 새로 작성할 수 있다.
   * 완료·작성 중을 모두 합쳐 대상 이용자 전원이 일지를 가지고 있으면 작성 버튼을 두지 않는다.
   */
  const usersWithoutDiary = users.filter(
    (user) => !dayDiaries.some((diary) => diary.userId === user.id),
  );

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
            completionOf={(date) => dayCompletion(monthDiaries, serviceUsers, date)}
            indicator={flags.calendarIndicator}
          />
          <div className="mt-4 flex flex-col gap-2">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 type-caption text-muted-foreground">
              <li className="tnum">
                {flags.calendarIndicator === "completion"
                  ? "숫자: 완료 일지 수 / 대상 이용자 " + users.length + "명"
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
            월을 옮기는 동안 이전 달 데이터로 이용자별 상태를 그리면 일지가 있는 이용자가
            '미작성'으로 보이고, 누르면 새 일지 작성으로 이동할 수 있다. 갱신 중에는 목록을 막는다.
          */}
          <QueryGate
            state={treatPlaceholderAsPending(
              combineQueries(
                selectedInGrid
                  ? [monthQuery, usersQuery, staffQuery]
                  : [dayQuery, usersQuery, staffQuery],
              ),
              [selectedInGrid ? monthQuery : dayQuery],
            )}
          >
            {() => (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 px-1">
                  <h2 className="type-heading">{formatLongDate(selectedDate)}</h2>
                  <p className="tnum type-caption text-muted-foreground">
                    완료 {dayDiaries.filter((d) => d.status === "completed").length}건 · 작성 중{" "}
                    {dayDiaries.filter((d) => d.status === "draft").length}건 · 대상 {users.length}명
                  </p>
                </div>

                <Card variant="list">
                  {users.length === 0 ? (
                    <EmptyState message="등록된 이용자가 없어요." />
                  ) : (
                    <ul className="divide-y divide-border">
                      {users.map((user) => {
                        const diary = dayDiaries.find((d) => d.userId === user.id);
                        const author = diary ? findStaff(staff, diary.authorId) : undefined;
                        const behaviorCount = diary ? countDiaryBehaviors(diary) : 0;

                        return (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => {
                                if (diary) {
                                  navigate("/diaries/" + diary.id);
                                } else {
                                  // 미작성이면 해당 이용자·날짜로 새 일지 작성으로 이동한다
                                  navigate(
                                    "/diaries/new?userId=" + user.id + "&date=" + selectedDate,
                                  );
                                }
                              }}
                              className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
                            >
                              <Avatar name={user.name} />
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate type-body font-medium">{user.name}</span>
                                <span className="truncate type-caption text-muted-foreground">
                                  {diary
                                    ? (author?.name ?? "알 수 없음") +
                                      " 작성" +
                                      (behaviorCount > 0 ? " · 도전적 행동 " + behaviorCount + "건" : "")
                                    : "일지를 작성하면 여기에 보여요"}
                                </span>
                              </span>
                              {diary ? (
                                <Badge
                                  variant="outline"
                                  tone={diary.status === "completed" ? "primary" : "neutral"}
                                >
                                  {diary.status === "completed" ? "등록" : "작성 중"}
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
                        usersWithoutDiary[0].id +
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
                ) : (
                  // 전원이 일지를 가지고 있으면 작성 CTA를 두지 않고 이유를 알린다 (가이드 9장 14번)
                  <p className="rounded-control bg-muted px-3 py-3 text-center type-caption text-muted-foreground break-keep">
                    이 날짜는 대상 이용자 {users.length}명 모두 일지가 있어요. 일지는 이용자 한 명당
                    하루 한 건이라 새로 작성할 수 없어요.
                  </p>
                )}
              </div>
            )}
          </QueryGate>
        </section>
      </div>
    </AppShell>
  );
}
