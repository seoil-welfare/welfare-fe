import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState } from "@/components/common/states";
import { useCurrentStaff } from "@/app/auth";

/** 잘못된 URL은 홈/로그인 이동 안내를 제공한다 (지시서 2장) */
export function NotFoundPage() {
  const currentStaff = useCurrentStaff();
  const target = currentStaff ? "/home" : "/login";

  return (
    <AppShell header={<AppHeader title="찾을 수 없는 화면" backTo={target} />} bottom="none">
      <Card variant="form">
        <EmptyState
          message="주소가 잘못되었거나 없는 화면이에요."
          action={
            <Button asChild>
              <Link to={target}>{currentStaff ? "홈으로 이동" : "로그인으로 이동"}</Link>
            </Button>
          }
        />
      </Card>
    </AppShell>
  );
}
