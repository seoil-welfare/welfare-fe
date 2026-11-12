/**
 * 오늘 카드 (AI 기능).
 * 일지를 작성 완료하면 서버가 AI로 초안을 만들고, 담당자가 확인·수정한 뒤 보호자에게 링크로 보낸다.
 * 서버 계약은 src/api/types.ts의 TodayCardApi·GuardianCardApi를 본다.
 */

/** 정해진 그림 카드. 매번 그림이 달라지지 않도록 생성하지 않고 이 목록에서 고른다 */
export type Pictogram =
  | "music"
  | "meal"
  | "art"
  | "sports"
  | "cooking"
  | "walk"
  | "outing"
  | "daily"
  | "favorite"
  | "rest";

/** 앞면 표정. 앞면에는 좋았던 순간만 담으므로 부정적인 표정은 두지 않는다 */
export type CardMood = "excited" | "good" | "tired";

export interface TodayCardItem {
  id: string;
  /** HH:mm */
  time: string;
  /** 일지의 참여 활동 이름 (예: 음악활동) */
  activity: string;
  /** 앞면에 크게 쓰는 한 단어 (예: 북) */
  word: string;
  pictogram: Pictogram;
  mood: CardMood;
  /** 앞면: 이용자에게 읽어 주는 쉬운 문장 */
  easyText: string;
  /** 뒷면: 보호자에게 쓰는 알림장 문장. 도전적 행동은 여기에만 사실대로 적는다 */
  guardianText: string;
  /** 뒷면: 집에서 이어 하면 좋은 것 */
  homeTip?: string;
}

/**
 * 카드 상태.
 * generating: AI가 만드는 중 / ready: 확인 대기 / failed: 만들지 못함 / outdated: 만든 뒤 일지가 바뀜 / sent: 보냄
 */
export type TodayCardStatus = "generating" | "ready" | "failed" | "outdated" | "sent";

/** 마지막 장에서 무엇을 어떻게 골랐는지 */
export type PickHow = "pointed" | "observed";

export interface CardPick {
  /** 고른 활동. 고르지 않았으면 없다 */
  itemId?: string;
  how?: PickHow;
  skipped: boolean;
  /** 오프셋이 붙은 ISO 8601 */
  pickedAt: string;
}

/** 보호자 화면과 담당자 화면이 함께 쓰는 카드 내용 */
export interface CardContent {
  /** 카드에 보이는 이름. 실명 대신 보호자와 정한 별칭 */
  nickname: string;
  /** YYYY-MM-DD */
  date: string;
  program: string;
  /** 마지막 장 위의 하루 요약 */
  summary: string;
  items: TodayCardItem[];
  /** 체크하면 뒷면에 따로 연락드린다는 문장이 붙는다 */
  needsCall: boolean;
}

/** 담당자 화면용 (GET /diaries/{diaryId}/card) */
export interface TodayCard extends CardContent {
  diaryId: string;
  status: TodayCardStatus;
  /** 수정할 때 그대로 보낸다. 그사이 다른 사람이 고쳤으면 409 */
  updatedAt: string;
  /** 보낸 시각 (sent일 때) */
  sentAt?: string;
  /** 링크가 열리는 마지막 날 YYYY-MM-DD (sent일 때) */
  expiresOn?: string;
  /** 보호자에게 보낼 링크 (sent일 때). 서버는 문자를 보내지 않으므로 담당자가 복사해 직접 보낸다. 다시 불러와도 같은 값 */
  shareUrl?: string;
  /** 보호자 쪽에서 고른 결과 (있을 때) */
  pick?: CardPick;
}

/** 보호자 화면용 (GET /cards/{token}). 이용자 실명·직원 정보는 담지 않는다 */
export interface GuardianCard extends CardContent {
  expiresOn: string;
  pick?: CardPick;
}
