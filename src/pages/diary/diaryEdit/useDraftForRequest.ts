import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api";
import { isApiError } from "@/api/errors";
import { useDiaries, useServiceUsers } from "@/api/queries";
import { forgetRememberedDraftId, readRememberedDraftId, useDraft } from "@/app/DraftContext";
import { useToday } from "@/lib/today";
import { activeServiceUsers, diariesOnDate, isUntouchedDraft } from "@/services/diaryService";

/**
 * 일지 작성 화면이 어떤 일지를 쓸지 정한다.
 * - 주소(?userId&date)로 대상을 지정해 들어왔는데 쓰던 draft와 다르면: 입력이 없으면 바로 바꾸고, 있으면 askReplace로 묻는다
 * - 새로고침으로 draft가 사라졌으면 기억해 둔 작성 중 일지를 서버에서 되살린다 (QA 03-01)
 * - 그래도 draft가 없으면 그 날짜에 아직 일지가 없는 이용자로 새 draft를 만든다
 * - 주소에 오늘 이후 날짜가 있으면 아무것도 시작하지 않는다 (futureRequest)
 */
export function useDraftForRequest() {
  const [params, setParams] = useSearchParams();
  const today = useToday();
  const { draft, startDraft, continueDraft, discardDraft } = useDraft();
  const usersQuery = useServiceUsers();
  const users = activeServiceUsers(usersQuery.data ?? []);

  const requestedUserId = params.get("userId");
  const requestedDate = params.get("date");
  // 주소에 오늘 이후 날짜를 직접 넣고 들어온 경우. 일지를 시작하지 않고 안내 화면만 보여 준다.
  // 달력은 서버의 canCreate로 이미 막지만, 주소창 입력은 거기를 거치지 않는다. 저장은 서버가 최종으로 막는다
  const futureRequest = requestedDate !== null && requestedDate > today;
  const targetDate = draft?.date ?? requestedDate ?? today;
  // 이용자 1명당 하루 1건 규칙을 안내하려고 그 날짜의 일지를 불러온다
  const dayQuery = useDiaries({ from: targetDate, to: targetDate });

  // 달력 등에서 이용자·날짜를 지정해 들어왔는데 쓰던 draft와 다른 경우 (날짜가 없으면 오늘)
  const hasRequest = requestedUserId !== null || requestedDate !== null;
  // 미래 날짜 요청은 받아들이지 않으므로, 쓰던 draft와 다르다고 보지 않는다 (쓰던 draft를 버리지 않게)
  const requestMismatch =
    !futureRequest &&
    draft !== null &&
    hasRequest &&
    ((requestedUserId !== null && requestedUserId !== draft.userId) || (requestedDate ?? today) !== draft.date);
  const askReplace = draft !== null && requestMismatch && !isUntouchedDraft(draft); // 입력이 있으면 확인 팝업

  // 입력한 게 없으면 바로 버린다. 아래 effect가 지정한 대상으로 새 draft를 만든다
  useEffect(() => {
    if (requestMismatch && !askReplace) discardDraft();
  }, [requestMismatch, askReplace, discardDraft]);

  // 지정한 대상을 반영했으면 주소에서 지운다. 화면에서 이용자를 바꿔도 다시 비교하지 않게 한다
  useEffect(() => {
    // 미래 날짜 요청은 주소에 남겨 둔다. 지우면 안내 화면 대신 쓰던 draft가 보여 헷갈린다
    if (draft && hasRequest && !requestMismatch && !futureRequest) setParams({}, { replace: true });
  }, [draft, hasRequest, requestMismatch, futureRequest, setParams]);

  // 저장·삭제를 마치고 다른 화면으로 넘어가는 중이다. 이때 draft가 비어도 새 일지를 만들지 않는다
  const committedRef = useRef(false);

  // 새로고침으로 draft가 사라진 뒤, 서버에 저장되어 있던 작성 중 일지를 기억한 id로 되살린다 (QA 03-01).
  // 끝나기 전에는 아래 '새 일지 만들기' effect가 먼저 실행되면 안 되므로 restoring으로 기다리게 한다
  // 메모리에 쓰던 draft가 있으면(활동 화면에서 돌아온 경우) 되살리지 않는다. 서버본이 더 오래돼 방금 추가한 활동을 덮어쓴다
  const [restoring, setRestoring] = useState(() => !draft && Boolean(readRememberedDraftId()));
  useEffect(() => {
    if (!restoring) return;
    const diaryId = readRememberedDraftId();
    if (!diaryId) {
      setRestoring(false);
      return;
    }
    let active = true;
    api.diaries
      .get(diaryId)
      .then((diary) => {
        if (!active) return;
        // 완료된 일지는 '이어 쓰기' 대상이 아니다. continueDraft가 그 경우 id를 지운다
        if (diary.status !== "completed") continueDraft(diary);
        else forgetRememberedDraftId();
      })
      .catch((error) => {
        if (!active) return;
        // 지워졌거나(404) 권한이 없으면(403) 기억한 id를 지운다. 그 외(네트워크 등)는 다음에 다시 시도한다
        if (isApiError(error) && (error.status === 404 || error.status === 403)) {
          forgetRememberedDraftId();
        }
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [restoring, continueDraft]);

  // 라우트 이동으로 입력이 사라지지 않게 draft를 유지한다. 없으면 새로 만든다.
  useEffect(() => {
    if (committedRef.current || restoring) return;
    if (futureRequest) return; // 오늘 이후 날짜로는 새 일지를 시작하지 않는다
    // 이전 날짜의 결과(placeholder)로 기본 이용자를 고르지 않는다
    if (draft || users.length === 0 || !dayQuery.data || dayQuery.isPlaceholderData) return;
    // 일지는 이용자 1명당 하루 1건이다. 대상이 지정되지 않았다면
    // 그 날짜에 아직 일지가 없는 이용자를 기본값으로 고른다.
    const saved = diariesOnDate(dayQuery.data, targetDate);
    const firstAvailable = users.find((user) => !saved.some((d) => d.userId === user.id));
    startDraft(requestedUserId ?? firstAvailable?.id ?? users[0].id, targetDate);
  }, [draft, users, startDraft, requestedUserId, targetDate, dayQuery.data, dayQuery.isPlaceholderData, restoring, futureRequest]);

  return {
    users,
    usersQuery,
    dayQuery,
    futureRequest,
    /** 기억해 둔 작성 중 일지를 되살리는 중 */
    restoring,
    /** 주소로 지정한 대상이 쓰던 draft와 달라서, 새로 쓸지 물어야 한다 */
    askReplace,
    /** 저장·삭제를 마쳤다. 이제 draft를 비워도 새 일지를 만들지 않는다 */
    markCommitted: () => {
      committedRef.current = true;
    },
    /** 이어서 쓰기: 지정한 대상을 무시하고 쓰던 draft를 그대로 둔다 */
    keepCurrentDraft: () => setParams({}, { replace: true }),
    /** 새로 쓰기: 쓰던 draft를 버리고 지정한 대상으로 새 draft를 만든다 */
    startRequestedDraft: () => {
      if (!draft) return;
      discardDraft();
      startDraft(requestedUserId ?? draft.userId, requestedDate ?? today);
    },
  };
}
