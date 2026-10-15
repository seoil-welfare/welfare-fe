import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { SegmentedToggle } from "@/components/ui/toggle-group";
import { periodLabel, selectableYears, weekCountOfMonth } from "@/services/statsService";
import type { StatPeriodUnit, StatisticPeriod } from "@/types";
import { cn } from "@/lib/utils";

/**
 * 조회 단위 선택 + 기간 선택 바텀시트 (FR-30, FR-31).
 * 바텀시트는 조회 단위에 따라 연도·월·분기·주차를 독립 스크롤 목록으로 제공한다.
 * '주간 통계 제거'는 미확정이므로 시연에서는 '주'를 유지한다 (지시서 4.4).
 * 선택값의 즉시 적용 또는 확인 버튼 적용 방식은 미확정 — 시연은 확인 버튼을 쓴다.
 */

const UNIT_OPTIONS: readonly { value: StatPeriodUnit; label: string }[] = [
  { value: "week", label: "주" },
  { value: "month", label: "월" },
  { value: "quarter", label: "분기" },
  { value: "year", label: "연간" },
];

export function UnitToggle({
  unit,
  onUnitChange,
  className,
}: {
  unit: StatPeriodUnit;
  onUnitChange: (unit: StatPeriodUnit) => void;
  className?: string;
}) {
  return (
    <SegmentedToggle
      label="통계 조회 단위"
      value={unit}
      onValueChange={onUnitChange}
      options={UNIT_OPTIONS}
      className={className}
    />
  );
}

export function PeriodPicker({
  period,
  onChange,
  today,
  className,
}: {
  period: StatisticPeriod;
  onChange: (period: StatisticPeriod) => void;
  today: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<StatisticPeriod>(period);
  const years = selectableYears(today);

  function openSheet(next: boolean) {
    if (next) setPending(period);
    setOpen(next);
  }

  const weekCount = weekCountOfMonth(pending.year, pending.month ?? 1);

  return (
    <Dialog open={open} onOpenChange={openSheet}>
      <DialogTrigger asChild>
        <Button variant="outline" size="dense" className={cn("gap-2 border-input/40", className)}>
          <CalendarRange aria-hidden />
          <span className="tnum">{periodLabel(period)}</span>
        </Button>
      </DialogTrigger>
      <SheetContent title="조회 기간">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <WheelColumn
              label="연도"
              values={years.map((y) => ({ value: String(y), label: y + "년" }))}
              selected={String(pending.year)}
              onSelect={(value) => setPending({ ...pending, year: Number(value) })}
            />
            {pending.unit === "month" || pending.unit === "week" ? (
              <WheelColumn
                label="월"
                values={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1),
                  label: i + 1 + "월",
                }))}
                selected={String(pending.month ?? 1)}
                onSelect={(value) => setPending({ ...pending, month: Number(value), week: 1 })}
              />
            ) : null}
            {pending.unit === "quarter" ? (
              <WheelColumn
                label="분기"
                values={[1, 2, 3, 4].map((q) => ({ value: String(q), label: q + "분기" }))}
                selected={String(pending.quarter ?? 1)}
                onSelect={(value) => setPending({ ...pending, quarter: Number(value) })}
              />
            ) : null}
            {pending.unit === "week" ? (
              <WheelColumn
                label="주차"
                values={Array.from({ length: weekCount }, (_, i) => ({
                  value: String(i + 1),
                  label: i + 1 + "주차",
                }))}
                selected={String(pending.week ?? 1)}
                onSelect={(value) => setPending({ ...pending, week: Number(value) })}
              />
            ) : null}
          </div>

          <div className="flex gap-3 pb-2 pt-1">
            <DialogClose asChild>
              <Button variant="outline" block>
                취소
              </Button>
            </DialogClose>
            <Button
              block
              onClick={() => {
                onChange(pending);
                setOpen(false);
              }}
            >
              기간 적용
            </Button>
          </div>
        </div>
      </SheetContent>
    </Dialog>
  );
}

/** 독립 스크롤 선택 목록. 선택된 값은 강조하고 나머지는 시각적으로 구분한다 */
function WheelColumn({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="type-caption text-muted-foreground">{label}</span>
      <ul
        className="h-48 overflow-y-auto rounded-control border border-input bg-muted p-1"
        aria-label={label}
      >
        {values.map((item) => {
          const active = item.value === selected;
          return (
            <li key={item.value}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(item.value)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center rounded-control px-2",
                  "tnum type-body transition-colors duration-150",
                  active
                    ? "bg-primary font-bold text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
