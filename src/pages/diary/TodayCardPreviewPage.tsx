import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/misc";
import { LoadFailureState } from "@/components/common/states";
import { TodayCardView } from "@/components/todayCard/TodayCardView";
import { cardEditRequest } from "@/components/todayCard/editRequest";
import { errorMessage } from "@/api/errors";
import { useSendTodayCard, useTodayCard } from "@/api/queries";

/**
 * 오늘 카드 미리보기 (담당자). 보호자에게 보이는 그대로 보여 주고, 여기서 바로 보낼 수 있다.
 * 보호자가 고르는 마지막 장은 눌러 봐도 저장하지 않는다.
 */
export function TodayCardPreviewPage() {
  const { diaryId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cardQuery = useTodayCard(diaryId);
  const send = useSendTodayCard(diaryId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reviewPath = "/diaries/" + diaryId + "/card";

  // 확인 화면에서 넘어왔으면 뒤로, 주소로 바로 열었으면 확인 화면으로 (방문 기록을 쌓지 않는다)
  function back() {
    if (location.key !== "default") navigate(-1);
    else navigate(reviewPath, { replace: true });
  }

  if (cardQuery.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner label="카드를 불러오는 중…" />
      </div>
    );
  }
  if (cardQuery.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5">
        <LoadFailureState
          reason={errorMessage(cardQuery.error, "카드를 불러오지 못했어요.")}
          onRetry={() => void cardQuery.refetch()}
        />
      </div>
    );
  }

  const card = cardQuery.data;
  const sendable = card.status === "ready";

  return (
    <>
      <TodayCardView
        card={card}
        preview={{
          onBack: back,
          onEdit: (itemId) => {
            cardEditRequest.set(itemId);
            back();
          },
          onSend: () => {
            if (!sendable) {
              toast.info(card.status === "sent" ? "이미 보낸 카드예요." : "카드를 확인할 수 있을 때 보내 주세요.");
              return;
            }
            setConfirmOpen(true);
          },
          sending: send.isPending,
        }}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="보호자에게 보낼까요?"
        description="보낸 뒤에는 고칠 수 없어요. 링크는 보낸 날부터 7일 동안 열려요."
        confirmLabel="보내기"
        tone="default"
        onConfirm={() =>
          send.mutate(undefined, {
            onSuccess: () => {
              toast.success("보호자에게 보냈어요.");
              back();
            },
            onError: (error) => toast.error(errorMessage(error, "보내지 못했어요. 다시 시도해 주세요.")),
          })
        }
      />
    </>
  );
}
