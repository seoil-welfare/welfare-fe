import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queries";
import { mockApi, mockSwitchStaff } from "@/api/mock/mockApi";
import { resetDb } from "@/api/mock/mockDb";
import { useDraft } from "@/app/DraftContext";
import { IS_MOCK } from "@/config";
import { getFlags, resetFlags, setFlags, subscribeFlags } from "@/demo/flagStore";
import type { DemoFlags } from "@/demo/flags";

/**
 * 시연 전용 상태.
 * 서버 데이터는 src/api가, 작성 중 일지는 DraftContext가 맡는다.
 * 여기에는 미확정 동작 비교용 플래그와 mock 모드 전용 동작(역할 전환·데모 초기화)만 둔다.
 */
interface DemoContextValue {
  flags: DemoFlags;
  setFlags: (partial: Partial<DemoFlags>) => void;
  /** DEMO_ONLY — 가상 역할 전환. mock 모드에서만 동작한다 */
  switchStaff: (staffId: string) => Promise<void>;
  /** DEMO_ONLY — 가상 데이터·세션·플래그를 처음 상태로 되돌린다 */
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { discardDraft } = useDraft();
  const flags = useSyncExternalStore(subscribeFlags, getFlags, getFlags);

  const switchStaff = useCallback(
    async (staffId: string) => {
      if (!IS_MOCK) return;
      mockSwitchStaff(staffId);
      client.setQueryData(queryKeys.me, await mockApi.auth.me());
    },
    [client],
  );

  const resetDemo = useCallback(() => {
    if (IS_MOCK) resetDb();
    resetFlags();
    discardDraft();
    client.clear();
    client.setQueryData(queryKeys.me, null);
  }, [client, discardDraft]);

  // 관찰용 상태(실패·빈 데이터·느린 응답)를 바꾸면 바로 다시 불러와 화면에 반영한다
  const updateFlags = useCallback(
    (partial: Partial<DemoFlags>) => {
      setFlags(partial);
      void client.invalidateQueries();
    },
    [client],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      flags,
      setFlags: updateFlags,
      switchStaff,
      resetDemo,
    }),
    [flags, updateFlags, switchStaff, resetDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
