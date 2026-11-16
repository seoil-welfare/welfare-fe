import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/states";

/**
 * 출력 양식 관리 (팀장·국장).
 * 기관 양식 파일(docx)을 올리고, 숨기거나 다시 사용한다. 출력할 때 여기서 사용 중인 양식을 고른다.
 * 지금은 진입 경로만 있다. 목록·올리기·숨기기는 양식 API가 생기면 채운다.
 */
export function ReportFormsPage() {
  return (
    <AppShell header={<AppHeader title="출력 양식 관리" backTo="/mypage" />} width="form">
      <Card variant="form">
        <EmptyState message="출력 양식 관리 화면을 만들고 있어요." />
      </Card>
    </AppShell>
  );
}
