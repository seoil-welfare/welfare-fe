/**
 * 달력의 '이 날짜에 일지 작성' 노출 조건 검증 (개발 검증용).
 * 일지는 이용자 1명당 하루 1건이므로, 대상 이용자 전원이 일지를 가진 날짜에는
 * 작성 CTA가 없어야 하고, 남은 이용자가 있으면 그 이용자를 대상으로 열려야 한다.
 */
import { DEMO_TODAY, SERVICE_USERS, generateFixtures } from "@/data/fixtures";
import { activeServiceUsers, dayCompletion, diariesOnDate } from "@/services/diaryService";
import { addDays, parseISODate } from "@/lib/utils";

const { diaries } = generateFixtures(DEMO_TODAY);
const problems: string[] = [];

function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

/** CalendarPage와 같은 계산 */
function usersWithoutDiary(date: string) {
  const users = activeServiceUsers(SERVICE_USERS);
  const dayDiaries = diariesOnDate(diaries, date);
  return users.filter((user) => !dayDiaries.some((d) => d.userId === user.id));
}

const activeCount = activeServiceUsers(SERVICE_USERS).length;
console.log("활성 이용자 " + activeCount + "명");
console.log("");

// 1) 전원이 일지를 가진 날짜 → CTA 없음
console.log("[전원 일지 있는 날짜]");
const fullDays: string[] = [];
for (let back = 0; back < 70; back += 1) {
  const date = addDays(DEMO_TODAY, -back);
  if (usersWithoutDiary(date).length === 0 && diariesOnDate(diaries, date).length > 0) {
    fullDays.push(date);
  }
}
expect("전원 일지 있는 날짜가 존재 (시연 가능)", fullDays.length > 0, fullDays.length + "일");
for (const date of fullDays.slice(0, 3)) {
  const day = diariesOnDate(diaries, date);
  const completed = day.filter((d) => d.status === "completed").length;
  const drafts = day.filter((d) => d.status === "draft").length;
  expect(
    date + " CTA 숨김",
    usersWithoutDiary(date).length === 0,
    "완료 " + completed + "건 + 작성 중 " + drafts + "건 = " + day.length + "건",
  );
}

// 2) 오늘은 일지가 없다 → 전원 작성 가능, 지표 없음
console.log("");
console.log("[오늘: " + DEMO_TODAY + "]");
expect(
  "오늘은 대상 이용자 전원이 새로 작성 가능",
  usersWithoutDiary(DEMO_TODAY).length === activeCount,
  "남은 " + usersWithoutDiary(DEMO_TODAY).length + "명 / 대상 " + activeCount + "명",
);
expect("오늘 달력 지표 없음", dayCompletion(diaries, SERVICE_USERS, DEMO_TODAY) === null, "일지 0건");

// 3) 바로 전 평일은 완료 1 + 작성 중 2 = 전원 → CTA 없어야 한다 (작성 중도 '있음'으로 센다)
let lastWeekday = addDays(DEMO_TODAY, -1);
while ([0, 6].includes(parseISODate(lastWeekday).getDay())) lastWeekday = addDays(lastWeekday, -1);
console.log("");
console.log("[바로 전 평일: " + lastWeekday + "]");
const lastDay = diariesOnDate(diaries, lastWeekday);
const lastCompletion = dayCompletion(diaries, SERVICE_USERS, lastWeekday);
expect(
  "전 평일 CTA 숨김 (작성 중도 포함해 전원)",
  usersWithoutDiary(lastWeekday).length === 0,
  "완료 " +
    lastDay.filter((d) => d.status === "completed").length +
    "건 + 작성 중 " +
    lastDay.filter((d) => d.status === "draft").length +
    "건, 달력 지표 " +
    lastCompletion?.completed +
    "/" +
    lastCompletion?.total,
);
expect(
  "완료가 전원이 아니어도 CTA는 숨김",
  lastCompletion?.completed !== activeCount && usersWithoutDiary(lastWeekday).length === 0,
  "완료 " + lastCompletion?.completed + " != 대상 " + activeCount + " 인데도 숨김",
);

// 4) 일부만 일지가 있는 날짜 → CTA 있고, 대상은 일지 없는 이용자
console.log("");
console.log("[일부만 일지 있는 날짜]");
let partialChecked = 0;
for (let back = 1; back < 70 && partialChecked < 3; back += 1) {
  const date = addDays(DEMO_TODAY, -back);
  const remaining = usersWithoutDiary(date);
  const day = diariesOnDate(diaries, date);
  if (remaining.length === 0 || day.length === 0) continue;
  partialChecked += 1;
  expect(
    date + " CTA 노출 · 대상은 일지 없는 이용자",
    remaining.length > 0 && !day.some((d) => d.userId === remaining[0].id),
    "일지 " + day.length + "건 / 남은 " + remaining.length + "명 → " + remaining[0].name,
  );
}
expect("일부만 있는 날짜가 존재", partialChecked > 0, partialChecked + "일 확인");

// 4) 일지가 전혀 없는 날짜 → CTA 있고 전원이 대상
console.log("");
console.log("[일지 없는 날짜]");
for (let back = 1; back < 70; back += 1) {
  const date = addDays(DEMO_TODAY, -back);
  if (diariesOnDate(diaries, date).length === 0) {
    expect(
      date + " CTA 노출 · 전원 대상",
      usersWithoutDiary(date).length === activeCount,
      "남은 " + usersWithoutDiary(date).length + "명",
    );
    break;
  }
}

console.log("");
console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
process.exit(problems.length === 0 ? 0 : 1);
