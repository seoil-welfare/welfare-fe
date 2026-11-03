import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { OtherInput } from "@/components/common/OtherInput";
import { behaviorTypeLabel } from "@/data/catalog";
import { useDraft } from "@/app/DraftContext";
import { useCategoryChoices } from "@/app/useCategoryChoices";
import { behaviorDetailChoices } from "@/services/categoryService";
import type { BehaviorType } from "@/types";

/**
 * 도전적 행동 선택 화면 (2.1.6/FR-26 ~ FR-28).
 * - 우측 상단 '모두 해제' (FR-26)
 * - 세부 행동 복수 선택, '기타' 선택 시 직접 입력 (FR-27)
 * - '선택 완료'는 작성 중인 임시 데이터에만 반영한다 (FR-28)
 * - 독립 페이지를 유지한다. 바텀시트로 바꾸지 않는다 (가이드 6장)
 */
export function BehaviorDetailPage() {
  const navigate = useNavigate();
  const { type, activityId } = useParams();
  const { pendingActivity, setPendingActivity } = useDraft();

  const choices = useCategoryChoices();

  const behaviorType = (type ?? "selfHarm") as BehaviorType;
  const backTo = "/diaries/new/activities/" + (activityId ?? "new");

  const selection = pendingActivity?.behaviors.find((b) => b.type === behaviorType);
  const selectedIds = selection?.detailIds ?? [];
  const options = behaviorDetailChoices(choices, behaviorType, selectedIds); // 세부 항목 (GET /categories)
  const otherOption = options.find((o) => o.label === "기타");
  const otherSelected = otherOption ? selectedIds.includes(otherOption.id) : false;

  if (!pendingActivity) {
    return (
      <AppShell header={<AppHeader title="도전적 행동" backTo="/diaries/new" />} bottom="nav">
        <Card variant="form">
          <p className="type-body text-muted-foreground">작성 중인 활동이 없어요.</p>
          <Button className="mt-3" onClick={() => navigate("/diaries/new")}>
            일지 작성으로 이동
          </Button>
        </Card>
      </AppShell>
    );
  }

  function updateSelection(detailIds: string[], otherText?: string) {
    const exists = pendingActivity!.behaviors.some((b) => b.type === behaviorType);
    const behaviors = exists
      ? pendingActivity!.behaviors.map((b) =>
          b.type === behaviorType
            ? { ...b, detailIds, otherText: otherText ?? b.otherText }
            : b,
        )
      : [...pendingActivity!.behaviors, { type: behaviorType, detailIds, otherText }];
    setPendingActivity({ ...pendingActivity!, behaviors });
  }

  function toggle(detailId: string, checked: boolean) {
    updateSelection(
      checked ? [...selectedIds, detailId] : selectedIds.filter((id) => id !== detailId),
    );
  }

  function clearAll() {
    // FR-26 미확정: '모두 해제' 시 기존 '기타' 텍스트의 처리 방식.
    // 시연에서는 텍스트를 지우지 않고 보존한다.
    updateSelection([]);
  }

  return (
    <AppShell
      header={
        <AppHeader
          title={behaviorTypeLabel(behaviorType)}
          backTo={backTo}
          action={
            <Button variant="ghost" size="dense" onClick={clearAll}>
              모두 해제
            </Button>
          }
        />
      }
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button block onClick={() => navigate(backTo)}>
            {selectedIds.length > 0 ? selectedIds.length + "개 선택 완료" : "선택 없이 완료"}
          </Button>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="type-heading">세부 행동</h2>
          <Badge variant="soft" tone="behavior">
            {selectedIds.length}개 선택됨
          </Badge>
        </div>

        <Card variant="list">
          <ul className="divide-y divide-border">
            {options.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <li key={option.id}>
                  {/* 행 전체가 조작 영역이고 최소 44px이다 (가이드 4-3) */}
                  <label
                    className={
                      "flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 " +
                      (checked ? "bg-behavior-soft" : "hover:bg-accent")
                    }
                  >
                    <Checkbox
                      tone="behavior"
                      checked={checked}
                      onCheckedChange={(value) => toggle(option.id, value === true)}
                    />
                    <span
                      className={
                        "min-w-0 flex-1 type-body " + (checked ? "text-behavior font-medium" : "")
                      }
                    >
                      {option.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>

        {otherOption ? (
          <OtherInput
            id={"behavior-detail-other-" + behaviorType}
            selected={otherSelected}
            value={selection?.otherText ?? ""}
            onChange={(value) => updateSelection(selectedIds, value)}
            placeholder="세부 행동을 직접 적어 주세요"
          />
        ) : null}

      </div>
    </AppShell>
  );
}
