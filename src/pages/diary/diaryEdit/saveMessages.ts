import { toast } from "sonner";
import { errorMessage, isApiError, NETWORK_ERROR_STATUS } from "@/api/errors";
import type { SaveAttempt } from "@/app/DraftContext";
import type { Diary } from "@/types";

/** 이용자·날짜당 일지 1건 규칙 안내 (여러 안내의 아래 줄에 같이 쓴다) */
const ONE_PER_DAY = "일지는 이용자 한 명당 하루 한 건이에요.";

/** 고른 이용자에게 이 날짜 일지가 이미 있어 저장을 막았을 때 */
export function toastExistingDiary(existing: Diary) {
  toast.error(
    existing.status === "completed"
      ? "이 이용자는 이 날짜에 작성 완료된 일지가 있어요."
      : "이 이용자는 이 날짜에 작성 중인 일지가 있어요.",
    { description: ONE_PER_DAY },
  );
}

/** 상단 '임시저장'을 눌렀는데 이미 일지가 있는 이용자일 때 */
export function toastTempSaveBlocked() {
  toast.error("이 이용자는 이 날짜에 이미 일지가 있어요.", { description: ONE_PER_DAY });
}

/** 상단 '임시저장' 결과. 실제로 저장됐을 때만 성공 안내를 한다 (QA 03-05) */
export function toastTempSaveResult(result: SaveAttempt) {
  switch (result.status) {
    case "saved":
      toast.success("임시 저장했어요.", { description: "홈의 '이어서 작성하기'에서 다시 열 수 있어요." });
      break;
    case "nothing":
      toast.info("입력한 내용이 없어 저장하지 않았어요.");
      break;
    case "blocked":
      toast.error("이 이용자는 이 날짜에 이미 일지가 있어 저장하지 못했어요.", { description: ONE_PER_DAY });
      break;
    case "conflicted":
      toast.error("다른 분이 먼저 이 일지를 수정해서 저장하지 못했어요.", {
        description: "최신 내용을 불러온 뒤 다시 저장해 주세요.",
      });
      break;
    case "busy":
      toast.info("저장하는 중이에요. 잠시 뒤 다시 눌러 주세요.");
      break;
    default:
      // 서버 message가 있으면 그걸 먼저 보여 준다
      toast.error(
        isApiError(result.error) && result.error.status !== NETWORK_ERROR_STATUS
          ? result.error.message
          : "임시 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
  }
}

/** '나중에 이어서'·'작성 완료'·'수정 완료' 저장 실패 (다른 사람이 먼저 고친 경우는 부르는 쪽이 따로 처리한다) */
export function toastCommitError(error: unknown) {
  toast.error("저장하지 못했어요.", {
    // 응답을 받지 못한 경우는 서버에 저장됐을 수도 있다. 목록을 다시 불러오므로
    // 이미 저장된 일지가 있으면 그 이용자는 선택할 수 없게 바뀌어 확인할 수 있다.
    description:
      isApiError(error) && error.status === NETWORK_ERROR_STATUS
        ? "네트워크 문제로 저장 여부를 확인하지 못했어요. 이미 저장됐는지 확인한 뒤 다시 시도해 주세요."
        : errorMessage(error),
  });
}
