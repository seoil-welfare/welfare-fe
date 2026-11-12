/**
 * 미리보기에서 '고치기'를 누른 활동을 확인 화면에 넘긴다.
 * 미리보기는 뒤로가기로 확인 화면에 돌아가므로(방문 기록을 쌓지 않으려고) 주소나 state로 넘길 수 없다.
 */
let pendingEditId: string | null = null;

export const cardEditRequest = {
  set: (itemId: string | null) => {
    pendingEditId = itemId;
  },
  /** 한 번 꺼내면 비운다 */
  take: (): string | null => {
    const id = pendingEditId;
    pendingEditId = null;
    return id;
  },
};
