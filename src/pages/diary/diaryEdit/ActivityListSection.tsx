import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FormSection } from "@/components/common/FormSection";
import { EmptyState } from "@/components/common/states";
import { formatTimeRange } from "@/lib/utils";
import { activitySummary, countActivityBehaviors } from "@/services/diaryService";
import type { Activity } from "@/types";

/**
 * 활동 내용 목록 (FR-12).
 * - 활동마다 시간과 요약, 도전적 행동 건수를 보여 주고, 누르면 활동 화면으로 간다
 * - 활동 화면으로 넘어가기 직전에 onLeave로 스크롤 위치를 기억하게 한다 (돌아오면 그 자리로)
 * - 활동 삭제는 확인 팝업을 거친다
 */
export function ActivityListSection({
  activities,
  onLeave,
  onRemove,
}: {
  /** 시작 시간순으로 정렬된 활동 */
  activities: readonly Activity[];
  onLeave: () => void;
  onRemove: (activityId: string) => void;
}) {
  // 삭제 확인 팝업을 띄울 활동
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  return (
    <FormSection title="활동 내용" description={"활동 " + activities.length + "건"}>
      {activities.length === 0 ? (
        <EmptyState message="아직 등록한 활동이 없어요." />
      ) : (
        <Card variant="list">
          <ul className="divide-y divide-border">
            {activities.map((activity) => {
              const behaviorCount = countActivityBehaviors(activity);
              const time = formatTimeRange(activity.startTime, activity.endTime);
              return (
                <li key={activity.id} className={"flex items-center" + (behaviorCount > 0 ? " bg-behavior-soft" : "")}>
                  <Link
                    to={"/diaries/new/activities/" + activity.id}
                    onClick={onLeave}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 hover:bg-accent"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="tnum type-body font-medium">{time}</span>
                        {behaviorCount > 0 ? (
                          <Badge variant="soft" tone="behavior">
                            도전적 행동 {behaviorCount}건
                          </Badge>
                        ) : null}
                      </span>
                      <span className="truncate type-caption text-muted-foreground">{activitySummary(activity)}</span>
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2 shrink-0 text-muted-foreground"
                    aria-label={time + " 활동 삭제"}
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
        <Link to="/diaries/new/activities/new" onClick={onLeave}>
          <Plus aria-hidden />
          활동 내용 추가
        </Link>
      </Button>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={(deleteTarget ? formatTimeRange(deleteTarget.startTime, deleteTarget.endTime) + " " : "") + "활동을 삭제할까요?"}
        description="삭제한 활동 내용은 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={() => {
          if (deleteTarget) onRemove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </FormSection>
  );
}
