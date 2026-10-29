import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * 일지 화면(/diaries/…)으로 들어오기 직전에 보던 화면.
 * 작성 완료 일지를 고친 뒤 '수정 완료'를 누르면 이 화면으로 돌려보낸다
 * (예: 통계 → 일지 상세 → 수정이면 통계로). 통계에서 고른 이용자·기간은 StatsContext가 유지한다.
 */
let lastPage: string | null = null;

export function getLastPage(): string | null {
  return lastPage;
}

/** 라우터 안에 한 번 둔다. 일지·로그인이 아닌 화면에 들어올 때마다 주소를 기억한다 */
export function useRememberLastPage(): void {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/diaries") || path === "/login" || path === "/signup" || path === "/") return;
    lastPage = path + location.search;
  }, [location.pathname, location.search]);
}
