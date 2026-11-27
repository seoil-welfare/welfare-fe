import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyState, ListSkeleton } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries } from "@/api/queries";
import { useDraft } from "@/app/DraftContext";
import { DiaryEditForm } from "@/pages/diary/diaryEdit/DiaryEditForm";
import { useDraftForRequest } from "@/pages/diary/diaryEdit/useDraftForRequest";

/**
 * 일지 작성 (2.1.4/FR-08 ~ FR-16).
 * - 이용자 변경 시 입력 내용은 유지되고, 저장 전까지 다른 이용자의 일지로 저장되지 않는다 (FR-09)
 * - 입력이 멈추거나 화면이 가려지면 '작성 중'으로 자동 임시저장한다 (DraftContext)
 *
 * 나눈 파일 (diaryEdit/)
 * - useDraftForRequest: 어떤 일지를 쓸지 정하기 (주소로 지정한 대상, 새로고침 뒤 되살리기, 새 일지)
 * - DiaryEditForm: 입력 폼과 저장·삭제
 * - WeatherConditionSection, ActivityListSection: 폼의 섹션
 * - saveMessages: 저장 결과 안내 문구
 */
export function DiaryEditPage() {
  const { draft } = useDraft();
  const request = useDraftForRequest();

  if (request.futureRequest) {
    return (
      <AppShell header={<AppHeader title="일지 작성" backTo="/calendar" />} bottom="nav">
        <Card variant="form">
          <EmptyState
            message="오늘 이후 날짜의 일지는 쓸 수 없어요."
            action={
              <Button asChild>
                <Link to="/calendar">달력으로 돌아가기</Link>
              </Button>
            }
          />
        </Card>
      </AppShell>
    );
  }

  if (!draft) {
    // 되살릴 일지가 있는지 확인하는 동안에는 '작성할 이용자가 없어요'를 먼저 보여 주지 않는다
    const loadState = combineQueries([request.usersQuery, request.dayQuery]);
    return (
      <AppShell header={<AppHeader title="일지 작성" backTo="/home" />} bottom="nav">
        <QueryGate state={{ ...loadState, isPending: loadState.isPending || request.restoring }} skeleton={<ListSkeleton rows={2} />}>
          {() => (
            <Card variant="form">
              <EmptyState message="작성할 이용자가 없어요. 먼저 이용자를 등록해 주세요." />
            </Card>
          )}
        </QueryGate>
      </AppShell>
    );
  }

  return (
    <DiaryEditForm
      draft={draft}
      users={request.users}
      dayDiaries={request.dayQuery.data ?? []}
      onCommitted={request.markCommitted}
      replace={{ open: request.askReplace, onKeep: request.keepCurrentDraft, onStartNew: request.startRequestedDraft }}
    />
  );
}
