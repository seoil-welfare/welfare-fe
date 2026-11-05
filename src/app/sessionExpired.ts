/**
 * 로그인해 있던 중에 강제로 로그아웃되었는지, 그 이유는 무엇인지.
 *  - expired: 세션 만료 (401)
 *  - disabled: 팀장·국장이 계정을 사용 중지함 (403 ACCOUNT_DISABLED)
 * 응답을 받았을 때 표시해 두고, 로그인 화면이 이 값을 보고 이유에 맞는 안내 팝업을 띄운다.
 * 처음부터 로그인하지 않은 상태(앱 첫 접속, 로그인 실패)는 표시하지 않는다.
 */
export type SignedOutReason = "expired" | "disabled";

let reason: SignedOutReason | null = null;

/** 사용 중지 안내가 먼저 표시됐으면, 세션이 끊겨 뒤따라오는 401이 만료로 덮어쓰지 않는다 */
export function markSignedOut(next: SignedOutReason): void {
  if (reason === "disabled") return;
  reason = next;
}

export function signedOutReason(): SignedOutReason | null {
  return reason;
}

/** 안내 팝업을 닫으면 지운다. 다음에 로그인 화면에 올 때 다시 뜨지 않게 */
export function clearSignedOut(): void {
  reason = null;
}
