import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { draftFromDiary, emptyDraft } from "@/services/diaryService";
import type { Activity, Diary, DiaryDraft } from "@/types";

/**
 * 작성 중인 일지의 임시 데이터 (저장 전).
 * 서버 데이터가 아니라 화면 사이에서 입력을 유지하기 위한 클라이언트 상태다.
 * 라우트 이동으로 작성 중 입력이 사라지지 않는다 (지시서 3장).
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
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const [pendingActivity, setPendingActivity] = useState<Activity | null>(null);
  const [editScrollY, setEditScrollY] = useState<number | null>(null);

  const startDraft = useCallback((userId: string, date: string) => {
    setDraft(emptyDraft(userId, date));
  }, []);

  const continueDraft = useCallback((diary: Diary) => {
    setDraft(draftFromDiary(diary));
  }, []);

  const updateDraft = useCallback((partial: Partial<DiaryDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const discardDraft = useCallback(() => {
    setDraft(null);
    setPendingActivity(null);
    setEditScrollY(null);
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
    ],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside DraftProvider");
  return ctx;
}
