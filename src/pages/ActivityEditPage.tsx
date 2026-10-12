import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { MultiChoiceGroup } from "@/components/common/ChoiceGroup";
import { OtherInput } from "@/components/common/OtherInput";
import { DemoNote } from "@/components/common/states";
import {
  BEHAVIOR_TYPES,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  MINUTE_STEP_DEMO_ONLY,
  PARTICIPATION_OPTIONS,
  POSITIVE_SUPPORT_OPTIONS,
  PRE_SUPPORT_OPTIONS,
  REACTION_OPTIONS,
  behaviorDetailLabel,
} from "@/data/catalog";
import { useDraft } from "@/app/DraftContext";
import { useDemo } from "@/demo/DemoContext";
import { emptyActivity, sortActivities } from "@/services/diaryService";
import { uid } from "@/lib/utils";
import type { Activity, BehaviorType } from "@/types";

/**
 * 활동 내용 입력/수정 (2.1.5/FR-17 ~ FR-25).
 * - 제목은 신규 '활동 입력', 수정 '활동 수정' (FR-17)
 * - 시작 시간 선택 전에는 종료 시간이 비활성, 선택 후에는 더 늦은 시간만 표시 (FR-18)
 * - 참여활동·사전지원·반응·긍정행동지원은 복수 선택 칩, '기타'는 직접 입력 (FR-19~FR-23)
 * - 도전적 행동은 '있음'을 켜면 타해/자해/파괴행동/기타가 나타나고, 앞 3종은 상세 화면으로 이동 (FR-24)
 * - '저장하고 다음 활동'은 임시 활동 목록만 갱신하고 서버에 저장하지 않는다 (FR-25)
 */
