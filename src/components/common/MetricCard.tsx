import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 3열 통계 요약 — 수치(display) + 단위 + 설명(caption) (가이드 7장) */
export function MetricCard({
  value,
  unit,
  description,
  tone = "default",
  size = "default",
  className,
}: {
  value: ReactNode;
  unit?: string;
  description: string;
  tone?: "default" | "behavior";
  /** compact: 숫자가 아닌 글자 값(예: 날씨)을 한 줄에 맞게 작게 보여 준다 */
  size?: "default" | "compact";
  className?: string;
}) {
  return (
    <Card variant="metric" className={cn("flex flex-col gap-1", className)}>
      <span
        className={cn(
          // compact도 칸 높이를 display 한 줄(2rem)과 같게 둬서, 옆 카드와 설명 줄 위치가 맞게 한다.
          // type-title이 line-height를 덮어쓰므로 줄 높이가 아니라 칸 높이로 맞춘다
          size === "compact" ? "flex min-h-8 items-center type-title break-keep" : "type-display tnum",
          tone === "behavior" ? "text-behavior" : "text-foreground",
        )}
      >
        {value}
        {unit ? <span className="ml-0.5 type-body font-medium">{unit}</span> : null}
      </span>
      <span className="type-caption text-muted-foreground break-keep">{description}</span>
    </Card>
  );
}
