import type { Activity, Diary, ServiceUser, Staff } from "@/types";

/**
 * 양식 샘플 받기에 쓰는 가상 데이터. 실제 이용자·직원 정보가 아니다.
 * 칸이 빠짐없이 채워지는지 보이도록 활동·지원·반응·도전적 행동·특이사항을 모두 넣는다.
 */

export const SAMPLE_CLIENT: ServiceUser = {
  id: "sample-client",
  name: "가상 이용자",
  birthDate: "2000-01-01",
  assignedStaffId: "sample-staff",
  status: "active",
};

export const SAMPLE_STAFF: Staff[] = [
  { id: "sample-staff", name: "가상 담당자", department: "주간활동지원팀", position: "사회복지사", role: "staff", loginId: "sample", active: true },
];

/** 일별 샘플 날짜 */
export const SAMPLE_DATE = "2026-10-14";
/** 월별 샘플 달 */
export const SAMPLE_MONTH = { year: 2026, month: 10 } as const;

function activity(id: string, start: string, end: string, values: Partial<Activity>): Activity {
  return {
    id,
    startTime: start,
    endTime: end,
    participation: [],
    detail: "",
    preSupport: [],
    reaction: [],
    positiveSupport: [],
    hasBehavior: false,
    behaviors: [],
    ...values,
  };
}

function diary(date: string, index: number): Diary {
  const withBehavior = index % 3 === 0;
  return {
    id: "sample-" + date,
    userId: SAMPLE_CLIENT.id,
    date,
    authorId: "sample-staff",
    status: "completed",
    weather: ["맑음", "구름조금", "흐림"][index % 3] as Diary["weather"],
    temperature: (["WARM", "COOL", "WARM"] as const)[index % 3],
    condition: ["양호", "보통", "양호"][index % 3] as Diary["condition"],
    notes: index % 4 === 0 ? "오후에 피곤해 보여 휴식 시간을 한 번 더 가졌습니다." : "",
    activities: [
      activity("a1", "10:00", "11:00", {
        participation: [["요리활동", "예술활동", "체육활동"][index % 3]],
        detail: "샌드위치 만들기. 재료를 순서대로 올리는 과정을 끝까지 수행함.",
        preSupport: ["활동안내", "모델링"],
        reaction: ["적극적 참여"],
        positiveSupport: ["언어 촉진 및 격려"],
      }),
      activity("a2", "12:00", "12:40", {
        participation: ["기타"],
        participationOther: "점심식사",
        detail: "숟가락을 스스로 들고 끝까지 먹음.",
        preSupport: ["활동준비"],
        reaction: ["안정적 참여"],
      }),
      activity("a3", "14:00", "15:00", {
        participation: ["체육활동"],
        detail: "트램펄린 뛰기. 차례를 기다리지 못하고 손을 물었으나 휴식 안내 후 다시 참여함.",
        preSupport: ["선택지 제공"],
        reaction: ["부분적 참여"],
        positiveSupport: ["휴식", "대체행동 지원"],
        hasBehavior: withBehavior,
        behaviors: withBehavior ? [{ type: "selfHarm", detailIds: ["sh-3"] }] : [],
      }),
    ],
  } as Diary;
}

/** 일별 샘플: 일지 1건 (도전적 행동 포함) */
export function sampleDailyDiary(): Diary {
  return diary(SAMPLE_DATE, 0);
}

/** 월별 샘플: 그 달 평일마다 일지 1건 */
export function sampleMonthlyDiaries(): Diary[] {
  const { year, month } = SAMPLE_MONTH;
  const last = new Date(year, month, 0).getDate();
  const out: Diary[] = [];
  for (let day = 1; day <= last; day++) {
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday === 0 || weekday === 6) continue;
    out.push(diary(year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"), out.length));
  }
  return out;
}
