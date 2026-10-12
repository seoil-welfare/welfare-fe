import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/misc";
import { LoadFailureState } from "@/components/common/states";
import { useMe } from "@/api/queries";
import type { Staff } from "@/types";

/** 로그인한 직원. 로그인 확인 전이거나 로그아웃 상태면 null */
export function useCurrentStaff(): Staff | null {
  return useMe().data ?? null;
}

/**
 * 로그인하지 않았으면 /login으로 보낸다.
 * 화면 접근만 막는 것이다. 데이터 권한은 서버가 검증해야 한다.
 */
export function RequireAuth() {
  const me = useMe();
  if (me.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="로그인 상태를 확인하는 중…" />
      </div>
    );
  }
  // 네트워크·서버 오류로 확인하지 못한 경우는 로그아웃이 아니다. 세션이 살아 있을 수 있으므로
  // 로그인 화면으로 보내지 않고 다시 확인하게 한다. (401은 me()가 null로 돌려준다)
  if (me.isError && me.data === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <LoadFailureState
          reason="로그인 상태를 확인하지 못했어요. 네트워크 상태를 확인해 주세요."
          onRetry={() => void me.refetch()}
        />
      </div>
    );
  }
  if (!me.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}
