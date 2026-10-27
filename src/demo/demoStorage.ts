/**
 * 데모 전용 localStorage 래퍼.
 * 공개 서비스의 데이터 저장이 아니며, 민감 기록을 서비스 워커로 캐싱하지 않는다 (지시서 0-8).
 * 초기화는 DemoPanel의 '데모 초기화' 버튼으로 수행한다.
 */

const PREFIX = "wonkwang-demo:";

export const DEMO_KEYS = {
  // v2: 목 일지·소식을 비운 버전. 예전에 저장된 샘플 일지가 남지 않게 키를 바꾼다
  state: PREFIX + "state-v2",
  flags: PREFIX + "flags",
  session: PREFIX + "session",
} as const;

export function readDemo<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDemo(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 시크릿 모드 등에서 실패할 수 있다. 데모 동작은 메모리 상태로 계속한다.
  }
}

export function clearDemo(): void {
  try {
    Object.values(DEMO_KEYS).forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // 무시한다
  }
}
