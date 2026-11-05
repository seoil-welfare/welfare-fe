import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { calendarGrid } from "@/services/statsService";
import { parseISODate } from "@/lib/utils";
import type { DayCompletion } from "@/services/diaryService";
import { cn } from "@/lib/utils";

/**
 * RecordCalendar (프로젝트 컴포넌트).
 * Calendar는 날짜 표시·탐색만 재사용하고 날짜 셀을 직접 구성한다 (가이드 6장, 7장).
 * - 진행률 / 선택(네이비 배경) / 행동 유무(점)를 각각 따로 표시한다. 한 상태가 다른 상태를 덮지 않는다
 * - 일요일 calendar-sunday, 토요일 calendar-saturday, 월 바깥 날짜는 muted이며 누르면 그 달로 이동한다
 * - 선택한 날짜는 네이비 배경, 오늘은 네이비 테두리. 같은 날이면 선택 표시가 우선한다
 * - 요일 머리글은 모바일·데스크톱 모두 표시한다
 * - 'YYYY년 M월' 제목을 누르면 연·월을 골라 바로 이동한다 (MonthPicker)
 */

const WEEKDAY_HEADS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function RecordCalendar({
  year,
  month,
  selectedDate,
  today,
  onSelectDate,
  onMonthChange,
  completionOf,
}: {
  year: number;
  month: number;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  completionOf: (date: string) => DayCompletion | null;
}) {
  const days = calendarGrid(year, month);
  const [pickerOpen, setPickerOpen] = useState(false);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    onMonthChange(next.getFullYear(), next.getMonth() + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label="이전 달" onClick={() => shiftMonth(-1)}>
          <ChevronLeft aria-hidden />
        </Button>
        <h2 className="type-title">
          <Button
            variant="ghost"
            size="dense"
            aria-label={year + "년 " + month + "월, 연도와 달 선택"}
            aria-haspopup="dialog"
            onClick={() => setPickerOpen(true)}
            className="tnum type-title gap-1"
          >
            <span aria-live="polite">
              {year}년 {month}월
            </span>
            <ChevronDown aria-hidden className="text-muted-foreground" />
          </Button>
        </h2>
        <Button variant="ghost" size="icon" aria-label="다음 달" onClick={() => shiftMonth(1)}>
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <MonthPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        year={year}
        month={month}
        today={today}
        onPick={(y, m) => {
          onMonthChange(y, m);
          setPickerOpen(false);
        }}
      />

      <div role="grid" aria-label={year + "년 " + month + "월 일지 현황"}>
        <div role="row" className="grid grid-cols-7">
          {WEEKDAY_HEADS.map((head, index) => (
            <div
              key={head}
              role="columnheader"
              className={cn(
                "py-2 text-center type-caption font-medium",
                index === 0 && "text-calendar-sunday",
                index === 6 && "text-calendar-saturday",
                index > 0 && index < 6 && "text-muted-foreground",
              )}
            >
              {head}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date) => (
            <DayCell
              key={date}
              date={date}
              month={month}
              selected={date === selectedDate}
              isToday={date === today}
              completion={completionOf(date)}
              onSelect={() => {
                const d = parseISODate(date);
                // 월 바깥 날짜를 누르면 그 달로 이동한다 (disabled가 아니다)
                if (d.getMonth() + 1 !== month) onMonthChange(d.getFullYear(), d.getMonth() + 1);
                onSelectDate(date);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 연·월 선택 창. 연도는 화살표로 넘기고, 달은 12칸 중에서 고른다 */
function MonthPicker({
  open,
  onOpenChange,
  year,
  month,
  today,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number; // 지금 달력에 보이는 연도
  month: number;
  today: string;
  onPick: (year: number, month: number) => void;
}) {
  const [shownYear, setShownYear] = useState(year); // 창 안에서 넘겨 보는 연도
  const todayDate = parseISODate(today);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setShownYear(year); // 열 때마다 보고 있던 연도에서 시작
        onOpenChange(next);
      }}
    >
      <DialogContent title="연도와 달 선택" className="max-w-90">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" aria-label="이전 연도" onClick={() => setShownYear(shownYear - 1)}>
            <ChevronLeft aria-hidden />
          </Button>
          <span className="tnum type-heading" aria-live="polite">
            {shownYear}년
          </span>
          <Button variant="ghost" size="icon" aria-label="다음 연도" onClick={() => setShownYear(shownYear + 1)}>
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const selected = shownYear === year && m === month;
            const isThisMonth = shownYear === todayDate.getFullYear() && m === todayDate.getMonth() + 1;
            return (
              <Button
                key={m}
                variant={selected ? "default" : "ghost"}
                size="dense"
                aria-pressed={selected}
                aria-current={isThisMonth ? "date" : undefined}
                onClick={() => onPick(shownYear, m)}
                className={cn("tnum", !selected && isThisMonth && "ring-2 ring-inset ring-primary")}
              >
                {m}월
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DayCell({
  date,
  month,
  selected,
  isToday,
  completion,
  onSelect,
}: {
  date: string;
  month: number;
  selected: boolean;
  isToday: boolean;
  completion: DayCompletion | null;
  onSelect: () => void;
}) {
  const d = parseISODate(date);
  const outside = d.getMonth() + 1 !== month;
  const weekday = d.getDay();

  const indicatorText = completion
    ? completion.completed + "/" + completion.total
    : null;

  const label =
    d.getFullYear() +
    "년 " +
    (d.getMonth() + 1) +
    "월 " +
    d.getDate() +
    "일" +
    (completion ? ", 완료 " + completion.completed + "건 / 대상 " + completion.total + "명" : ", 저장된 일지 없음") +
    (isToday ? ", 오늘" : "");

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={label}
      aria-selected={selected}
      aria-current={isToday ? "date" : undefined}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-control px-0.5 py-1",
        "transition-colors duration-150",
        // 선택 표시가 오늘 표시보다 우선한다
        selected
          ? "bg-primary text-primary-foreground"
          : cn(
              "hover:bg-accent",
              // 테두리(border)는 칸 크기에 더해져 안 내용이 밀린다. 안쪽 링은 크기에 영향이 없다
              isToday && "ring-2 ring-inset ring-primary",
              // 달 바깥 날짜는 이번 달 날짜와 한눈에 구분되게 옅게 둔다 (지표·점까지 함께)
              outside
                ? "text-muted-foreground opacity-45"
                : weekday === 0
                  ? "text-calendar-sunday"
                  : weekday === 6
                    ? "text-calendar-saturday"
                    : "text-foreground",
            ),
      )}
    >
      <span className="tnum type-body font-medium">{d.getDate()}</span>

      {/*
        일지가 전혀 저장되지 않은 날짜에는 지표를 표시하지 않는다 (지시서 4.3).
        지표 자리는 내용이 없어도 같은 높이로 둔다. 높이가 달라지면 날짜 숫자가 칸마다 들쭉날쭉해진다
      */}
      <span aria-hidden className="flex h-4 items-center justify-center">
        {completion ? (
          <span
            className={cn(
              "tnum text-xs leading-none",
              selected ? "text-primary-foreground/90" : "text-muted-foreground",
            )}
          >
            {indicatorText}
          </span>
        ) : null}
      </span>

      {/* 행동 유무는 진행률·선택과 독립적인 점으로 표시한다 */}
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          completion?.hasBehavior
            ? selected
              ? "bg-white"
              : "bg-behavior"
            : "bg-transparent",
        )}
      />
    </button>
  );
}
