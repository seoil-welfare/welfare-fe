import { NavLink } from "react-router-dom";
import { BarChart3, CalendarDays, Home, User } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/utils";

/** 메뉴 4개: 홈·달력·통계·마이페이지 (가이드 5-4) */
export const NAV_ITEMS = [
  { to: "/home", label: "홈", Icon: Home },
  { to: "/calendar", label: "달력", Icon: CalendarDays },
  { to: "/stats", label: "통계", Icon: BarChart3 },
  { to: "/mypage", label: "마이페이지", Icon: User },
] as const;

/** 모바일~태블릿. 콘텐츠 높이 64px + safe-area. 현재 메뉴는 네이비 글자 + 금색 밑줄 */
export function BottomNav() {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-safe xl:hidden"
    >
      <ul className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex h-full flex-col items-center justify-center gap-1 transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-6" aria-hidden />
                  <span className={cn("type-caption", isActive && "font-medium")}>{label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "h-0.5 w-6 rounded-full",
                      isActive ? "bg-brand-gold" : "bg-transparent",
                    )}
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** 데스크톱(1280+). 폭 248px. 현재 메뉴는 accent 배경 */
export function Sidebar() {
  return (
    <aside
      aria-label="주요 메뉴"
      className="hidden w-62 shrink-0 border-r border-sidebar-border bg-sidebar xl:block"
      style={{ width: 248 }}
    >
      <div className="flex h-[77px] items-center px-5">
        <BrandMark />
      </div>
      <nav className="px-3 pb-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-12 items-center gap-3 rounded-control px-3 type-body font-medium",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-sidebar-accent text-primary"
                      : "text-foreground hover:bg-accent",
                  )
                }
              >
                <Icon className="size-6 shrink-0" aria-hidden />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
