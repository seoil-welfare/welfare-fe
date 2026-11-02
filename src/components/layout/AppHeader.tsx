import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/BrandMark";
import { useNotificationSettings, useNotificationSummary } from "@/api/queries";
import { cn } from "@/lib/utils";

/**
 * MainHeader (프로젝트 컴포넌트).
 * 하단 탭으로 바로 가는 화면(홈·달력·통계·마이페이지)의 상단바. 로고 + 알림 종.
 * 한 단계 더 들어간 화면은 AppHeader(뒤로가기 + 제목)를 쓴다.
 * 데스크톱(1280+)은 Sidebar에 로고가 있어 숨긴다.
 */
export function MainHeader() {
  const summary = useNotificationSummary().data;
  const settings = useNotificationSettings().data;
  // 서버는 알림을 꺼도 수를 세어 준다. 점을 보일지는 설정을 보고 정한다
  const hasNews = Boolean(settings?.notifyNewLog) && (summary?.unreadCount ?? 0) > 0;

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-border bg-card pl-4 pr-1 xl:hidden">
      <BrandMark />
      {/* 누르면 오늘의 소식으로 간다. 점은 마지막으로 읽은 뒤 다른 직원의 새 소식이 있다는 뜻 */}
      <Button variant="ghost" size="icon" asChild>
        <Link to="/news" aria-label={hasNews ? "오늘의 소식 (새 소식 있음)" : "오늘의 소식"}>
          <span className="relative">
            <Bell className="fill-current" aria-hidden />
            {hasNews ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-notice-dot ring-2 ring-card" />
            ) : null}
          </span>
        </Link>
      </Button>
    </header>
  );
}

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
        "xl:min-h-[77px] xl:px-4",
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
