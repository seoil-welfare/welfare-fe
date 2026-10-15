import type { ReactNode } from "react";
import { Inbox, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

/** Empty — '기록이 없어요' + 다음에 할 수 있는 동작 하나 (가이드 8장) */
export function EmptyState({
  message,
  action,
  className,
}: {
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-8 text-center", className)}>
      <Inbox className="size-8 text-muted-foreground" aria-hidden />
      <p className="type-body text-muted-foreground break-keep">{message}</p>
      {action}
    </div>
  );
}

/** 불러오기 실패 — Empty와 구분한다. 원인 문구 + 다시 시도 (가이드 8장) */
export function LoadFailureState({
  onRetry,
  reason = "기록을 불러오지 못했어요. 네트워크 상태를 확인해 주세요.",
  className,
}: {
  onRetry: () => void;
  reason?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-8 text-center", className)}>
      <RotateCcw className="size-8 text-destructive" aria-hidden />
      <p className="type-body text-foreground break-keep">{reason}</p>
      <Button variant="outline" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}

/** 목록·달력·통계의 첫 로딩 Skeleton — 실제 배치와 같은 모양 (가이드 8장) */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} variant="form" className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </Card>
      ))}
      <span className="sr-only">불러오는 중</span>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card variant="form" className="flex flex-col gap-3" role="status" aria-label="불러오는 중">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full rounded-card" />
      <span className="sr-only">불러오는 중</span>
    </Card>
  );
}

