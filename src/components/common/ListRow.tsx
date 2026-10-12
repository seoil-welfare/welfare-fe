import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ListRow (프로젝트 컴포넌트).
 * leading / 본문 / 보조 / chevron. 이동은 링크, 동작은 버튼 (가이드 6장).
 * 최소 48px, 스위치가 있는 행은 최소 56px.
 * 제목·보조 문구는 각각 1줄에서 말줄임한다 (가이드 7장).
 */

interface ListRowContentProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  tall?: boolean;
}

function RowInner({
  leading,
  title,
  subtitle,
  trailing,
  showChevron,
  tall,
}: ListRowContentProps) {
  return (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="truncate type-body font-medium text-foreground">{title}</span>
        {subtitle ? (
          <span className="truncate type-caption text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
      {showChevron ? (
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      {tall ? null : null}
    </>
  );
}

const rowClass = (tall?: boolean) =>
  cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
    tall ? "min-h-14" : "min-h-12",
  );

export function ListRowLink({
  to,
  className,
  ...content
}: ListRowContentProps & { to: string; className?: string }) {
  return (
    <Link to={to} className={cn(rowClass(content.tall), "hover:bg-accent", className)}>
      <RowInner {...content} showChevron={content.showChevron ?? true} />
    </Link>
  );
}

export function ListRowButton({
  onClick,
  className,
  disabled,
  ...content
}: ListRowContentProps & { onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        rowClass(content.tall),
        "hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <RowInner {...content} showChevron={content.showChevron ?? true} />
    </button>
  );
}

/** 스위치 등 자체 컨트롤이 있는 행 — 행 자체는 조작하지 않는다 */
export function ListRowStatic({ className, ...content }: ListRowContentProps & { className?: string }) {
  return (
    <div className={cn(rowClass(content.tall ?? true), className)}>
      <RowInner {...content} showChevron={false} />
    </div>
  );
}
