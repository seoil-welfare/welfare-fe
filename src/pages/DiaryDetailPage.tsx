import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar, BottomNoticeBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { MetricCard } from "@/components/common/MetricCard";
import { DemoNote, EmptyState } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { ActivityAccordion } from "@/components/diary/ActivityAccordion";
import { isApiError } from "@/api/errors";
import { combineQueries, useDiary, useServiceUsers, useStaffList } from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { useDraft } from "@/app/DraftContext";
import {
  activeServiceUsers,
  countDiaryBehaviors,
  findServiceUser,
  findStaff,
} from "@/services/diaryService";
import { formatDateTime, formatLongDate } from "@/lib/utils";
import type { Diary, ServiceUser, Staff } from "@/types";

/**
 * 일지 상세 조회 (2.1.11/FR-57 ~ FR-64, 2.1.12/FR-65 ~ FR-72).
 * 세 상태를 각각 구현한다 (가이드 7장):
 *  1) 작성 완료 — 전체 활동 + 작성·수정 메타 + 아코디언
 *  2) 본인이 작성 중 — 작성 중 Badge + 남은 활동 안내 + '이어서 작성' 작업 버튼
 *  3) 다른 담당자가 작성 중 — 작성 중 Badge + BottomNoticeBar (수정 CTA 없음)
 * 어떤 상태를 누구에게 보여 줄지의 권한·동시 편집 판정은 이 프로토타입에서 정하지 않는다.
 */
export function DiaryDetailPage() {
  const navigate = useNavigate();
  const { diaryId } = useParams();
  const diaryQuery = useDiary(diaryId);
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();

  if (!diaryId || (isApiError(diaryQuery.error) && diaryQuery.error.status === 404)) {
    return (
      <AppShell header={<AppHeader title="일지" backTo="/home" />} bottom="nav">
        <Card variant="form">
          <EmptyState
            message="찾을 수 없는 일지예요."
            action={<Button onClick={() => navigate("/calendar")}>달력으로 이동</Button>}
          />
        </Card>
      </AppShell>
    );
  }

  if (!diaryQuery.data || !usersQuery.data || !staffQuery.data) {
    return (
      <AppShell header={<AppHeader title="일지 상세" backTo="/calendar" />} width="form">
        <QueryGate state={combineQueries([diaryQuery, usersQuery, staffQuery])}>
          {() => null}
        </QueryGate>
      </AppShell>
    );
  }

  return (
    <DiaryDetail diary={diaryQuery.data} serviceUsers={usersQuery.data} staff={staffQuery.data} />
  );
}

