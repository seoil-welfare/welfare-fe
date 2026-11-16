/** 오늘 카드(AI)는 서버 연결 전이라 개발 서버에서만 연다. 배포본에는 경로와 버튼이 없다 */
export const TODAY_CARD_ENABLED = import.meta.env.DEV;

/** 출력 양식 관리(기관 양식 등록·제거)는 서버 연결 전이라 개발 서버에서만 연다 */
export const REPORT_FORMS_ENABLED = import.meta.env.DEV;
