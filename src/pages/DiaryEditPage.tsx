import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { SingleChoiceGroup } from "@/components/common/ChoiceGroup";
import { EmptyState, ListSkeleton } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { CONDITIONS, WEATHERS } from "@/data/catalog";
import { errorMessage, isApiError, NETWORK_ERROR_STATUS } from "@/api/errors";
import { combineQueries, useDiaries, useSaveDiary, useServiceUsers } from "@/api/queries";
import { useDraft } from "@/app/DraftContext";
import { useToday } from "@/lib/today";
import {
  activeServiceUsers,
  activitySummary,
  countActivityBehaviors,
  diariesOnDate,
  sortActivities,
} from "@/services/diaryService";
import { formatLongDate, formatTimeRange } from "@/lib/utils";
import type { Activity, Condition, DiaryStatus, Weather } from "@/types";

/**
 * 일지 작성 (2.1.4/FR-08 ~ FR-16).
 * - 이용자 변경 시 입력 내용은 유지되고, 저장 전까지 다른 이용자의 일지로 저장되지 않는다 (FR-09)
 * - 날씨 기본 '맑음', 컨디션 기본 '양호', 컨디션 '기타'는 직접 입력 (FR-10, FR-11)
 * - 활동 요약에 도전적 행동 표시, 항목 선택 시 수정 화면 이동 (FR-12)
 * - 상단 '임시저장'은 화면에 머무르며 알림만 띄운다 — DEMO_ONLY(U1)
 * - 하단 '나중에 이어서'(작성 중) / '작성 완료'(완료)는 서버에 저장한 뒤 상세로 이동한다
 * - 작성 완료된 일지를 수정할 때는 대상 이용자를 바꿀 수 없고, 하단 '수정 완료' 하나만 둔다
 *   ('나중에 이어서'로 완료 일지가 작성 중으로 되돌아가지 않게 한다)
 */
