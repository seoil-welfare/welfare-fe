import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/api/queries";
import {
  draftFromDiary,
  emptyDraft,
  hasActivityInput,
  isUntouchedDraft,
  toSaveInput,
} from "@/services/diaryService";
import type { SaveDiaryInput } from "@/api/types";
import type { Activity, Diary, DiaryDraft } from "@/types";

/** 입력이 멈추고 이만큼 지나면 자동으로 임시저장한다 */
const AUTOSAVE_DELAY_MS = 2000;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * 작성 중인 일지의 임시 데이터.
 * 화면 사이에서 입력을 유지하는 클라이언트 상태이고, 라우트 이동으로 입력이 사라지지 않는다 (지시서 3장).
 *
 * 자동 임시저장 (기능명세서 8.4, B-5)
 * - 새로고침·앱 전환으로 입력이 사라지지 않게, 입력이 멈추면 '작성 중'으로 서버에 저장한다.
 *   화면이 가려지면(다른 앱으로 전환) 바로 저장한다.
 * - 처음은 POST로 만들고 받은 id를 draft.diaryId에 넣어, 다음부터는 같은 일지를 PUT으로 갱신한다.
 * - 활동 화면에서 아직 '저장'을 누르지 않은 활동도 함께 저장한다.
 * - 작성 완료 일지를 고치는 중이면 저장하지 않는다. 완료 → 작성 중으로 되돌릴 수 없다 (명세 4.5).
 * - 브라우저 저장소에는 두지 않는다. 이용자 기록이 기기에 남지 않게 한다 (명세 8.4).
 */
interface DraftContextValue {
  draft: DiaryDraft | null;
  startDraft: (userId: string, date: string) => void;
  continueDraft: (diary: Diary) => void;
  updateDraft: (partial: Partial<DiaryDraft>) => void;
  discardDraft: () => void;
  upsertActivity: (activity: Activity) => void;
  removeActivity: (activityId: string) => void;
  /**
   * 활동 입력/수정 화면에서 작성 중인 활동.
   * 도전적 행동 상세 화면으로 이동해도 선택값이 사라지지 않게 라우트 밖에 둔다.
   * FR-25에 따라 '저장하고 다음 활동'을 누를 때만 일지의 임시 활동 목록에 반영한다.
   */
  pendingActivity: Activity | null;
  setPendingActivity: (activity: Activity | null) => void;
  /**
   * 일지 작성 화면에서 활동 화면으로 넘어갈 때의 스크롤 위치.
   * 돌아왔을 때 같은 위치로 되돌리고 지운다.
   */
  editScrollY: number | null;
  setEditScrollY: (value: number | null) => void;
  /** 자동 임시저장 상태와 마지막으로 저장한 시각 */
  autosave: { status: AutosaveStatus; savedAt: Date | null };
  /** 지금 바로 임시저장한다 (상단 '임시저장' 버튼) */
  saveNow: () => Promise<void>;
  /**
   * '작성 완료'·'나중에 이어서' 직전에 부른다. 진행 중인 자동 저장을 기다리고 자동 저장을 멈춘 뒤,
   * 자동 저장으로 생긴 일지 id를 돌려준다 (같은 일지를 두 번 만들지 않게).
   */
  beginCommit: () => Promise<string | undefined>;
  /** 저장에 실패해 화면에 머무를 때 자동 저장을 다시 켠다 */
  cancelCommit: () => void;
  /** 대상 이용자에게 그 날짜 일지가 이미 있을 때 자동 저장을 막는다 (남의 일지를 덮지 않게) */
  setAutosaveBlocked: (blocked: boolean) => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const [pendingActivity, setPendingActivity] = useState<Activity | null>(null);
  const [editScrollY, setEditScrollY] = useState<number | null>(null);
  // 자동 임시저장으로 마지막으로 서버에 보낸 내용. 같으면 다시 보내지 않는다
  const lastSavedKey = useRef<string | null>(null);

  const startDraft = useCallback((userId: string, date: string) => {
    setDraft(emptyDraft(userId, date));
  }, []);

  const continueDraft = useCallback((diary: Diary) => {
    const next = draftFromDiary(diary);
    // 불러온 그대로는 다시 저장하지 않는다. 고친 게 생기면 그때 저장한다
    lastSavedKey.current = next.editingCompleted ? null : JSON.stringify(toSaveInput(next, "draft"));
    setDraft(next);
  }, []);

