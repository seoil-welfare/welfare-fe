import { DEFAULT_FLAGS, type DemoFlags } from "@/demo/flags";
import { DEMO_KEYS, readDemo, writeDemo } from "@/demo/demoStorage";

/**
 * 시연 플래그 저장소.
 * mock API가 React 밖에서 '불러오기 실패'·'느린 로딩' 같은 관찰용 상태를 읽어야 하므로
 * 컨텍스트가 아니라 모듈 스토어에 둔다. 화면은 useSyncExternalStore로 구독한다.
 * localStorage는 처음 읽을 때 불러온다 (검증 스크립트가 import 뒤에 storage를 주입한다).
 */

let flags: DemoFlags | null = null;
const listeners = new Set<() => void>();

export function getFlags(): DemoFlags {
  if (!flags) {
    flags = { ...DEFAULT_FLAGS, ...(readDemo<Partial<DemoFlags>>(DEMO_KEYS.flags) ?? {}) };
  }
  return flags;
}

export function setFlags(partial: Partial<DemoFlags>): void {
  flags = { ...getFlags(), ...partial };
  writeDemo(DEMO_KEYS.flags, flags);
  listeners.forEach((listener) => listener());
}

export function resetFlags(): void {
  setFlags(DEFAULT_FLAGS);
}

export function subscribeFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