export function ActivityEditPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const { flags } = useDemo();
  const { draft, pendingActivity, setPendingActivity, upsertActivity } = useDraft();
  const [timeError, setTimeError] = useState<string | null>(null);

  const isNew = activityId === "new" || activityId === undefined;

  // 라우트 이동(도전적 행동 상세)에도 선택값이 유지되도록 pendingActivity를 쓴다.
  useEffect(() => {
    if (pendingActivity) return;
    if (isNew) {
      setPendingActivity(emptyActivity(uid("act")));
      return;
    }
    const existing = draft?.activities.find((a) => a.id === activityId);
    setPendingActivity(existing ? { ...existing } : emptyActivity(activityId ?? uid("act")));
  }, [pendingActivity, isNew, activityId, draft, setPendingActivity]);

  const activity = pendingActivity;

  const previousActivity = useMemo(() => {
    if (!draft) return null;
    const others = sortActivities(draft.activities).filter((a) => a.id !== activity?.id);
    return others.length > 0 ? others[others.length - 1] : null;
  }, [draft, activity?.id]);

  if (!draft || !activity) {
    return (
      <AppShell header={<AppHeader title="활동 입력" backTo="/diaries/new" />} bottom="nav">
        <Card variant="form">
          <p className="type-body text-muted-foreground">작성 중인 일지가 없어요.</p>
          <Button className="mt-3" onClick={() => navigate("/diaries/new")}>
            일지 작성으로 이동
          </Button>
        </Card>
      </AppShell>
    );
  }

  function patch(partial: Partial<Activity>) {
    setPendingActivity({ ...activity!, ...partial });
  }

  const [startHour, startMinute] = splitTime(activity.startTime);
  const [endHour, endMinute] = splitTime(activity.endTime);

  function setStart(hour: string, minute: string) {
    const next = hour && minute ? hour + ":" + minute : undefined;
    // 시작 시간이 종료 시간보다 늦어지면 종료를 비운다
    const keepEnd = next && activity!.endTime && activity!.endTime > next ? activity!.endTime : undefined;
    patch({ startTime: next, endTime: keepEnd });
    setTimeError(null);
  }

  function setEnd(hour: string, minute: string) {
    const next = hour && minute ? hour + ":" + minute : undefined;
    patch({ endTime: next });
    if (next && activity!.startTime && next <= activity!.startTime) {
      setTimeError("종료 시간이 시작 시간보다 빨라요. 종료 시간을 다시 골라 주세요.");
    } else {
      setTimeError(null);
    }
  }

  function toggleHasBehavior(value: boolean) {
    // '있음'을 끄면 선택한 상세 내용도 비운다. 0개 허용 여부는 U3 미확정이다.
    patch({ hasBehavior: value, behaviors: value ? activity!.behaviors : [] });
  }

  function behaviorSelectionOf(type: BehaviorType) {
    return activity!.behaviors.find((b) => b.type === type);
  }

  function toggleBehaviorType(type: BehaviorType, checked: boolean) {
    if (!checked) {
      patch({ behaviors: activity!.behaviors.filter((b) => b.type !== type) });
      return;
    }
    const next = [...activity!.behaviors, { type, detailIds: [] as string[] }];
    setPendingActivity({ ...activity!, behaviors: next });
    const meta = BEHAVIOR_TYPES.find((t) => t.type === type);
    // 앞 3종은 상세 입력 화면으로 이동한다. 상위 '기타'는 현재 화면에서 직접 입력한다 (FR-27)
    if (meta?.hasDetailPage) {
      navigate("/diaries/new/activities/" + (isNew ? "new" : activity!.id) + "/behaviors/" + type);
    }
  }

  function loadPrevious() {
    if (!previousActivity) return;
    patch({
      participation: [...previousActivity.participation],
      participationOther: previousActivity.participationOther,
      preSupport: [...previousActivity.preSupport],
      preSupportOther: previousActivity.preSupportOther,
      reaction: [...previousActivity.reaction],
      reactionOther: previousActivity.reactionOther,
      positiveSupport: [...previousActivity.positiveSupport],
      positiveSupportOther: previousActivity.positiveSupportOther,
    });
    toast.success("이전 활동의 선택 항목을 불러왔어요.", {
      description: "시간과 상세 내용은 가져오지 않았습니다.",
    });
  }

  function save() {
    if (timeError) {
      toast.error("시간을 다시 확인해 주세요.");
      return;
    }
    // FR-25 — 임시 활동 목록만 갱신하고 서버에 저장하지 않는다
    upsertActivity(activity!);
    setPendingActivity(null);
    toast.success(isNew ? "활동을 추가했어요." : "활동을 수정했어요.", {
      description: "일지를 저장하기 전까지는 임시 데이터입니다.",
    });
    navigate("/diaries/new");
  }

  function cancel() {
    setPendingActivity(null);
    navigate("/diaries/new");
  }

  return (
    <AppShell
      header={
        <AppHeader
          title={isNew ? "활동 입력" : "활동 수정"}
          action={
            <Button variant="ghost" size="dense" onClick={cancel}>
              취소
            </Button>
          }
          backTo="/diaries/new"
        />
      }
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button block onClick={save}>
            저장하고 다음 활동
          </Button>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col gap-3">
        {previousActivity ? (
          <Alert
            tone="neutral"
            icon={<Download className="size-4" />}
            title="이전 활동과 같게"
          >
            <div className="mt-1 flex flex-col gap-2">
              <span>
                이전 활동의 참여 활동·사전 지원·반응·긍정행동지원 선택을 그대로 가져와요. 시간과 상세
                내용은 가져오지 않아요.
              </span>
              <Button variant="outline" size="compact" className="self-start" onClick={loadPrevious}>
                불러오기
              </Button>
            </div>
          </Alert>
        ) : null}

        <FormSection title="활동 시간">
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>시작 시간</FieldLabel>
              <div className="flex gap-3">
                <TimeSelect
                  label="시작 시"
                  options={HOUR_OPTIONS}
                  value={startHour}
                  onChange={(value) => setStart(value, startMinute || "00")}
                  suffix="시"
                />
                <TimeSelect
                  label="시작 분"
                  options={MINUTE_OPTIONS}
                  value={startMinute}
                  onChange={(value) => setStart(startHour || "09", value)}
                  suffix="분"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel>종료 시간</FieldLabel>
              <div className="flex gap-3">
                <TimeSelect
                  label="종료 시"
                  options={HOUR_OPTIONS.filter((h) => !startHour || h >= startHour)}
                  value={endHour}
                  onChange={(value) => setEnd(value, endMinute || "00")}
                  suffix="시"
                  disabled={!activity.startTime}
                />
                <TimeSelect
                  label="종료 분"
                  options={MINUTE_OPTIONS.filter(
                    (m) => !(startHour && endHour === startHour) || m > startMinute,
                  )}
                  value={endMinute}
                  onChange={(value) => setEnd(endHour || startHour || "10", value)}
                  suffix="분"
                  disabled={!activity.startTime}
                />
              </div>
              {!activity.startTime ? (
                <FieldDescription>
                  시작 시간을 먼저 고르면 종료 시간을 고를 수 있어요.
                </FieldDescription>
              ) : null}
              <FieldError>{timeError}</FieldError>
            </Field>
          </div>
          <DemoNote>
            분 단위 간격은 미확정이라 {MINUTE_STEP_DEMO_ONLY}분으로 두었습니다. 시간 역전·중복·자정
            넘김 처리 기준은 U6 미확정 사항입니다.
          </DemoNote>
        </FormSection>

        <FormSection title="참여 활동">
          <MultiChoiceGroup
            label="참여 활동"
            options={PARTICIPATION_OPTIONS}
            values={activity.participation}
            onChange={(values) => patch({ participation: values })}
            otherValue={activity.participationOther}
            onOtherChange={(value) => patch({ participationOther: value })}
          />
        </FormSection>

        <FormSection title="활동 상세 내용">
          <Field>
            <FieldLabel htmlFor="activity-detail">상세 내용</FieldLabel>
            <Textarea
              id="activity-detail"
              value={activity.detail}
              placeholder="활동 중 관찰한 내용을 적어 주세요."
              onChange={(event) => patch({ detail: event.target.value })}
            />
          </Field>
        </FormSection>

        <FormSection title="사전 지원">
          <MultiChoiceGroup
            label="사전 지원"
            options={PRE_SUPPORT_OPTIONS}
            values={activity.preSupport}
            onChange={(values) => patch({ preSupport: values })}
            otherValue={activity.preSupportOther}
            onOtherChange={(value) => patch({ preSupportOther: value })}
            // U2_REVIEW — '없음' 배타 동작. 계획서 FR-21에 정의되어 있으나 가이드 U2에서 재확인 필요
            exclusiveNone={flags.exclusiveNone}
            demoNote={
              flags.exclusiveNone
                ? "‘없음’을 고르면 다른 항목이 모두 해제돼요. (U2 재확인 필요)"
                : "‘없음’ 배타 동작을 끈 상태입니다. (U2 재확인 필요)"
            }
          />
        </FormSection>

        <FormSection title="이용자 반응">
          <MultiChoiceGroup
            label="이용자 반응"
            options={REACTION_OPTIONS}
            values={activity.reaction}
            onChange={(values) => patch({ reaction: values })}
            otherValue={activity.reactionOther}
            onOtherChange={(value) => patch({ reactionOther: value })}
            demoNote="선택 가능 개수는 미확정이라(FR-22) 시연에서는 여러 개 고를 수 있게 두었습니다."
          />
        </FormSection>

        <FormSection title="긍정행동지원">
          <MultiChoiceGroup
            label="긍정행동지원"
            options={POSITIVE_SUPPORT_OPTIONS}
            values={activity.positiveSupport}
            onChange={(values) => patch({ positiveSupport: values })}
            otherValue={activity.positiveSupportOther}
            onOtherChange={(value) => patch({ positiveSupportOther: value })}
            demoNote="선택 가능 개수는 미확정입니다(FR-23)."
          />
        </FormSection>

        <FormSection title="도전적 행동">
          <label className="flex min-h-11 cursor-pointer items-center gap-2">
            <Checkbox
              tone="behavior"
              checked={activity.hasBehavior}
              onCheckedChange={(value) => toggleHasBehavior(value === true)}
            />
            <span className="type-body font-medium">있음</span>
          </label>

          {activity.hasBehavior ? (
            <div className="flex flex-col gap-1">
              {BEHAVIOR_TYPES.map((meta) => {
                const selection = behaviorSelectionOf(meta.type);
                const checked = Boolean(selection);
                const summary = selection
                  ? meta.type === "other"
                    ? selection.otherText?.trim() || "직접 입력 전"
                    : selection.detailIds.length > 0
                      ? selection.detailIds
                          .map((id) => behaviorDetailLabel(meta.type, id))
                          .join(", ")
                      : "선택 안 함"
                  : "선택 안 함";

                return (
                  <div
                    key={meta.type}
                    className="flex min-h-12 items-center gap-3 rounded-control px-1"
                  >
                    <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                      <Checkbox
                        tone="behavior"
                        checked={checked}
                        onCheckedChange={(value) => toggleBehaviorType(meta.type, value === true)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="type-body font-medium">{meta.label}</span>
                        <span
                          className={
                            "truncate type-caption " +
                            (checked && summary !== "선택 안 함"
                              ? "text-behavior"
                              : "text-muted-foreground")
                          }
                        >
                          {summary}
                        </span>
                      </span>
                    </label>
                    {checked && meta.hasDetailPage ? (
                      <Button
                        variant="ghost"
                        size="dense"
                        onClick={() =>
                          navigate(
                            "/diaries/new/activities/" +
                              (isNew ? "new" : activity.id) +
                              "/behaviors/" +
                              meta.type,
                          )
                        }
                      >
                        상세 선택
                        <ChevronRight aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                );
              })}

              {/* 상위 '기타'는 상세 화면으로 이동하지 않고 여기서 직접 입력한다 (FR-27) */}
              {behaviorSelectionOf("other") ? (
                <OtherInput
                  id="behavior-other"
                  selected
                  value={behaviorSelectionOf("other")?.otherText ?? ""}
                  onChange={(value) =>
                    patch({
                      behaviors: activity.behaviors.map((b) =>
                        b.type === "other" ? { ...b, otherText: value } : b,
                      ),
                    })
                  }
                  placeholder="도전적 행동 내용을 직접 적어 주세요"
                  className="mt-1"
                />
              ) : null}

              <Badge variant="soft" tone="behavior" className="mt-2 self-start">
                {activity.behaviors.length}개 유형 선택됨
              </Badge>
            </div>
          ) : null}

          <DemoNote>
            세부 행동 항목의 최종 목록과 ‘선택 0개로 완료’ 허용 여부는 미확정 사항입니다(FR-27, U3).
            상세 화면의 항목은 모두 ‘예시 항목(확정 필요)’입니다.
          </DemoNote>
        </FormSection>
      </div>
    </AppShell>
  );
}

function splitTime(time?: string): [string, string] {
  if (!time) return ["", ""];
  const [hour, minute] = time.split(":");
  return [hour ?? "", minute ?? ""];
}

function TimeSelect({
  label,
  options,
  value,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className="flex-1">
        <SelectValue placeholder={suffix} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
            {suffix}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
