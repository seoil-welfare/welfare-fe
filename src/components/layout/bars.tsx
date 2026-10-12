import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BottomActionBar / BottomNoticeBar (가이드 5-4).
 * BottomNav와 같은 화면 하단에서 함께 쓰지 않는다.
 * CTA가 하나면 전체 폭, 보조 동작이 있으면 왼쪽 outline·오른쪽 primary.
 * 같은 바 안의 solid와 outline 버튼은 높이가 같다.
 */
export function BottomActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 py-3 pb-safe",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-180 gap-3">{children}</div>
    </div>
  );
}

/** 다른 담당자가 작성 중인 일지의 하단 안내. 버튼처럼 만들지 않는다 */
export function BottomNoticeBar({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-warning-soft px-4 py-3 pb-safe",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-180 items-start gap-2 text-warning-foreground">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="type-body font-medium">{title}</p>
          <p className="type-caption break-keep">{description}</p>
        </div>
      </div>
    </div>
  );
}
