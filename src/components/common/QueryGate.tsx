import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ListSkeleton, LoadFailureState } from "@/components/common/states";
import { errorMessage } from "@/api/errors";
import type { CombinedState } from "@/api/queries";

/**
 * 조회 결과에 따라 Skeleton / 불러오기 실패 / 본문을 고른다 (가이드 8장).
 * children은 모든 조회가 성공한 뒤에만 호출되므로 그 안에서는 data가 있다고 보고 써도 된다.
 */
export function QueryGate({
  state,
  skeleton,
  children,
}: {
  state: CombinedState;
  skeleton?: ReactNode;
  children: () => ReactNode;
}) {
  if (state.isError) {
    return (
      <Card variant="form">
        <LoadFailureState
          reason={errorMessage(state.error, "기록을 불러오지 못했어요.")}
          onRetry={state.refetch}
        />
      </Card>
    );
  }
  if (state.isPending) return <>{skeleton ?? <ListSkeleton />}</>;
  return <>{children()}</>;
}
