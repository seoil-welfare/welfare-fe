/**
 * 출력 양식(docx)에 넣을 수 있는 칸 목록.
 * 기관이 자기 양식에 {이용자이름}처럼 한글 표시를 넣으면 앱이 값을 채운다. 기존 영어 표시({clientName})도 그대로 된다.
 * 양식을 올릴 때 검사(앱이 채울 수 없는 칸 안내)와 양식 만드는 법 안내가 이 목록을 쓴다.
 *
 * 반복 칸: {#활동}…{/활동}처럼 감싸면 그 안(표 한 줄)이 활동 수만큼 반복된다.
 */

export type ReportFormKind = "daily" | "monthly";

export interface ReportField {
  /** 앱 데이터의 키 (기존 양식의 영어 표시) */
  key: string;
  /** 기관 양식에 쓰는 한글 표시 */
  label: string;
  /** 무엇이 들어가는지 */
  description: string;
}

export interface ReportLoop extends ReportField {
  /** 반복 안에서 쓰는 칸 */
  fields: ReportField[];
}

export interface ReportFieldSet {
  fields: ReportField[];
  loops: ReportLoop[];
}

const DAILY_ROW: ReportField[] = [
  { key: "time", label: "시간", description: "활동 시간 (예: 10:00~11:00)" },
  { key: "participation", label: "참여활동", description: "참여 활동" },
  { key: "detail", label: "활동내용", description: "활동 상세 내용" },
  { key: "preSupport", label: "사전지원", description: "사전 지원" },
  { key: "reaction", label: "이용자반응", description: "이용자 반응" },
  { key: "positiveSupport", label: "긍정행동지원", description: "긍정행동지원" },
  { key: "noneMark", label: "행동없음표시", description: "도전적 행동이 없으면 ■, 있으면 □" },
  { key: "someMark", label: "행동있음표시", description: "도전적 행동이 있으면 ■, 없으면 □" },
  { key: "behaviors", label: "도전적행동", description: "도전적 행동 (영역 - 항목)" },
];

export const DAILY_FIELDS: ReportFieldSet = {
  fields: [
    { key: "clientName", label: "이용자이름", description: "이용자 이름" },
    { key: "birth6", label: "생년월일", description: "생년월일 6자리 (예: 991207)" },
    { key: "authorName", label: "작성자", description: "일지 작성자 이름" },
    { key: "year", label: "연", description: "일지 날짜의 연도 (예: 2026)" },
    { key: "month", label: "월", description: "일지 날짜의 월 (예: 11)" },
    { key: "day", label: "일", description: "일지 날짜의 일 (예: 9)" },
    { key: "weekday", label: "요일", description: "요일 한 글자 (예: 월)" },
    { key: "weather", label: "날씨", description: "날씨" },
    { key: "condition", label: "컨디션", description: "이용자 컨디션" },
    { key: "behaviorCount", label: "행동건수", description: "그날 도전적 행동 선택 건수" },
    { key: "notes", label: "특이사항", description: "특이사항" },
  ],
  loops: [
    { key: "activities", label: "활동", description: "활동마다 한 줄씩 반복", fields: DAILY_ROW },
    {
      key: "behaviorRecords",
      label: "행동기록",
      description: "도전적 행동이 있었던 활동마다 한 줄씩 반복",
      fields: [
        { key: "time", label: "시간", description: "활동 시간" },
        { key: "behaviors", label: "도전적행동", description: "도전적 행동 (영역 - 항목)" },
        { key: "support", label: "지원방법", description: "그 활동의 지원 방법" },
      ],
    },
  ],
};

const MONTHLY_ROW: ReportField[] = [
  { key: "day", label: "일", description: "날짜 (1~31)" },
  { key: "condition", label: "컨디션", description: "그날 컨디션" },
  { key: "activity", label: "대표활동", description: "그날 가장 많이 고른 참여 활동" },
  { key: "support", label: "주요지원", description: "그날 가장 많이 고른 사전 지원" },
  { key: "reaction", label: "전반반응", description: "그날 가장 많이 고른 이용자 반응" },
  { key: "remarks", label: "특이사항", description: "그날 특이사항과 도전적 행동 선택 기록" },
  { key: "behaviors", label: "도전적행동", description: "그날 도전적 행동 항목별 건수" },
  { key: "count", label: "행동건수", description: "그날 도전적 행동 선택 건수" },
];

export const MONTHLY_FIELDS: ReportFieldSet = {
  fields: [
    { key: "clientName", label: "이용자이름", description: "이용자 이름" },
    { key: "authorNames", label: "작성자", description: "그 달 일지 작성자 이름 (여러 명이면 쉼표로)" },
    { key: "year", label: "연", description: "출력한 달의 연도" },
    { key: "month", label: "월", description: "출력한 달" },
    { key: "summaryParticipation", label: "주요참여활동", description: "그 달 많이 고른 참여 활동 요약" },
    { key: "summarySupport", label: "기록된지원방법", description: "그 달 많이 고른 지원 방법 요약" },
    { key: "summaryNotes", label: "특이사항요약", description: "도전적 행동 요약과 날짜별 특이사항" },
  ],
  loops: [
    { key: "days", label: "날짜별", description: "1일~말일까지 한 줄씩 반복", fields: MONTHLY_ROW },
    { key: "firstHalf", label: "전반기", description: "1일~16일 한 줄씩 반복", fields: MONTHLY_ROW },
    { key: "secondHalf", label: "후반기", description: "17일~말일 한 줄씩 반복", fields: MONTHLY_ROW },
  ],
};

export const REPORT_FIELDS: Record<ReportFormKind, ReportFieldSet> = {
  daily: DAILY_FIELDS,
  monthly: MONTHLY_FIELDS,
};

/**
 * 양식에 쓸 수 있는 표시 이름 전부 (영어·한글). 반복 칸은 '반복이름'과 '반복이름.칸'으로 담는다.
 * 양식 검사에서 '앱이 채울 수 없는 칸'을 찾을 때 쓴다.
 */
export function knownTags(kind: ReportFormKind): { top: Set<string>; loops: Map<string, Set<string>> } {
  const set = REPORT_FIELDS[kind];
  const top = new Set(set.fields.flatMap((f) => [f.key, f.label]));
  const loops = new Map<string, Set<string>>();
  for (const loop of set.loops) {
    const inner = new Set(loop.fields.flatMap((f) => [f.key, f.label]));
    loops.set(loop.key, inner);
    loops.set(loop.label, inner);
  }
  return { top, loops };
}

/**
 * 출력 값에 한글 표시 이름을 덧붙인다. {clientName}과 {이용자이름} 어느 쪽으로 써도 같은 값이 들어간다.
 * 반복 칸 안의 값도 같은 방식으로 덧붙인다.
 */
export function withKoreanLabels(kind: ReportFormKind, data: object): Record<string, unknown> {
  const set = REPORT_FIELDS[kind];
  const source = data as Record<string, unknown>;
  const out: Record<string, unknown> = { ...source };
  for (const f of set.fields) {
    if (f.key in source) out[f.label] = source[f.key];
  }
  for (const loop of set.loops) {
    const rows = source[loop.key];
    if (!Array.isArray(rows)) continue;
    const labeled = rows.map((row: Record<string, unknown>) => {
      const next: Record<string, unknown> = { ...row };
      for (const f of loop.fields) if (f.key in row) next[f.label] = row[f.key];
      return next;
    });
    out[loop.key] = labeled;
    out[loop.label] = labeled;
  }
  return out;
}
