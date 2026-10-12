import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/misc";
import { behaviorDetailLabel, behaviorTypeLabel } from "@/data/catalog";
import { countActivityBehaviors, labelsOf, sortActivities } from "@/services/diaryService";
import { formatTimeRange } from "@/lib/utils";
import type { Activity } from "@/types";
import { cn } from "@/lib/utils";

/**
 * 일지 활동 아코디언 (FR-60~FR-63).
 * 최초 진입 시 기본 접힘 (FR-61 미확정 사항의 권장안).
 * 도전적 행동이 기록된 활동은 접힘·펼침 모두 헤더 행에 behavior-soft 배경과 주황 보조 문구를 유지한다.
 * 펼친 상세 본문은 흰 표면이다. 열림 상태와 행동 강조는 독립적이다 (가이드 7장).
 */
export function ActivityAccordion({
  activities,
  editLinkOf,
  className,
}: {
  activities: readonly Activity[];
  /** '이 활동만 수정' 경로. 없으면 수정 버튼을 두지 않는다 */
  editLinkOf?: (activity: Activity) => string;
  className?: string;
}) {
  const sorted = sortActivities(activities);

  return (
    <Card variant="list" className={className}>
      <Accordion type="multiple" className="divide-y divide-border">
        {sorted.map((activity) => {
          const behaviorCount = countActivityBehaviors(activity);
          const hasBehavior = behaviorCount > 0;
          return (
            <AccordionItem key={activity.id} value={activity.id}>
              <AccordionTrigger className={cn(hasBehavior && "bg-behavior-soft hover:bg-behavior-soft/80")}>
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="tnum type-body font-bold">
                      {formatTimeRange(activity.startTime, activity.endTime)}
                    </span>
                    {hasBehavior ? (
                      <Badge variant="soft" tone="behavior">
                        도전적 행동 {behaviorCount}건
                      </Badge>
                    ) : null}
                  </span>
                  <span className="type-caption text-muted-foreground break-keep">
                    {summarize(activity)}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <dl className="flex flex-col gap-3">
                  <DetailRow label="활동 상세 내용">
                    <p className="type-body-long whitespace-pre-wrap">
                      {activity.detail.trim() || "작성된 내용이 없어요."}
                    </p>
                  </DetailRow>
                  <DetailRow label="사전 지원">
                    <ChipList items={labelsOf(activity.preSupport, activity.preSupportOther)} />
                  </DetailRow>
                  <DetailRow label="이용자 반응">
                    <ChipList items={labelsOf(activity.reaction, activity.reactionOther)} />
                  </DetailRow>
                  <DetailRow label="긍정행동지원">
                    <ChipList
                      items={labelsOf(activity.positiveSupport, activity.positiveSupportOther)}
                    />
                  </DetailRow>
                  <DetailRow label="도전적 행동">
                    {hasBehavior ? (
                      <ul className="flex flex-col gap-1">
                        {activity.behaviors.map((selection) => (
                          <li key={selection.type} className="type-body text-behavior break-keep">
                            <span className="font-medium">{behaviorTypeLabel(selection.type)}</span>
                            {" · "}
                            {selection.type === "other"
                              ? (selection.otherText?.trim() || "내용 없음")
                              : selection.detailIds
                                  .map((id) => behaviorDetailLabel(selection.type, id))
                                  .join(", ")}
                            {selection.type !== "other" && selection.otherText?.trim()
                              ? " (" + selection.otherText.trim() + ")"
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      // '선택 안 함'은 비활성이 아니라 정보다 (가이드 2-3 1번)
                      <p className="type-body text-muted-foreground">선택 안 함</p>
                    )}
                  </DetailRow>
                </dl>
                {editLinkOf ? (
                  <Button variant="outline" size="dense" className="mt-4" asChild>
                    <Link to={editLinkOf(activity)}>
                      <Pencil aria-hidden />
                      이 활동만 수정
                    </Link>
                  </Button>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
}

function summarize(activity: Activity): string {
  const parts = labelsOf(activity.participation, activity.participationOther);
  const reaction = labelsOf(activity.reaction, activity.reactionOther);
  return (
    (parts.length > 0 ? parts.join(", ") : "참여 활동 미선택") +
    " · " +
    (reaction.length > 0 ? reaction.join(", ") : "반응 미선택")
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ChipList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return <p className="type-body text-muted-foreground">선택 안 함</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full bg-secondary px-2 py-0.5 type-caption text-secondary-foreground break-keep"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
