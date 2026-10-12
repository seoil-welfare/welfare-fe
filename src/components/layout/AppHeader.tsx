import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * AppHeader (프로젝트 컴포넌트).
 * 모바일·태블릿 콘텐츠 높이 56px, 상단 고정. 데스크톱은 Sidebar 레이아웃의 Header 77px.
 * 상태바·홈 인디케이터는 웹 UI로 그리지 않는다 (가이드 5-4).
 */
export function AppHeader({
  title,
  backTo,
  closeTo,
  action,
  className,
}: {
  title: string;
  /** 이전 경로. 생략하면 history back */
  backTo?: string;
  /** 닫기 경로 (X 아이콘) */
  closeTo?: string;
  action?: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  const showBack = backTo !== undefined || closeTo === undefined;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-14 items-center gap-1 border-b border-border bg-card px-1",
        "shadow-[var(--shadow-app-header)] xl:min-h-[77px] xl:px-4",
        className,
      )}
    >
      {closeTo !== undefined ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="닫기"
          onClick={() => navigate(closeTo)}
          className="shrink-0"
        >
          <X aria-hidden />
        </Button>
      ) : showBack ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="이전 화면으로"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="shrink-0"
        >
          <ChevronLeft aria-hidden />
        </Button>
      ) : null}
      <h1 className="min-w-0 flex-1 truncate px-2 type-title">{title}</h1>
      {action ? <div className="flex shrink-0 items-center gap-1 pr-1">{action}</div> : null}
    </header>
  );
}
