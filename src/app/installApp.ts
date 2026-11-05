import { useSyncExternalStore } from "react";

/**
 * 홈 화면에 앱 추가 (PWA 설치).
 * - Chrome·Edge(안드로이드, PC)는 설치할 수 있을 때 beforeinstallprompt를 보낸다. 이 이벤트를 받아 두었다가
 *   버튼을 누를 때 브라우저 설치 창을 띄운다. 이벤트는 앱이 켜지자마자 올 수 있어 main.tsx에서 먼저 듣기 시작한다.
 * - 아이폰·아이패드 Safari는 이 이벤트가 없어 버튼으로 바로 설치할 수 없다. 공유 메뉴 안내를 보여 준다.
 * - 이미 설치한 앱으로 열었으면(standalone) 아무것도 보여 주지 않는다.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMode = "prompt" | "ios" | "installed" | "unavailable";

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // 아이패드는 데스크톱 Safari처럼 보고하므로 터치 지원으로 구분한다
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** main.tsx에서 한 번 부른다 */
export function listenForInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // 브라우저 기본 설치 배너 대신 우리 버튼으로 띄운다
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

function currentMode(): InstallMode {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isIos()) return "ios";
  return "unavailable";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, currentMode, () => "unavailable");
}

/** 브라우저 설치 창을 띄운다. 설치했으면 true */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // 한 번 쓴 이벤트는 다시 쓸 수 없다
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}
