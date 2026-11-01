/** 일일 기록지 출력 값 검증 (개발 검증용). 모든 이름·생년월일은 가상 데이터다 */
import { generateFixtures, SERVICE_USERS } from "@/data/fixtures";
import { dailyRecordData, dailyRecordFileName } from "@/services/dailyRecordService";
import type { Diary, ServiceUser } from "@/types";

const problems: string[] = [];

function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

const client: ServiceUser = {
  id: "u-check",
  name: "가상이용자 A",
  birthDate: "2001-03-05",
  assignedStaffId: "s-check",
  status: "active",
};

const base = {
  participation: [],
  detail: "",
  preSupport: [],
  reaction: [],
  positiveSupport: [],
  hasBehavior: false,
  behaviors: [],
};

const diary: Diary = {
  id: "d-check",
  userId: client.id,
  date: "2026-09-21",
  authorId: "s-check",
  status: "completed",
  weather: "맑음",
  condition: "기타",
  conditionOther: "졸려 함",
  notes: "가상 특이사항",
  createdAt: "2026-09-21T17:00:00+09:00",
  updatedAt: "2026-09-21T17:00:00+09:00",
  // 일부러 시간 역순으로 넣어 정렬을 확인한다
  activities: [
    {
      ...base,
      id: "a2",
      startTime: "11:30",
      endTime: "12:00",
      participation: ["체육활동"],
      reaction: ["부분적 참여"],
      hasBehavior: true,
      behaviors: [
        { type: "destruction", detailIds: ["ds-1", "ds-other"], otherText: "책상 밀기" },
        { type: "other", detailIds: [], otherText: "소리 지르기" },
      ],
    },
    {
      ...base,
      id: "a1",
      startTime: "10:00",
      endTime: "10:30",
      participation: ["예술활동", "기타"],
      participationOther: "산책",
      preSupport: ["활동안내", "모델링"],
      detail: "색종이 꾸미기",
    },
  ],
};

console.log("[머리말]");
const data = dailyRecordData(diary, client);
expect("이용자 이름", data.clientName === "가상이용자 A", data.clientName);
expect("생년월일 6자리", data.birth6 === "010305", data.birth6);
expect(
  "작성일·요일",
  data.year === 2026 && data.month === 9 && data.day === 21 && data.weekday === "월",
  `${data.year}-${data.month}-${data.day} ${data.weekday}`,
);
expect("컨디션 기타(입력값)", data.condition === "기타(졸려 함)", data.condition);
expect("특이사항", data.notes === "가상 특이사항", data.notes);

console.log("[파일 이름]");
const fileName = dailyRecordFileName(diary, client);
expect("이용자이름_날짜_일일기록지.docx", fileName === "가상이용자 A_2026-09-21_일일기록지.docx", fileName);
const oddName = dailyRecordFileName(diary, { ...client, name: "가상/이용자:B" });
expect("파일 이름에 못 쓰는 글자는 _로", oddName === "가상_이용자_B_2026-09-21_일일기록지.docx", oddName);

console.log("[활동 표]");
const [first, second] = data.activities;
expect("활동 수만큼 줄", data.activities.length === 2, data.activities.length + "줄");
expect("시작 시간순 정렬", first.time === "10:00\n~\n10:30", JSON.stringify(first.time));
expect("여러 값은 줄바꿈, 기타(입력값)", first.participation === "예술활동\n기타(산책)", JSON.stringify(first.participation));
expect("사전지원 여러 값", first.preSupport === "활동안내\n모델링", JSON.stringify(first.preSupport));
expect("도전적 행동 없음 체크", first.noneMark === "■" && first.someMark === "□" && first.behaviors === "", first.noneMark + first.someMark);
expect("도전적 행동 있음 체크", second.noneMark === "□" && second.someMark === "■", second.noneMark + second.someMark);
expect(
  "도전적 행동 '영역 - 항목'",
  second.behaviors === "파괴행동 - 물건 던지기\n파괴행동 - 기타(책상 밀기)\n기타(소리 지르기)",
  JSON.stringify(second.behaviors),
);

console.log("[가상 데이터 전체]");
// 시연용 일지 전부를 바꿔 봐도 예외 없이 활동 수만큼 줄이 나오는지
const { diaries } = generateFixtures();
const completed = diaries.filter((d) => d.status === "completed");
const mismatched = completed.filter((d) => {
  const user = SERVICE_USERS.find((u) => u.id === d.userId);
  return !user || dailyRecordData(d, user).activities.length !== d.activities.length;
});
expect("작성 완료 일지 전부 변환", completed.length > 0 && mismatched.length === 0, completed.length + "건 중 불일치 " + mismatched.length + "건");

console.log("");
console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
process.exit(problems.length === 0 ? 0 : 1);
