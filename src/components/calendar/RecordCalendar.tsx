import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  indicator,
}: {
  year: number;
  month: number;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  completionOf: (date: string) => DayCompletion | null;
  /** DEMO_ONLY — 'completion' (이번 회의 제안안, 기본) / 'gauge' (기존 가이드 비교용) */
  indicator: "completion" | "gauge";
}) {
  const days = calendarGrid(year, month);

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
        <h2 className="tnum type-title" aria-live="polite">
          {year}년 {month}월
        </h2>
        <Button variant="ghost" size="icon" aria-label="다음 달" onClick={() => shiftMonth(1)}>
          <ChevronRight aria-hidden />
        </Button>
      </div>

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
              indicator={indicator}
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

function DayCell({
  date,
  month,
  selected,
  isToday,
  completion,
  indicator,
  onSelect,
}: {
  date: string;
  month: number;
  selected: boolean;
  isToday: boolean;
  completion: DayCompletion | null;
  indicator: "completion" | "gauge";
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
              isToday && "border-2 border-primary",
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

      {/* 일지가 전혀 저장되지 않은 날짜에는 지표를 표시하지 않는다 (지시서 4.3) */}
      {completion ? (
        indicator === "completion" ? (
          <span
            className={cn(
              "tnum type-caption leading-none",
              selected ? "text-primary-foreground/90" : "text-muted-foreground",
            )}
          >
            {indicatorText}
          </span>
        ) : (
          <Gauge
            completed={completion.completed}
            total={completion.total}
            selected={selected}
          />
        )
      ) : (
        <span className="h-3" aria-hidden />
      )}

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

/** 기존 UI 가이드 7장의 원형 게이지 — 비교용 (DEMO_ONLY) */
function Gauge({
  completed,
  total,
  selected,
}: {
  completed: number;
  total: number;
  selected: boolean;
}) {
  const ratio = total > 0 ? completed / total : 0;
  const radius = 5;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <circle
        cx={7}
        cy={7}
        r={radius}
        fill="none"
        strokeWidth={2}
        stroke={selected ? "rgb(255 255 255 / 0.35)" : "var(--secondary)"}
      />
      <circle
        cx={7}
        cy={7}
        r={radius}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        stroke={selected ? "#ffffff" : "var(--chart-1)"}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}
