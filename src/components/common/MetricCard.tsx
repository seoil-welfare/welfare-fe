import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 3열 통계 요약 — 수치(display) + 단위 + 설명(caption) (가이드 7장) */
export function MetricCard({
  value,
  unit,
  description,
  tone = "default",
  className,
}: {
  value: ReactNode;
  unit?: string;
  description: string;
  tone?: "default" | "behavior";
  className?: string;
}) {
  return (
    <Card variant="metric" className={cn("flex flex-col gap-1", className)}>
      <span
        className={cn(
          "type-display tnum",
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
