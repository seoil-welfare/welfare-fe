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
import { isUpdatedByOther } from "@/api/errors";
import { saveDiaryBeforeUnload } from "@/api/http/httpApi";
import { queryKeys } from "@/api/queries";
import { ConfirmDialog } from "@/components/ui/dialog";
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
 *
 * 동시 수정 (명세 4.6)
 * - 저장할 때마다 받은 updatedAt을 draft에 넣어 두고, 다음 수정(PUT)에 그대로 보낸다.
 * - 그사이 다른 사람이 저장했으면 서버가 409로 거절한다. 그러면 자동 저장을 멈추고,
 *   입력을 버리기 전에 확인을 받은 뒤 최신 내용을 다시 불러온다.
 *
 * 떠나기 전 경고·끝까지 저장하기 (QA 03-01, 04-01)
 * - 서버에 아직 저장 안 된 입력(완료 일지 수정 중이면 불러온 내용과 달라진 입력)이 있을 때
 *   새로고침·탭 닫기를 하면 브라우저 기본 경고를 띄운다. 작성 완료 등으로 나가는 중에는 띄우지 않는다.
 * - 탭을 닫는 중(pagehide)에는 보통 fetch가 끊길 수 있어 keepalive로 다시 보낸다.
 * - 작성 중 일지가 서버에 저장되면 그 id만 sessionStorage에 기억해 둔다. 새로고침으로 /diaries/new가
 *   빈 화면이 되면 이 id로 불러와 이어서 쓴다 (일지 내용 자체는 기기에 남기지 않는다).
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
  /** 지금 바로 임시저장하고 결과를 돌려준다 (상단 '임시저장' 버튼) */
  saveNow: () => Promise<SaveAttempt>;
  /**
   * '작성 완료'·'나중에 이어서' 직전에 부른다. 진행 중인 자동 저장을 기다리고 자동 저장을 멈춘 뒤,
   * 자동 저장으로 생긴 일지 id를 돌려준다 (같은 일지를 두 번 만들지 않게).
   */
  beginCommit: () => Promise<SavedVersion>;
  /** 저장에 실패해 화면에 머무를 때 자동 저장을 다시 켠다 */
  cancelCommit: () => void;
  /** 대상 이용자에게 그 날짜 일지가 이미 있을 때 자동 저장을 막는다 (남의 일지를 덮지 않게) */
  setAutosaveBlocked: (blocked: boolean) => void;
  /** 저장이 409 DIARY_UPDATED_BY_OTHER로 거절됐을 때 부른다. 최신 내용을 불러올지 묻는다 */
  reportUpdatedByOther: () => void;
}

/**
 * 임시저장 결과.
 * saved: 저장했거나 서버에 이미 같은 내용이 있다 / nothing: 입력이 없어 저장할 게 없다
 * blocked: 같은 날짜에 이미 일지가 있다 / conflicted: 다른 사람이 먼저 저장했다
 * busy: 작성 완료 등을 처리하는 중이다 / error: 저장 요청이 실패했다 (error에 원인)
 */
export interface SaveAttempt {
  id: string | undefined;
  status: "saved" | "nothing" | "blocked" | "conflicted" | "busy" | "error";
  error?: unknown;
}

/** 서버에 마지막으로 저장된 이 일지의 id와 updatedAt */
interface SavedVersion {
  diaryId?: string;
  updatedAt?: string;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const [pendingActivity, setPendingActivity] = useState<Activity | null>(null);
  const [editScrollY, setEditScrollY] = useState<number | null>(null);
  // 자동 임시저장으로 마지막으로 서버에 보낸 내용. 같으면 다시 보내지 않는다
  const lastSavedKey = useRef<string | null>(null);
  // 자동 저장 직후에는 draft 상태가 아직 바뀌기 전일 수 있어 따로 기억한다 ('작성 완료'가 옛 updatedAt을 보내지 않게)
  const savedVersion = useRef<SavedVersion>({});
  // 완료 일지를 불러온 그대로의 내용. 자동 저장이 없는 완료 일지 수정 중 '바뀐 게 있는지'를 여기에 비교한다 (QA 04-01)
  const originalContentKey = useRef<string | null>(null);

  const startDraft = useCallback((userId: string, date: string) => {
    savedVersion.current = {};
    originalContentKey.current = null;
    forgetRememberedDraftId();
    setDraft(emptyDraft(userId, date));
  }, []);

