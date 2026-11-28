import { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { errorMessage, isApiError, isUpdatedByOther } from "@/api/errors";
import { useDeleteDiary, useSaveDiary } from "@/api/queries";
import { useDraft } from "@/app/DraftContext";
import { getLastPage } from "@/app/lastPage";
import { formatLongDate, formatTime, formatTimeRange } from "@/lib/utils";
import {
  diariesOnDate,
  findActivityMissingBehaviorDetail,
  missingDetailMessage,
  sortActivities,
  toSaveInput,
} from "@/services/diaryService";
import type { Diary, DiaryDraft, DiaryStatus, ServiceUser } from "@/types";
import { ActivityListSection } from "@/pages/diary/diaryEdit/ActivityListSection";
import { WeatherConditionSection } from "@/pages/diary/diaryEdit/WeatherConditionSection";
import {
  toastCommitError,
  toastExistingDiary,
  toastTempSaveBlocked,
  toastTempSaveResult,
} from "@/pages/diary/diaryEdit/saveMessages";

/**
 * 일지 작성 폼. 쓸 draft가 정해진 뒤에만 그린다 (정하는 일은 useDraftForRequest).
 * - 상단 '임시저장'은 자동 임시저장을 바로 실행한다
 * - 하단 '나중에 이어서'(작성 중) / '작성 완료'(완료)는 서버에 저장한 뒤 상세로 이동한다
 * - 작성 완료된 일지를 수정할 때는 대상 이용자를 바꿀 수 없고, 하단 '수정 완료' 하나만 둔다
 *   ('나중에 이어서'로 완료 일지가 작성 중으로 되돌아가지 않게 한다)
 */
export function DiaryEditForm({
  draft,
  users,
  dayDiaries,
  onCommitted,
  replace,
}: {
  draft: DiaryDraft;
  /** 고를 수 있는 이용자 (이용 중) */
  users: readonly ServiceUser[];
  /** draft 날짜의 일지 목록 (하루 1건 규칙 안내용) */
  dayDiaries: readonly Diary[];
  /** 저장·삭제를 마쳐 다른 화면으로 넘어가기 직전에 부른다 */
  onCommitted: () => void;
  /** 주소로 지정한 대상이 쓰던 draft와 다를 때 묻는 팝업 */
  replace: { open: boolean; onKeep: () => void; onStartNew: () => void };
}) {
  const navigate = useNavigate();
  const {
    updateDraft,
    discardDraft,
    removeActivity,
    editScrollY,
    setEditScrollY,
    autosave,
    saveNow,
    beginCommit,
    cancelCommit,
    setAutosaveBlocked,
    reportUpdatedByOther,
  } = useDraft();
  const saveDiary = useSaveDiary();
  const deleteDiary = useDeleteDiary();
  // 활동이 없는 일지를 완료할지 묻는 팝업
  const [askEmptyComplete, setAskEmptyComplete] = useState(false);
  // 작성 중 일지 삭제 확인 팝업
  const [askDeleteDiary, setAskDeleteDiary] = useState(false);

  // 활동 화면에서 돌아오면 넘어가기 전 스크롤 위치로 되돌린다 (화면이 그려지기 전에 맞춰 깜빡임을 막는다)
  useLayoutEffect(() => {
    if (editScrollY === null) return;
    window.scrollTo(0, editScrollY);
    setEditScrollY(null);
  }, [editScrollY, setEditScrollY]);

  // 자동 임시저장으로 생긴 id는 '이어서 작성'이 아니다
  const isContinuing = Boolean(draft.diaryId) && !draft.autosaved;
  const isEditingCompleted = Boolean(draft.editingCompleted);
  const saving = saveDiary.isPending ? saveDiary.variables?.status ?? null : null;
  // 서버에 저장된 작성 중 일지만 삭제할 수 있다 (새 일지·완료 일지 수정 중에는 버튼을 숨긴다)
  const canDeleteDiary = Boolean(draft.diaryId) && !isEditingCompleted;

  // 이 날짜에 이미 저장된 일지 (지금 이어 쓰고 있는 일지는 제외).
  // 일지는 이용자 1명당 하루 1건이므로 이 이용자들은 고를 수 없고 저장도 막는다.
  const otherDiaries = diariesOnDate(dayDiaries, draft.date).filter((diary) => diary.id !== draft.diaryId);
  const existingFor = (userId: string) => otherDiaries.find((diary) => diary.userId === userId);
  const existingForTarget = existingFor(draft.userId);
  // 같은 값을 반복해 쓰는 ref 갱신이라 렌더 중에 불러도 안전하다
  setAutosaveBlocked(Boolean(existingForTarget));

  async function handleTempSave() {
    if (existingForTarget) {
      toastTempSaveBlocked();
      return;
    }
    toastTempSaveResult(await saveNow());
  }

  async function handleCommit(status: DiaryStatus, emptyConfirmed = false) {
    if (saveDiary.isPending) return; // 중복 제출 차단
    if (existingForTarget) {
      toastExistingDiary(existingForTarget);
      return;
    }
    if (status === "completed") {
      if (draft.activities.some((a) => a.reaction.filter((v) => v !== "기타").length > 1)) {
        toast.error("이용자 반응의 참여 정도는 활동마다 하나만 골라 주세요.");
        return;
      }
      // 체크한 도전적 행동 유형에 세부 행동이 없는 활동이 있으면 완료하지 않는다 (QA 03-06).
      // 작성 중 저장은 막지 않는다. 이전에 저장된 잘못된 활동도 여기서 걸린다
      const problem = findActivityMissingBehaviorDetail(draft.activities);
      if (problem) {
        toast.error(
          formatTimeRange(problem.activity.startTime, problem.activity.endTime) + " 활동: " + missingDetailMessage(problem.types),
        );
        return;
      }
      // 활동이 없는 일지는 막지 않고 한 번 확인한다 (QA 03-02). 수정 완료도 같다
      if (draft.activities.length === 0 && !emptyConfirmed) {
        setAskEmptyComplete(true);
        return;
      }
    }
    // 자동 저장이 진행 중이면 기다렸다가, 거기서 만들어진 일지로 저장한다 (일지가 두 건 생기지 않게)
    // updatedAt도 자동 저장이 받은 최신 값으로 보낸다 (내 자동 저장을 다른 사람의 수정으로 오해하지 않게)
    const saved = await beginCommit();
    const input = toSaveInput(draft, status);
    saveDiary.mutate(
      { ...input, diaryId: input.diaryId ?? saved.diaryId, updatedAt: saved.updatedAt ?? input.updatedAt },
      {
        onSuccess: (diary) => {
          // draft를 비우면 빈 일지가 새로 만들어질 수 있어 먼저 알린다
          onCommitted();
          discardDraft();
          toast.success(
            isEditingCompleted ? "일지를 수정했어요." : status === "completed" ? "작성을 완료했어요." : "작성 중으로 저장했어요.",
          );
          // 완료 일지를 고쳤으면 수정을 시작한 화면(통계·달력 등)으로 돌아간다. 그 외에는 저장한 일지 상세로
          navigate((isEditingCompleted && getLastPage()) || "/diaries/" + diary.id, { replace: true });
        },
        // 실패하면 입력을 그대로 두고 다시 시도할 수 있게 한다 (가이드 6장)
        onError: (error) => {
          cancelCommit();
          // 불러온 뒤 다른 사람이 먼저 저장했다. 덮어쓰지 않고 최신 내용을 불러올지 묻는다 (명세 4.6)
          if (isUpdatedByOther(error)) {
            reportUpdatedByOther();
            return;
          }
          toastCommitError(error);
        },
      },
    );
  }

  async function handleDeleteDiary() {
    if (!draft.diaryId || deleteDiary.isPending) return;
    // 자동 저장을 멈추고 진행 중인 저장을 기다린다. 안 그러면 삭제 도중·직후 자동 저장이 일지를 다시 만든다
    const saved = await beginCommit();
    const diaryId = saved.diaryId ?? draft.diaryId;

    const finish = () => {
      // draft를 비우면 빈 일지가 새로 만들어질 수 있어 먼저 알린다
      onCommitted();
      discardDraft();
      navigate("/home", { replace: true });
    };

    deleteDiary.mutate(diaryId, {
      onSuccess: () => {
        finish();
        toast.success("작성 중인 일지를 삭제했어요.");
      },
      onError: (error) => {
        // 이미 지워진 일지다. 작성 중 상태를 정리하고 홈으로 간다
        if (isApiError(error) && error.status === 404) {
          finish();
          toast.error(errorMessage(error));
          return;
        }
        // 403·400 등: 일지는 그대로이니 화면에 머물고 자동 저장을 다시 켠다
        cancelCommit();
        toast.error(errorMessage(error));
      },
    });
  }

  return (
    <AppShell
      header={
        <AppHeader
          title={isEditingCompleted ? "일지 수정" : isContinuing ? "일지 이어서 작성" : "일지 작성"}
          backTo={isEditingCompleted ? "/diaries/" + draft.diaryId : "/home"}
          action={
            isEditingCompleted ? undefined : (
              <Button
                variant="ghost"
                size="dense"
                onClick={() => void handleTempSave()}
                disabled={autosave.status === "saving"}
                aria-live="polite"
              >
                <Save aria-hidden />
                {autosave.status === "saving"
                  ? "저장 중…"
                  : autosave.status === "saved" && autosave.savedAt
                    ? "저장됨 " + formatTime(autosave.savedAt.toISOString())
                    : "임시저장"}
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
            <Button variant="outline" block disabled={saving !== null} onClick={() => handleCommit("draft")}>
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
              // 서버에 저장된 일지(완료·이어 쓰기·자동 임시저장)는 다른 이용자의 일지로 옮기지 않는다 (B-8)
              disabled={Boolean(draft.diaryId)}
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
                      {existing ? (existing.status === "completed" ? " · 작성 완료" : " · 작성 중") : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {canDeleteDiary ? <FieldDescription>이용자를 잘못 골랐다면 일지를 삭제하고 다시 쓰세요.</FieldDescription> : null}
          </Field>

          <Field>
            <FieldLabel>일지 날짜</FieldLabel>
            <p className="tnum flex h-12 items-center rounded-control bg-secondary px-3 type-input">{formatLongDate(draft.date)}</p>
          </Field>
        </FormSection>

        <WeatherConditionSection draft={draft} onChange={updateDraft} />

        <ActivityListSection
          activities={sortActivities(draft.activities)}
          onLeave={() => setEditScrollY(window.scrollY)}
          onRemove={removeActivity}
        />

        <FormSection title="특이사항">
          <Field>
            {/* 섹션 제목이 곧 입력란 이름이라 소제목 없이 화면 낭독기용 이름만 둔다 */}
            <Textarea
              id="diary-notes"
              aria-label="특이사항"
              value={draft.notes}
              placeholder="보호자 전달 사항이나 특이사항을 적어 주세요."
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
          </Field>
        </FormSection>

        {canDeleteDiary ? (
          <Button
            variant="ghost"
            size="dense"
            className="self-center text-destructive hover:text-destructive"
            disabled={deleteDiary.isPending || saving !== null}
            onClick={() => setAskDeleteDiary(true)}
          >
            <Trash2 aria-hidden />
            작성 중인 일지 삭제
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={askDeleteDiary}
        onOpenChange={setAskDeleteDiary}
        title="작성 중인 일지를 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={() => void handleDeleteDiary()}
      />

      <ConfirmDialog
        open={askEmptyComplete}
        onOpenChange={setAskEmptyComplete}
        title="활동 없이 완료할까요?"
        description="활동 기록이 없는 일지로 완료돼요. 통계에도 들어가요."
        confirmLabel="완료"
        cancelLabel="돌아가기"
        tone="default"
        onConfirm={() => void handleCommit("completed", true)}
      />

      <ConfirmDialog
        open={replace.open}
        onOpenChange={(open) => {
          if (!open) replace.onKeep();
        }}
        title={"작성 중인 " + (users.find((user) => user.id === draft.userId)?.name ?? "") + " 님 일지가 있어요"}
        description="새로 쓰면 저장하지 않은 입력이 사라져요."
        confirmLabel="새로 쓰기"
        cancelLabel="이어서 쓰기"
        // 닫힐 때 주소가 지워지므로 여기서 바로 새 draft를 만든다
        onConfirm={replace.onStartNew}
      />
    </AppShell>
  );
}
