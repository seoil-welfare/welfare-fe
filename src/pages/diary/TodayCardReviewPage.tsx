import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { EmptyState } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { MoodFace, cardDate, cardTime } from "@/components/todayCard/cardParts";
import { cardEditRequest } from "@/components/todayCard/editRequest";
import { shareCardLink } from "@/components/todayCard/shareLink";
import { errorMessage, isApiError } from "@/api/errors";
import { useRegenerateTodayCard, useSendTodayCard, useTodayCard, useUpdateTodayCard } from "@/api/queries";
import type { TodayCard, TodayCardItem } from "@/types/todayCard";

/**
 * 오늘 카드 확인 (담당자 화면).
 * 일지를 작성 완료하면 서버가 AI로 초안을 만든다. 담당자가 확인·수정한 뒤 공유 링크를 만들어 보호자에게 직접 보낸다.
 * 서버는 문자를 보내지 않는다. 링크를 만든 뒤에는 '링크 다시 복사'로 같은 링크를 몇 번이고 다시 보낼 수 있다.
 */
export function TodayCardReviewPage() {
  const { diaryId = "" } = useParams();
  const navigate = useNavigate();
  const cardQuery = useTodayCard(diaryId);
  const update = useUpdateTodayCard(diaryId);
  const regenerate = useRegenerateTodayCard(diaryId);
  const send = useSendTodayCard(diaryId);
  // 미리보기에서 '고치기'로 돌아왔으면 보던 활동의 고치기 칸을 열고 시작한다
  const [editingId, setEditingId] = useState<string | null>(() => cardEditRequest.take());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const backTo = "/diaries/" + diaryId;
  const card = cardQuery.data;
  const editable = card?.status === "ready" || card?.status === "outdated";
  const notFound = isApiError(cardQuery.error) && cardQuery.error.status === 404;

  // 미리보기에서 돌아왔으면 열어 둔 고치기 칸으로 스크롤하고 첫 입력칸에 커서를 둔다 (카드를 불러온 뒤 한 번)
  const scrolled = useRef(false);
  useEffect(() => {
    if (scrolled.current || !editingId || !card) return;
    scrolled.current = true;
    const target = document.getElementById("card-" + editingId + "-front");
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [editingId, card]);

  /** 문장·'따로 연락' 표시를 저장한다. 그사이 다른 사람이 고쳤으면 서버가 409로 거절한다 */
  function save(next: TodayCard, onDone?: () => void) {
    update.mutate(
      {
        updatedAt: next.updatedAt,
        needsCall: next.needsCall,
        items: next.items.map(({ id, easyText, guardianText, homeTip }) => ({ id, easyText, guardianText, homeTip })),
      },
      {
        onSuccess: () => onDone?.(),
        onError: (error) =>
          toast.error(
            isApiError(error) && error.status === 409
              ? "다른 분이 먼저 이 카드를 고쳤어요. 최신 내용을 불러왔어요."
              : errorMessage(error, "저장하지 못했어요. 다시 시도해 주세요."),
          ),
      },
    );
  }

  function regenerateCard() {
    regenerate.mutate(undefined, {
      onError: (error) => toast.error(errorMessage(error, "다시 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.")),
    });
  }

  const pickedItem = card?.pick?.itemId ? card.items.find((item) => item.id === card.pick?.itemId) : undefined;

  return (
    <AppShell
      header={
        <AppHeader
          title="오늘 카드 확인"
          backTo={backTo}
          action={
            card && card.status !== "generating" && card.status !== "failed" ? (
              <Button variant="ghost" size="dense" asChild>
                <Link to={"/diaries/" + diaryId + "/card/preview"}>미리보기</Link>
              </Button>
            ) : undefined
          }
        />
      }
      bottom="action"
      width="form"
      bottomBar={
        card?.status === "sent" ? (
          <BottomActionBar>
            <Button variant="outline" className="flex-1" onClick={() => navigate(backTo)}>
              일지로
            </Button>
            <Button className="flex-[2]" onClick={() => void shareCardLink(card)}>
              <Link2 aria-hidden />
              링크 다시 복사
            </Button>
          </BottomActionBar>
        ) : (
          <BottomActionBar>
            <Button variant="outline" className="flex-1" onClick={() => navigate(backTo)}>
              나중에
            </Button>
            <Button
              className="flex-[2]"
              disabled={card?.status !== "ready" || editingId !== null || update.isPending || send.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {send.isPending ? "링크 만드는 중…" : "공유 링크 만들기"}
            </Button>
          </BottomActionBar>
        )
      }
    >
      {notFound ? (
        <Card variant="form">
          <EmptyState message="작성 완료한 일지만 오늘 카드가 만들어져요." />
        </Card>
      ) : (
        <QueryGate state={cardQuery}>
          {() => {
            const current = card!;
            if (current.status === "generating") {
              return (
                <Card variant="form" className="flex justify-center py-10">
                  <Spinner label="일지로 오늘 카드를 만들고 있어요…" />
                </Card>
              );
            }
            if (current.status === "failed") {
              return (
                <Card variant="form">
                  <EmptyState
                    message="오늘 카드를 만들지 못했어요."
                    action={
                      <Button variant="outline" disabled={regenerate.isPending} onClick={regenerateCard}>
                        <RefreshCw aria-hidden />
                        다시 만들기
                      </Button>
                    }
                  />
                </Card>
              );
            }
            return (
              <div className="flex flex-col gap-3">
                {current.status === "sent" ? (
                  <div className="rounded-control bg-accent px-3 py-2.5 type-body text-accent-foreground">
                    <p>
                      {cardDate((current.sentAt ?? "").slice(0, 10), false)}에 링크를 만들었어요 ·{" "}
                      {cardDate(current.expiresOn ?? "", false)}까지 열려요
                    </p>
                    {current.pick ? (
                      <p className="mt-1 font-medium">
                        {current.pick.skipped || !pickedItem
                          ? "오늘은 고르지 않았어요"
                          : "제일 좋았던 것: " +
                            pickedItem.word +
                            (current.pick.how === "pointed" ? " (직접 가리켰어요)" : " (보호자가 보기에)")}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {current.status === "outdated" ? (
                  <div className="flex items-center justify-between gap-2 rounded-control bg-warning-soft px-3 py-2.5">
                    <p className="type-body text-warning-foreground">카드를 만든 뒤 일지가 바뀌었어요.</p>
                    <Button
                      variant="outline"
                      size="compact"
                      disabled={regenerate.isPending}
                      onClick={() => setRegenerateOpen(true)}
                    >
                      다시 만들기
                    </Button>
                  </div>
                ) : null}

                {current.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    editable={editable}
                    editing={editingId === item.id}
                    locked={(editingId !== null && editingId !== item.id) || update.isPending}
                    onEdit={() => setEditingId(item.id)}
                    onDone={(next) =>
                      save({ ...current, items: current.items.map((it) => (it.id === next.id ? next : it)) }, () =>
                        setEditingId(null),
                      )
                    }
                  />
                ))}

                <p className="flex items-start gap-2 rounded-control bg-muted px-3 py-3 type-body-long text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  도전적 행동은 앞면에 들어가지 않아요. 뒷면에만 사실대로 적혀요.
                </p>

                <label htmlFor="card-needs-call" className="flex cursor-pointer items-start gap-3 px-1 py-2">
                  <Checkbox
                    id="card-needs-call"
                    className="mt-0.5"
                    checked={current.needsCall}
                    disabled={!editable || update.isPending}
                    onCheckedChange={(value) => save({ ...current, needsCall: value === true })}
                  />
                  <span>
                    <span className="block type-body font-medium">오늘 다쳤거나 위험했던 일이 있어요</span>
                    <span className="mt-0.5 block type-caption text-muted-foreground">
                      체크하면 뒷면에 ‘선생님이 전화로 따로 연락드릴게요’가 붙어요
                    </span>
                  </span>
                </label>
              </div>
            );
          }}
        </QueryGate>
      )}

      {/* 다시 만들면 담당자가 고친 문장이 새 초안으로 바뀌므로 한 번 묻는다 */}
      <ConfirmDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        title="카드를 다시 만들까요?"
        description="바뀐 일지로 새로 만들어요. 고친 문장은 새 초안으로 바뀌어요."
        confirmLabel="다시 만들기"
        tone="default"
        onConfirm={regenerateCard}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="공유 링크를 만들까요?"
        description="링크를 만든 뒤에는 카드를 고칠 수 없어요. 링크는 오늘부터 7일 동안 열려요. 보호자에게는 직접 보내 주세요."
        confirmLabel="링크 만들기"
        tone="default"
        onConfirm={() =>
          send.mutate(undefined, {
            onSuccess: (sent) => void shareCardLink(sent),
            onError: (error) => toast.error(errorMessage(error, "링크를 만들지 못했어요. 다시 시도해 주세요.")),
          })
        }
      />
    </AppShell>
  );
}

function ItemCard({
  item,
  editable,
  editing,
  locked,
  onEdit,
  onDone,
}: {
  item: TodayCardItem;
  /** 보낸 카드는 고칠 수 없다 */
  editable: boolean;
  editing: boolean;
  locked: boolean;
  onEdit: () => void;
  onDone: (next: TodayCardItem) => void;
}) {
  const [draft, setDraft] = useState(item);
  const [error, setError] = useState<string | null>(null);
  const prefix = "card-" + item.id;

  function done() {
    if (!draft.easyText.trim() || !draft.guardianText.trim()) {
      setError("앞면과 뒷면 문장을 모두 적어 주세요.");
      return;
    }
    setError(null);
    onDone({
      ...draft,
      easyText: draft.easyText.trim(),
      guardianText: draft.guardianText.trim(),
      homeTip: draft.homeTip?.trim() || undefined,
    });
  }

  return (
    <Card variant="form">
      <div className="flex items-center justify-between gap-2">
        <h2 className="type-heading">
          {cardTime(item.time)} · {item.activity}
        </h2>
        {editing ? (
          <Button size="compact" disabled={locked} onClick={done}>
            완료
          </Button>
        ) : editable ? (
          <Button
            variant="outline"
            size="compact"
            disabled={locked}
            onClick={() => {
              setDraft(item);
              onEdit();
            }}
          >
            고치기
          </Button>
        ) : null}
      </div>

      {editing ? (
        <FieldGroup className="mt-3">
          <Field>
            <FieldLabel htmlFor={prefix + "-front"}>앞면 · 이용자에게 읽어 주는 문장</FieldLabel>
            <Textarea
              id={prefix + "-front"}
              value={draft.easyText}
              onChange={(event) => setDraft({ ...draft, easyText: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={prefix + "-back"}>뒷면 · 보호자 메모</FieldLabel>
            <Textarea
              id={prefix + "-back"}
              value={draft.guardianText}
              onChange={(event) => setDraft({ ...draft, guardianText: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={prefix + "-tip"}>집에서 해 보세요 (선택)</FieldLabel>
            <Textarea
              id={prefix + "-tip"}
              value={draft.homeTip ?? ""}
              onChange={(event) => setDraft({ ...draft, homeTip: event.target.value })}
            />
            <FieldError>{error}</FieldError>
          </Field>
        </FieldGroup>
      ) : (
        <dl className="mt-2 grid grid-cols-[3rem_1fr] gap-x-2 gap-y-1.5 type-body-long">
          <dt className="font-bold text-primary">앞면</dt>
          <dd className="flex items-center gap-1.5">
            {item.easyText}
            <MoodFace mood={item.mood} className="size-4 shrink-0" />
          </dd>
          <dt className="font-bold text-primary">뒷면</dt>
          <dd>{item.guardianText}</dd>
          {item.homeTip ? (
            <>
              <dt className="font-bold text-warning-foreground">집에서</dt>
              <dd>{item.homeTip}</dd>
            </>
          ) : null}
        </dl>
      )}
    </Card>
  );
}
