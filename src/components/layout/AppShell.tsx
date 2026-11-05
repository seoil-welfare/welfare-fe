import type { ReactNode } from "react";
import { BottomNav, Sidebar } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

/**
 * 반응형 구간 (가이드 5-1, D7).
 *  모바일 767 이하: BottomNav, 좌우 16
 *  태블릿 768~1279: BottomNav, 좌우 24, 1열 최대 720 가운데
 *  데스크톱 1280+: Sidebar 248, Header 77, Body 좌우 32 상하 24
 *
 * 하단 고정 영역은 safe-area를 포함한 실제 전체 높이만큼 padding-bottom을 둔다 (가이드 5-4).
 * BottomNav(64) / BottomActionBar·BottomNoticeBar(약 72)는 한 화면에 하나만 쓴다.
 */

export type BottomSlot = "nav" | "action" | "none";

export function AppShell({
  header,
  children,
  bottom = "nav",
  bottomBar,
  width = "body",
  fill = false,
  className,
}: {
  header?: ReactNode;
  children: ReactNode;
  bottom?: BottomSlot;
  /** bottom === "action"일 때 렌더링할 바 */
  bottomBar?: ReactNode;
  /** body 960px / form 720px (가이드 5-3, D8) */
  width?: "body" | "form" | "full";
  /** 본문이 하단 바 위까지 남은 높이를 채우게 한다. 자식에서 flex-1을 준 요소가 늘어난다 */
  fill?: boolean;
  className?: string;
}) {
  const padBottom =
    bottom === "nav"
      ? "pb-[calc(64px+env(safe-area-inset-bottom,0px)+16px)] xl:pb-6"
      : bottom === "action"
        ? "pb-[calc(76px+env(safe-area-inset-bottom,0px)+16px)]"
        : "pb-6";

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        <main
          className={cn(
            "flex-1",
            "px-4 md:px-6 xl:px-8",
            "pt-4 xl:pt-6",
            padBottom,
            fill && "flex flex-col",
            className,
          )}
        >
          <div
            className={cn(
              "mx-auto w-full",
              fill && "flex flex-1 flex-col",
              width === "body" && "max-w-240",
              width === "form" && "max-w-180",
            )}
          >
            {children}
          </div>
        </main>
      </div>
      {bottom === "nav" ? <BottomNav /> : null}
      {bottom === "action" ? bottomBar : null}
    </div>
  );
}
