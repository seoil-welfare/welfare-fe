import { behaviorDetailLabel, behaviorTypeLabel, OTHER_LABEL } from "@/data/catalog";
import { labelsOf, sortActivities } from "@/services/diaryService";
import { parseISODate, weekdayLabel } from "@/lib/utils";
import type { Activity, Diary, ServiceUser } from "@/types";

/**
 * 일일 기록지(docx) 출력용 값 만들기.
 * 일지 1건을 템플릿(src/assets/forms/daily-record.template.docx)의 자리표시자 값으로 바꾸는 순수 함수다.
 * 파일을 만드는 일은 하지 않는다 — 여기서는 '무엇을 적을지'만 정한다.
 *
 * 규칙
 * - 한 칸에 값이 여러 개면 줄바꿈(\n)으로 잇는다. 템플릿을 채울 때 linebreaks 옵션이 Word 줄바꿈으로 바꾼다
 * - '기타'에 직접 입력이 있으면 '기타(입력값)'으로 적는다
 * - 도전적 행동은 '영역 - 항목'으로 적는다 (양식 안내문, 예: 파괴행동 - 물건 던지기)
 * - 결재란(담당/팀장)은 손 서명용이라 값을 만들지 않는다
 */

/** 활동 표 한 줄. 키 이름이 템플릿의 {time}, {participation} … 과 같다 */
export interface DailyRecordRow {
  time: string;
  participation: string;
  detail: string;
  preSupport: string;
  reaction: string;
  positiveSupport: string;
  /** 도전적 행동 여부 체크칸: 선택된 쪽이 ■, 아닌 쪽이 □ */
  noneMark: "■" | "□";
  someMark: "■" | "□";
  behaviors: string;
}

/** 템플릿 전체 값. 키 이름이 템플릿의 자리표시자와 같다 */
export interface DailyRecordData {
  clientName: string;
  /** 생년월일 6자리 (YYMMDD) */
  birth6: string;
  year: number;
  month: number;
  day: number;
  /** 월, 화 … (양식에 '요일'이 이미 적혀 있다) */
  weekday: string;
  weather: string;
  condition: string;
  activities: DailyRecordRow[];
  notes: string;
}

const CHECKED = "■";
const UNCHECKED = "□";

/** 가상이용자 A_2026-09-21_일일기록지.docx — 파일 이름에 못 쓰는 글자는 _로 바꾼다 */
export function dailyRecordFileName(diary: Diary, client: ServiceUser): string {
  const name = client.name.replace(/[\\/:*?"<>|]/g, "_");
  return name + "_" + diary.date + "_일일기록지.docx";
}

/** 2001-03-05 → 010305 */
export function toBirth6(birthDate: string): string {
  return birthDate.replaceAll("-", "").slice(2, 8);
}

/** 도전적 행동을 '영역 - 항목' 줄 목록으로. 상위 '기타'는 세부 항목이 없어 '기타(내용)'만 적는다 */
export function behaviorLines(activity: Activity): string[] {
  if (!activity.hasBehavior) return [];
  return activity.behaviors.flatMap((selection) => {
    const area = behaviorTypeLabel(selection.type);
    if (selection.type === "other") return labelsOf([OTHER_LABEL], selection.otherText);
    return labelsOf(
      selection.detailIds.map((id) => behaviorDetailLabel(selection.type, id)),
      selection.otherText,
    ).map((item) => area + " - " + item);
  });
}

function toRow(activity: Activity): DailyRecordRow {
  const lines = (selected: readonly string[], otherText?: string) => labelsOf(selected, otherText).join("\n");
  return {
    // 양식 예시처럼 시작 / ~ / 종료를 세 줄로 적는다
    time: [activity.startTime, "~", activity.endTime].filter(Boolean).join("\n"),
    participation: lines(activity.participation, activity.participationOther),
    detail: activity.detail,
    preSupport: lines(activity.preSupport, activity.preSupportOther),
    reaction: lines(activity.reaction, activity.reactionOther),
    positiveSupport: lines(activity.positiveSupport, activity.positiveSupportOther),
    noneMark: activity.hasBehavior ? UNCHECKED : CHECKED,
    someMark: activity.hasBehavior ? CHECKED : UNCHECKED,
    behaviors: behaviorLines(activity).join("\n"),
  };
}

export function dailyRecordData(diary: Diary, client: ServiceUser): DailyRecordData {
  const date = parseISODate(diary.date);
  return {
    clientName: client.name,
    birth6: toBirth6(client.birthDate),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: weekdayLabel(diary.date),
    weather: diary.weather,
    condition: labelsOf([diary.condition], diary.conditionOther)[0],
    // 일지 상세 화면과 같은 순서(시작 시간순)로 적는다
    activities: sortActivities(diary.activities).map(toRow),
    notes: diary.notes,
  };
}