export function DiaryEditPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = useToday();
  const {
    draft,
    startDraft,
    updateDraft,
    discardDraft,
    removeActivity,
    editScrollY,
    setEditScrollY,
  } = useDraft();
  // 삭제 확인 팝업을 띄울 활동
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const saveDiary = useSaveDiary();
  const usersQuery = useServiceUsers();
  const users = activeServiceUsers(usersQuery.data ?? []);

  const requestedUserId = params.get("userId");
  const requestedDate = params.get("date");
  const targetDate = draft?.date ?? requestedDate ?? today;
  // 이용자 1명당 하루 1건 규칙을 안내하려고 그 날짜의 일지를 불러온다
  const dayQuery = useDiaries({ from: targetDate, to: targetDate });

  // 라우트 이동으로 입력이 사라지지 않게 draft를 유지한다. 없으면 새로 만든다.
  useEffect(() => {
    // 이전 날짜의 결과(placeholder)로 기본 이용자를 고르지 않는다
    if (draft || users.length === 0 || !dayQuery.data || dayQuery.isPlaceholderData) return;
    // 일지는 이용자 1명당 하루 1건이다. 대상이 지정되지 않았다면
    // 그 날짜에 아직 일지가 없는 이용자를 기본값으로 고른다.
    const saved = diariesOnDate(dayQuery.data, targetDate);
    const firstAvailable = users.find((user) => !saved.some((d) => d.userId === user.id));
    startDraft(requestedUserId ?? firstAvailable?.id ?? users[0].id, targetDate);
  }, [draft, users, startDraft, requestedUserId, targetDate, dayQuery.data, dayQuery.isPlaceholderData]);

  // 활동 화면에서 돌아오면 넘어가기 전 스크롤 위치로 되돌린다 (화면이 그려지기 전에 맞춰 깜빡임을 막는다)
  const hasDraft = Boolean(draft);
  useLayoutEffect(() => {
    if (!hasDraft || editScrollY === null) return;
    window.scrollTo(0, editScrollY);
    setEditScrollY(null);
  }, [hasDraft, editScrollY, setEditScrollY]);

  /** 활동 화면으로 넘어가기 직전에 현재 위치를 기억한다 */
  function rememberScroll() {
    setEditScrollY(window.scrollY);
  }

  if (!draft) {
    return (
      <AppShell header={<AppHeader title="일지 작성" backTo="/home" />} bottom="nav">
        <QueryGate state={combineQueries([usersQuery, dayQuery])} skeleton={<ListSkeleton rows={2} />}>
          {() => (
            <Card variant="form">
              <EmptyState message="작성할 이용자가 없어요. 먼저 이용자를 등록해 주세요." />
            </Card>
          )}
        </QueryGate>
      </AppShell>
    );
  }

  const activities = sortActivities(draft.activities);
  const isContinuing = Boolean(draft.diaryId);
  const isEditingCompleted = Boolean(draft.editingCompleted);
  const saving = saveDiary.isPending ? saveDiary.variables?.status ?? null : null;

  // 이 날짜에 이미 저장된 일지 (지금 이어 쓰고 있는 일지는 제외).
  // 일지는 이용자 1명당 하루 1건이므로 이 이용자들은 고를 수 없고 저장도 막는다.
  const otherDiaries = diariesOnDate(dayQuery.data ?? [], draft.date).filter(
    (diary) => diary.id !== draft.diaryId,
  );
  const existingFor = (userId: string) => otherDiaries.find((diary) => diary.userId === userId);
  const existingForTarget = existingFor(draft.userId);

  function handleTempSave() {
    // DEMO_ONLY(U1) — 원본 상단 '임시저장'. 화면에 머무르며 저장 알림만 띄운다.
    toast.success("임시 저장했어요.");
  }

  function handleCommit(status: DiaryStatus) {
    if (!draft || saveDiary.isPending) return; // 중복 제출 차단
    if (existingForTarget) {
      toast.error(
        existingForTarget.status === "completed"
          ? "이 이용자는 이 날짜에 작성 완료된 일지가 있어요."
          : "이 이용자는 이 날짜에 작성 중인 일지가 있어요.",
        { description: "일지는 이용자 한 명당 하루 한 건이에요." },
      );
      return;
    }
    const { editingCompleted: _editing, ...input } = draft;
    saveDiary.mutate(
      { ...input, status },
      {
        onSuccess: (diary) => {
          discardDraft();
          toast.success(
            isEditingCompleted
              ? "일지를 수정했어요."
              : status === "completed"
                ? "작성을 완료했어요."
                : "작성 중으로 저장했어요.",
          );
          navigate("/diaries/" + diary.id, { replace: true });
        },
        // 실패하면 입력을 그대로 두고 다시 시도할 수 있게 한다 (가이드 6장)
        onError: (error) =>
          toast.error("저장하지 못했어요.", {
            // 응답을 받지 못한 경우는 서버에 저장됐을 수도 있다. 목록을 다시 불러오므로
            // 이미 저장된 일지가 있으면 그 이용자는 선택할 수 없게 바뀌어 확인할 수 있다.
            description:
              isApiError(error) && error.status === NETWORK_ERROR_STATUS
                ? "네트워크 문제로 저장 여부를 확인하지 못했어요. 이미 저장됐는지 확인한 뒤 다시 시도해 주세요."
                : errorMessage(error),
          }),
      },
    );
  }

  return (
    <AppShell
      header={
        <AppHeader
          title={isEditingCompleted ? "일지 수정" : isContinuing ? "일지 이어서 작성" : "일지 작성"}
          backTo={isEditingCompleted ? "/diaries/" + draft.diaryId : "/home"}
          action={
            isEditingCompleted ? undefined : (
              <Button variant="ghost" size="dense" onClick={handleTempSave}>
                <Save aria-hidden />
                임시저장
              </Button>
            )
          }
        />
      }
      bottom="action"
      width="form"
      bottomBar={
        isEditingCompleted ? (
          <BottomActionBar>
            <Button block disabled={saving !== null} onClick={() => handleCommit("completed")}>
              {saving !== null ? "저장 중…" : "수정 완료"}
            </Button>
          </BottomActionBar>
        ) : (
          <BottomActionBar>
            <Button
              variant="outline"
              block
              disabled={saving !== null}
              onClick={() => handleCommit("draft")}
            >
              {saving === "draft" ? "저장 중…" : "나중에 이어서"}
            </Button>
            <Button block disabled={saving !== null} onClick={() => handleCommit("completed")}>
              {saving === "completed" ? "저장 중…" : "작성 완료"}
            </Button>
          </BottomActionBar>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection title="기본 정보">
          <Field>
            <FieldLabel htmlFor="diary-user">대상 이용자</FieldLabel>
            <Select
              value={draft.userId}
              // 완료 일지를 다른 이용자의 일지로 옮기지 않는다
              disabled={isEditingCompleted}
              onValueChange={(value) => updateDraft({ userId: value })}
            >
              <SelectTrigger id="diary-user" aria-label="대상 이용자">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => {
                  const existing = existingFor(user.id);
                  return (
                    <SelectItem key={user.id} value={user.id} disabled={Boolean(existing)}>
                      {user.name}
                      {existing
                        ? existing.status === "completed"
                          ? " · 작성 완료"
                          : " · 작성 중"
                        : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>일지 날짜</FieldLabel>
            <p className="tnum flex h-12 items-center rounded-control bg-secondary px-3 type-input">
              {formatLongDate(draft.date)}
            </p>
          </Field>
        </FormSection>

        <FormSection title="날씨와 컨디션">
          <SingleChoiceGroup
            label="날씨"
            options={WEATHERS}
            value={draft.weather}
            onChange={(value) => updateDraft({ weather: value as Weather })}
          />
          <SingleChoiceGroup
            label="이용자 컨디션"
            options={CONDITIONS}
            value={draft.condition}
            onChange={(value) => updateDraft({ condition: value as Condition })}
            otherValue={draft.conditionOther}
            onOtherChange={(value) => updateDraft({ conditionOther: value })}
          />
        </FormSection>

        <FormSection
          title="활동 내용"
          description={"활동 " + activities.length + "건"}
        >
          {activities.length === 0 ? (
            <EmptyState message="아직 등록한 활동이 없어요." />
          ) : (
            <Card variant="list">
              <ul className="divide-y divide-border">
                {activities.map((activity) => {
                  const behaviorCount = countActivityBehaviors(activity);
                  return (
                    <li
                      key={activity.id}
                      className={"flex items-center" + (behaviorCount > 0 ? " bg-behavior-soft" : "")}
                    >
                      <Link
                        to={"/diaries/new/activities/" + activity.id}
                        onClick={rememberScroll}
                        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 hover:bg-accent"
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="tnum type-body font-medium">
                              {formatTimeRange(activity.startTime, activity.endTime)}
                            </span>
                            {behaviorCount > 0 ? (
                              <Badge variant="soft" tone="behavior">
                                도전적 행동 {behaviorCount}건
                              </Badge>
                            ) : null}
                          </span>
                          <span className="truncate type-caption text-muted-foreground">
                            {activitySummary(activity)}
                          </span>
                        </span>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2 shrink-0 text-muted-foreground"
                        aria-label={
                          formatTimeRange(activity.startTime, activity.endTime) + " 활동 삭제"
                        }
                        onClick={() => setDeleteTarget(activity)}
                      >
                        <X aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Button variant="dashed" asChild>
            <Link to="/diaries/new/activities/new" onClick={rememberScroll}>
              <Plus aria-hidden />
              활동 내용 추가
            </Link>
          </Button>

        </FormSection>

        <FormSection title="특이사항">
          <Field>
            <FieldLabel htmlFor="diary-notes">전달 사항</FieldLabel>
            <Textarea
              id="diary-notes"
              value={draft.notes}
              placeholder="보호자 전달 사항이나 특이사항을 적어 주세요."
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
          </Field>
        </FormSection>

      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          (deleteTarget
            ? formatTimeRange(deleteTarget.startTime, deleteTarget.endTime) + " "
            : "") + "활동을 삭제할까요?"
        }
        description="삭제한 활동 내용은 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={() => {
          if (deleteTarget) removeActivity(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </AppShell>
  );
}