  const updateDraft = useCallback((partial: Partial<DiaryDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  /* ---------- 자동 임시저장 ---------- */

  const queryClient = useQueryClient();
  const [autosave, setAutosave] = useState<DraftContextValue["autosave"]>({ status: "idle", savedAt: null });
  const draftRef = useRef(draft);
  const pendingRef = useRef(pendingActivity);
  draftRef.current = draft;
  pendingRef.current = pendingActivity;
  const inFlight = useRef<Promise<string | undefined> | null>(null);
  // 저장 버튼을 누른 동안에는 자동 저장을 멈춘다
  const paused = useRef(false);
  // 대상 이용자에게 같은 날짜 일지가 이미 있으면 저장하지 않는다
  const blocked = useRef(false);

  const runSave = useCallback(async (): Promise<string | undefined> => {
    if (inFlight.current) await inFlight.current;
    const current = draftRef.current;
    const payload = autosavePayload(current, pendingRef.current);
    if (!current || !payload || paused.current || blocked.current) return current?.diaryId;
    const key = JSON.stringify(payload);
    if (key === lastSavedKey.current) return current.diaryId;

    setAutosave((prev) => ({ ...prev, status: "saving" }));
    const promise = api.diaries
      .save(payload)
      .then((diary) => {
        lastSavedKey.current = JSON.stringify({ ...payload, diaryId: diary.id });
        // 처음 저장이면 받은 id를 넣는다. 그사이 다른 일지로 바뀌었으면 건드리지 않는다
        setDraft((prev) =>
          prev && !prev.diaryId && prev.userId === diary.userId && prev.date === diary.date
            ? { ...prev, diaryId: diary.id, autosaved: true }
            : prev,
        );
        setAutosave({ status: "saved", savedAt: new Date() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.diaries });
        return diary.id;
      })
      .catch(() => {
        // 실패해도 입력은 화면에 남아 있다. 다음 입력 때 다시 시도한다
        setAutosave((prev) => ({ ...prev, status: "error" }));
        return current.diaryId;
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = promise;
    return promise;
  }, [queryClient]);

  // 입력이 멈추면 저장한다
  const payloadKey = useMemo(() => {
    const payload = autosavePayload(draft, pendingActivity);
    return payload ? JSON.stringify(payload) : null;
  }, [draft, pendingActivity]);

  useEffect(() => {
    if (!payloadKey || payloadKey === lastSavedKey.current) return;
    const timer = window.setTimeout(() => void runSave(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [payloadKey, runSave]);

  // 다른 앱으로 전환하거나 탭을 닫을 때는 기다리지 않고 바로 저장한다
  useEffect(() => {
    function flush() {
      if (document.visibilityState === "hidden") void runSave();
    }
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [runSave]);

  const saveNow = useCallback(async () => {
    await runSave();
  }, [runSave]);

  const beginCommit = useCallback(async () => {
    paused.current = true;
    if (inFlight.current) return inFlight.current;
    return draftRef.current?.diaryId;
  }, []);

  const cancelCommit = useCallback(() => {
    paused.current = false;
  }, []);

  const setAutosaveBlocked = useCallback((value: boolean) => {
    blocked.current = value;
  }, []);

  const discardDraft = useCallback(() => {
    setDraft(null);
    setPendingActivity(null);
    setEditScrollY(null);
    lastSavedKey.current = null;
    paused.current = false;
    setAutosave({ status: "idle", savedAt: null });
  }, []);

  const upsertActivity = useCallback((activity: Activity) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const exists = prev.activities.some((a) => a.id === activity.id);
      return {
        ...prev,
        activities: exists
          ? prev.activities.map((a) => (a.id === activity.id ? activity : a))
          : [...prev.activities, activity],
      };
    });
  }, []);

  const removeActivity = useCallback((activityId: string) => {
    setDraft((prev) =>
      prev ? { ...prev, activities: prev.activities.filter((a) => a.id !== activityId) } : prev,
    );
  }, []);

  const value = useMemo<DraftContextValue>(
    () => ({
      draft,
      startDraft,
      continueDraft,
      updateDraft,
      discardDraft,
      upsertActivity,
      removeActivity,
      pendingActivity,
      setPendingActivity,
      editScrollY,
      setEditScrollY,
      autosave,
      saveNow,
      beginCommit,
      cancelCommit,
      setAutosaveBlocked,
    }),
    [
      draft,
      startDraft,
      continueDraft,
      updateDraft,
      discardDraft,
      upsertActivity,
      removeActivity,
      pendingActivity,
      editScrollY,
      autosave,
      saveNow,
      beginCommit,
      cancelCommit,
      setAutosaveBlocked,
    ],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside DraftProvider");
  return ctx;
}

/**
 * 자동 저장할 내용. 저장할 게 없으면 null.
 * 활동 화면에서 아직 '저장'을 누르지 않은 활동도 목록에 넣어 함께 보낸다.
 */
function autosavePayload(draft: DiaryDraft | null, pending: Activity | null): SaveDiaryInput | null {
  if (!draft || draft.editingCompleted) return null;
  const withPending =
    pending && hasActivityInput(pending)
      ? {
          ...draft,
          activities: draft.activities.some((a) => a.id === pending.id)
            ? draft.activities.map((a) => (a.id === pending.id ? pending : a))
            : [...draft.activities, pending],
        }
      : draft;
  if (isUntouchedDraft(withPending)) return null;
  return toSaveInput(withPending, "draft");
}