function DiaryDetail({
  diary,
  serviceUsers,
  staff,
}: {
  diary: Diary;
  serviceUsers: ServiceUser[];
  staff: Staff[];
}) {
  const navigate = useNavigate();
  const currentStaff = useCurrentStaff();
  const { continueDraft } = useDraft();

  const serviceUser = findServiceUser(serviceUsers, diary.userId);
  const author = findStaff(staff, diary.authorId);
  const lastEditor = diary.lastEditorId ? findStaff(staff, diary.lastEditorId) : undefined;
  const behaviorCount = countDiaryBehaviors(diary);
  const isMine = diary.authorId === currentStaff?.id;
  const isDraft = diary.status === "draft";
  const userCount = activeServiceUsers(serviceUsers).length;

  function handleContinue() {
    continueDraft(diary);
    navigate("/diaries/new");
  }

  const headerAction = isDraft && isMine ? (
    <Button
      variant="ghost"
      size="icon"
      aria-label="공유"
      onClick={() =>
        toast.info("공유 기능은 동작이 미확정입니다.", {
          description: "FR-72 미확정 사항이라 시연에서는 안내만 표시합니다.",
        })
      }
    >
      <Share2 aria-hidden />
    </Button>
  ) : undefined;

  return (
    <AppShell
      header={<AppHeader title="일지 상세" backTo="/calendar" action={headerAction} />}
      bottom={isDraft ? "action" : "nav"}
      width="form"
      bottomBar={
        isDraft ? (
          isMine ? (
            <BottomActionBar>
              <Button block onClick={handleContinue}>
                이어서 작성
              </Button>
            </BottomActionBar>
          ) : (
            // 수정 CTA를 두지 않고 수정할 수 없는 이유를 문구로 알린다 (FR-71, 가이드 9장 14번)
            <BottomNoticeBar
              title={(author?.name ?? "다른 담당자") + " 님이 작성 중이에요"}
              description="다른 담당자가 작성 중인 일지는 이어서 작성할 수 없어요. 저장된 내용만 볼 수 있어요."
            />
          )
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="type-title">{serviceUser?.name ?? "알 수 없는 이용자"} 님 일지</h2>
            {isDraft ? (
              <Badge variant="soft" tone="warning">
                작성 중
              </Badge>
            ) : (
              <Badge variant="soft" tone="primary">
                작성 완료
              </Badge>
            )}
            {behaviorCount > 0 ? (
              <Badge variant="soft" tone="behavior">
                도전적 행동 {behaviorCount}건
              </Badge>
            ) : null}
          </div>
          <p className="tnum type-body text-muted-foreground">{formatLongDate(diary.date)}</p>
          <dl className="mt-1 flex flex-col gap-1 type-caption text-muted-foreground">
            <div className="flex gap-2">
              <dt>최초 작성자</dt>
              <dd className="text-foreground">{author?.name ?? "알 수 없음"}</dd>
            </div>
            {isDraft ? (
              <div className="flex gap-2">
                <dt>마지막 저장</dt>
                <dd className="tnum text-foreground">{formatDateTime(diary.updatedAt)}</dd>
              </div>
            ) : (
              <div className="flex gap-2">
                <dt>최종 수정</dt>
                <dd className="tnum text-foreground">
                  {lastEditor ? lastEditor.name + " · " : ""}
                  {formatDateTime(diary.updatedAt)}
                </dd>
              </div>
            )}
          </dl>
        </FormSection>

        <div className="grid grid-cols-3 gap-3">
          <MetricCard value={diary.activities.length} unit="건" description="기록된 활동" />
          <MetricCard
            value={behaviorCount}
            unit="건"
            description="도전적 행동"
            tone={behaviorCount > 0 ? "behavior" : "default"}
          />
          <MetricCard value={diary.weather} description="날씨" />
        </div>

        <FormSection title="이용자 컨디션">
          <p className="type-body">{diary.condition}</p>
          {diary.condition === "기타" ? (
            <p className="type-body-long text-muted-foreground">
              {diary.conditionOther?.trim() || "입력된 내용이 없어요."}
            </p>
          ) : null}
        </FormSection>

        <FormSection title="활동" description={"활동 " + diary.activities.length + "건"}>
          {diary.activities.length === 0 ? (
            <EmptyState message="저장된 활동이 없어요." />
          ) : (
            <ActivityAccordion
              activities={diary.activities}
              // 완료 일지에서만 '이 활동만 수정'을 제공한다. 권한·수정 가능 기간은 미확정(FR-63)
              editLinkOf={
                !isDraft
                  ? (activity) => {
                      return "/diaries/" + diary.id + "/activities/" + activity.id;
                    }
                  : undefined
              }
            />
          )}

          {/* 부분 미작성 안내 — 남은 양을 문구로 알린다 (가이드 7장) */}
          {isDraft ? (
            <div className="rounded-card bg-warning-soft p-3 text-warning-foreground">
              <p className="type-body font-medium">아직 작성 전이에요</p>
              <p className="type-caption break-keep">
                지금까지 활동 {diary.activities.length}건을 저장했어요. 남은 활동 개수는 하루 최대
                활동 수 제한이 미확정이라 표시하지 않았어요. (FR-68 미확정)
              </p>
            </div>
          ) : null}
        </FormSection>

        <FormSection title="특이사항">
          {diary.notes.trim() ? (
            <p className="type-body-long whitespace-pre-wrap">{diary.notes}</p>
          ) : (
            <p className="type-body text-muted-foreground">
              {isDraft ? "아직 작성 전이에요." : "기록된 특이사항이 없어요."}
            </p>
          )}
        </FormSection>

        <DemoNote>
          이 화면의 상태 표시는 시연용입니다. 실제 권한 정책·동시 편집 판정·수정 이력 규칙은 회의에서
          확정합니다. 달력 지표의 분모로 쓰이는 대상 이용자는 현재 {userCount}명입니다.
        </DemoNote>
      </div>
    </AppShell>
  );
}
