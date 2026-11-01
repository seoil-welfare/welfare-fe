/**
 * 로그인해 있던 중에 세션이 만료되어 로그아웃되었는지.
 * 401을 받았을 때 표시해 두고, 로그인 화면이 이 값을 보고 안내 팝업을 띄운다.
 * 처음부터 로그인하지 않은 상태(앱 첫 접속, 로그인 실패)의 401은 표시하지 않는다.
 */
let expired = false;

export function markSessionExpired(): void {
  expired = true;
}

export function isSessionExpired(): boolean {
  return expired;
}

/** 안내 팝업을 닫으면 지운다. 다음에 로그인 화면에 올 때 다시 뜨지 않게 */
export function clearSessionExpired(): void {
  expired = false;
}
