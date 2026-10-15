import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

/**
 * 결과 필터 전용 (가이드 6장).
 * 폼 응답에는 Checkbox/RadioGroup을 쓰고 ToggleGroup을 섞지 않는다.
 * 항상 하나가 선택되어 있고, 같은 항목을 다시 눌러도 해제되지 않는다 (가이드 9장 13번).
 */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** 필터에 표시하는 건수 (FR-47) */
  count?: number;
}

/** 회색 연결형 바 + 흰 활성 세그먼트 — 주/월/분기/연간 */
export function SegmentedToggle<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      className={cn("flex w-full gap-1 rounded-control bg-secondary p-1", className)}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "flex min-h-10 flex-1 items-center justify-center gap-1 rounded-[8px] px-2",
            "type-body font-medium text-muted-foreground transition-colors duration-150",
            "data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:font-bold",
          )}
        >
          <span>{option.label}</span>
          {option.count !== undefined ? (
            <span className="tnum type-caption">{option.count}</span>
          ) : null}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

/** 떨어진 pill, 활성은 네이비 — 전체/등록만/수정만, 행동 유형 필터 */
export function PillToggle<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
  itemClassName,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  label: string;
  className?: string;
  /** 각 pill에 덧붙일 클래스 (예: 화면별로 테두리를 옅게) */
  itemClassName?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-input bg-card px-3",
            "type-body font-medium text-foreground transition-colors duration-150",
            "hover:bg-accent",
            "data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
            itemClassName,
          )}
        >
          <span>{option.label}</span>
          {option.count !== undefined ? (
            <span className="tnum type-caption opacity-80">{option.count}건</span>
          ) : null}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