  const continueDraft = useCallback((diary: Diary) => {
    const next = draftFromDiary(diary);
    // 불러온 그대로는 다시 저장하지 않는다. 고친 게 생기면 그때 저장한다
    lastSavedKey.current = next.editingCompleted ? null : contentKey(toSaveInput(next, "draft"));
    // 완료 일지를 수정하는 중에는 자동 저장이 없으니, 떠나기 전 경고는 이 값과 비교해 바뀐 게 있는지 본다 (QA 04-01)
    originalContentKey.current = contentKey(toSaveInput(next, "draft"));
    savedVersion.current = { diaryId: diary.id, updatedAt: diary.updatedAt };
    setDraft(next);
    // 작성 중 일지만 되살릴 수 있게 id를 기억한다. 완료 일지는 자동 저장 대상이 아니다 (QA 03-01)
    if (next.editingCompleted) forgetRememberedDraftId();
    else rememberDraftId(diary.id);
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
  // 다른 사람이 먼저 저장해 거절됐다. 최신 내용을 불러올 때까지 자동 저장하지 않는다
  const conflicted = useRef(false);
  const [askReload, setAskReload] = useState(false);

  const reportUpdatedByOther = useCallback(() => {
    conflicted.current = true;
    setAskReload(true);
  }, []);

  const attemptSave = useCallback(async (options?: { keepalive?: boolean }): Promise<SaveAttempt> => {
    if (inFlight.current) await inFlight.current;
    const current = draftRef.current;
    const built = autosavePayload(current, pendingRef.current);
    // 저장하지 않은 이유를 돌려준다 ('임시저장' 버튼이 알맞은 안내를 하도록)
    if (!current || !built) return { id: current?.diaryId, status: "nothing" };
    if (paused.current) return { id: current.diaryId, status: "busy" };
    if (blocked.current) return { id: current.diaryId, status: "blocked" };
    if (conflicted.current) return { id: current.diaryId, status: "conflicted" };
    // 바로 앞 저장 결과가 아직 draft에 반영되기 전일 수 있다. id와 updatedAt은 마지막 저장 결과를 쓴다
    const saved = savedVersion.current;
    const payload: SaveDiaryInput = saved.diaryId
      ? { ...built, diaryId: saved.diaryId, updatedAt: saved.updatedAt }
      : built;
    const key = contentKey(payload);
    // 이미 서버에 있는 내용과 같아서 보내지 않았다. 저장된 것으로 본다
    if (key === lastSavedKey.current) return { id: current.diaryId, status: "saved" };

    // 탭이 실제로 닫히는 중이라 응답을 기다릴 수 없다. keepalive로 보내고 결과는 확인하지 않는다
    if (options?.keepalive) {
      saveDiaryBeforeUnload(payload);
      return { id: current.diaryId, status: "saved" };
    }

    setAutosave((prev) => ({ ...prev, status: "saving" }));
    const promise = api.diaries
      .save(payload)
      .then((diary) => {
        lastSavedKey.current = contentKey({ ...payload, diaryId: diary.id });
        // 작성 중 일지만 되살릴 수 있게 id를 기억한다 (QA 03-01)
        rememberDraftId(diary.id);
        const latest = draftRef.current;
        if (
          latest &&
          (latest.diaryId === diary.id ||
            (!latest.diaryId && latest.userId === diary.userId && latest.date === diary.date))
        ) {
          savedVersion.current = { diaryId: diary.id, updatedAt: diary.updatedAt };
        }
        // 처음 저장이면 받은 id를 넣는다. 그사이 다른 일지로 바뀌었으면 건드리지 않는다
        // 다음 수정에 보낼 updatedAt은 매번 새 값으로 바꾼다
        setDraft((prev) => {
          if (!prev) return prev;
          if (prev.diaryId === diary.id) return { ...prev, updatedAt: diary.updatedAt };
          if (!prev.diaryId && prev.userId === diary.userId && prev.date === diary.date) {
            return { ...prev, diaryId: diary.id, autosaved: true, updatedAt: diary.updatedAt };
          }
          return prev;
        });
        setAutosave({ status: "saved", savedAt: new Date() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.diaries });
        return { id: diary.id, status: "saved" } as SaveAttempt;
      })
      .catch((error: unknown): SaveAttempt => {
        const byOther = isUpdatedByOther(error);
        if (byOther) reportUpdatedByOther();
        // 실패해도 입력은 화면에 남아 있다. 다음 입력 때 다시 시도한다
        setAutosave((prev) => ({ ...prev, status: "error" }));
        return { id: current.diaryId, status: byOther ? "conflicted" : "error", error };
      });
    const tracked = promise.then((result) => result.id).finally(() => {
      inFlight.current = null;
    });
    inFlight.current = tracked;
    return promise;
  }, [queryClient, reportUpdatedByOther]);

  // 자동 저장·화면 가려짐 때는 결과 종류가 필요 없다 (일지 id만)
  const runSave = useCallback(
    async (options?: { keepalive?: boolean }): Promise<string | undefined> => (await attemptSave(options)).id,
    [attemptSave],
  );

  // 입력이 멈추면 저장한다
  const payloadKey = useMemo(() => {
    const payload = autosavePayload(draft, pendingActivity);
    return payload ? contentKey(payload) : null;
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
    // pagehide: 탭이 실제로 닫히거나 새로고침되는 중이다. 보통 fetch는 이 중에 끊길 수 있어 keepalive로 보낸다 (QA 03-01)
    function flushOnPagehide() {
      if (inFlight.current) return; // 이미 보내고 있는 요청이 있으면 중복으로 보내지 않는다
      void runSave({ keepalive: true });
    }
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flushOnPagehide);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flushOnPagehide);
    };
  }, [runSave]);

  // 떠나기 전 경고 (beforeunload, QA 03-01·04-01): 서버에 아직 저장 안 된 입력이 있으면 브라우저 기본 경고를 띄운다.
  // beginCommit~discardDraft 사이(작성 완료·수정 완료·삭제로 나가는 중, paused=true)에는 경고하지 않는다
  const hasUnsavedChanges = useCallback((): boolean => {
    const current = draftRef.current;
    if (!current || paused.current) return false;
    if (current.editingCompleted) {
      // 완료 일지 수정 중은 자동 저장이 없다. 불러온 내용과 달라졌는지로 판단한다
      return contentKey(toSaveInput(current, "draft")) !== (originalContentKey.current ?? "");
    }
    if (inFlight.current) return true; // 저장이 끝나기 전이다
    const built = autosavePayload(current, pendingRef.current);
    if (!built) return false; // 저장할 입력이 없다 (빈 새 일지 등)
    return contentKey(built) !== lastSavedKey.current;
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = ""; // 일부 브라우저는 반환값이 있어야 경고를 띄운다
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveNow = useCallback(async (): Promise<SaveAttempt> => attemptSave(), [attemptSave]);

  const beginCommit = useCallback(async () => {
    paused.current = true;
    if (inFlight.current) await inFlight.current;
    return savedVersion.current;
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
    savedVersion.current = {};
    originalContentKey.current = null;
    paused.current = false;
    conflicted.current = false;
    setAskReload(false);
    setAutosave({ status: "idle", savedAt: null });
    forgetRememberedDraftId();
  }, []);

  /** 다른 사람이 저장한 최신 내용으로 draft를 바꾼다. 활동 화면에서 쓰던 활동도 버린다 */
  const reloadLatest = useCallback(async () => {
    const diaryId = draftRef.current?.diaryId;
    setAskReload(false);
    if (!diaryId) return;
    try {
      const latest = await api.diaries.get(diaryId);
      queryClient.setQueryData(queryKeys.diary(latest.id), latest);
      void queryClient.invalidateQueries({ queryKey: queryKeys.diaries });
      conflicted.current = false;
      paused.current = false;
      setPendingActivity(null);
      continueDraft(latest);
      setAutosave({ status: "idle", savedAt: null });
    } catch {
      // 불러오지 못하면 입력을 그대로 두고, 다음 저장 때 다시 묻는다
      setAutosave((prev) => ({ ...prev, status: "error" }));
    }
  }, [queryClient, continueDraft]);

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
      reportUpdatedByOther,
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
      reportUpdatedByOther,
    ],
  );

  return (
    <DraftContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={askReload}
        onOpenChange={(open) => {
          // '나중에': 입력은 그대로 둔다. 자동 저장은 멈춘 채로, 다시 저장하면 또 묻는다
          if (!open) setAskReload(false);
        }}
        title="다른 분이 먼저 이 일지를 수정했어요"
        description="최신 내용을 불러오면 지금 입력한 내용은 사라져요. 입력한 내용을 따로 옮겨 두려면 '나중에'를 눌러 주세요."
        confirmLabel="최신 내용 불러오기"
        cancelLabel="나중에"
        tone="default"
        onConfirm={() => void reloadLatest()}
      />
    </DraftContext.Provider>
  );
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside DraftProvider");
  return ctx;
}

/** 같은 내용인지 비교하는 키. updatedAt은 저장할 때마다 바뀌므로 뺀다 (안 빼면 저장이 끝없이 반복된다) */
function contentKey(input: SaveDiaryInput): string {
  const { updatedAt: _updatedAt, ...content } = input;
  return JSON.stringify(content);
}

/**
 * 새로고침 뒤에도 작성 중 일지를 이어받을 수 있게 diaryId만 기억한다 (QA 03-01).
 * 일지 내용·이용자 이름은 담지 않는다 (명세 8.4, 기기에 기록을 남기지 않는다).
 * 탭을 닫으면 사라지는 sessionStorage를 쓰고, 시크릿 모드 등에서 막히면 그냥 되살리기만 못 한다.
 */
const DRAFT_ID_STORAGE_KEY = "wonkwang:draft-diary-id";

function rememberDraftId(diaryId: string): void {
  try {
    window.sessionStorage.setItem(DRAFT_ID_STORAGE_KEY, diaryId);
  } catch {
    // 무시한다
  }
}

export function readRememberedDraftId(): string | null {
  try {
    return window.sessionStorage.getItem(DRAFT_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function forgetRememberedDraftId(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_ID_STORAGE_KEY);
  } catch {
    // 무시한다
  }
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
