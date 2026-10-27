import { SERVICE_USERS, STAFF } from "@/data/fixtures";
import { DEMO_KEYS, clearDemo, readDemo, writeDemo } from "@/demo/demoStorage";
import { getFlags, subscribeFlags } from "@/demo/flagStore";
import type { Diary, DiaryEvent, ServiceUser, Staff } from "@/types";

/**
 * 브라우저 안의 가상 서버 저장소.
 * 실제 백엔드가 가질 데이터(일지·소식·이용자·직원·세션)를 흉내 낸다.
 * '새로고침 후에도 유지' 플래그가 켜져 있을 때만 localStorage에 쓴다 (지시서 0-8).
 */

export interface MockState {
  diaries: Diary[];
  events: DiaryEvent[];
  serviceUsers: ServiceUser[];
  staff: Staff[];
  session: { currentStaffId: string | null };
}

let state: MockState | null = null;

/**
 * 일지·소식은 비운 채 시작한다. 직접 써 보며 화면을 확인하기 위해서다.
 * 직원 계정(로그인)과 이용자는 남긴다. 검증 스크립트는 generateFixtures로 샘플을 따로 만든다.
 */
function buildInitialState(): MockState {
  return {
    diaries: [],
    events: [],
    serviceUsers: SERVICE_USERS.map((u) => ({ ...u })),
    staff: STAFF.map((s) => ({ ...s })),
    session: { currentStaffId: null },
  };
}

function load(): MockState {
  const initial = buildInitialState();
  if (!getFlags().persist) return initial;
  // 데이터와 세션은 따로 복원한다 (데이터 저장 전에 세션만 남아 있을 수 있다)
  const saved = readDemo<Omit<MockState, "session">>(DEMO_KEYS.state);
  const session = readDemo<MockState["session"]>(DEMO_KEYS.session);
  return {
    ...(saved ?? initial),
    session: { currentStaffId: session?.currentStaffId ?? null },
  };
}

function persist(current: MockState): void {
  if (!getFlags().persist) return;
  const { session, ...data } = current;
  writeDemo(DEMO_KEYS.state, data);
  writeDemo(DEMO_KEYS.session, session);
}

// 유지 플래그를 켜는 순간의 상태도 바로 저장한다
subscribeFlags(() => {
  if (state) persist(state);
});

export function readDb(): MockState {
  if (!state) state = load();
  return state;
}

export function writeDb(update: (current: MockState) => MockState): MockState {
  state = update(readDb());
  persist(state);
  return state;
}

export function resetDb(): void {
  clearDemo();
  state = buildInitialState();
}
