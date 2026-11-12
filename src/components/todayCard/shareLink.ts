import { toast } from "sonner";
import type { TodayCard } from "@/types/todayCard";

/**
 * 오늘 카드 공유 링크를 보호자에게 전한다.
 * 서버는 문자를 보내지 않는다. 담당자가 이 링크를 카카오톡 등으로 직접 보낸다.
 *  - 휴대폰: 공유창(navigator.share)을 띄워 바로 카카오톡 등을 고르게 한다
 *  - 공유창이 없거나 막히면: 클립보드에 복사
 *  - 둘 다 막히면(버튼을 누른 뒤 시간이 지나 브라우저가 거절 등): 토스트의 '복사' 버튼으로 다시 시도
 */
export async function shareCardLink(card: TodayCard): Promise<void> {
  const url = card.shareUrl;
  if (!url) {
    toast.error("공유 링크가 없어요. 카드를 다시 불러와 주세요.");
    return;
  }
  const until = expiresText(card);
  const text = card.nickname + "님의 오늘 카드예요." + (until ? " " + until + "까지 열 수 있어요." : "");
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "케어로그 오늘 카드", text, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;   // 담당자가 공유창을 닫음
    }
  }
  if (await copy(url)) {
    toast.success("링크를 복사했어요. 보호자에게 보내 주세요.");
    return;
  }
  toast.info("링크를 만들었어요. 복사해서 보호자에게 보내 주세요.", {
    action: { label: "복사", onClick: () => void copy(url).then((ok) => ok && toast.success("링크를 복사했어요.")) },
  });
}

async function copy(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** "2026-11-19" → "11월 19일" (없으면 빈 문자열) */
function expiresText(card: TodayCard): string {
  const [, month, day] = (card.expiresOn ?? "").split("-").map(Number);
  return month && day ? month + "월 " + day + "일" : "";
}
