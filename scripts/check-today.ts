/** 오늘 날짜의 시연 상태 검증 (개발 검증용). 오늘은 일지를 비워 두고 소식만 있다 */
import { DEMO_TODAY, generateFixtures, SERVICE_USERS, STAFF, toNewsEntries } from "./fixtures";
import { dayCompletion, newsItems } from "@/services/diaryService";

const { diaries, events } = generateFixtures(DEMO_TODAY);
const directory = { serviceUsers: SERVICE_USERS, staff: STAFF };
const problems: string[] = [];

function expect(label: string, condition: boolean, detail: string) {
  console.log((condition ? "  OK   " : "  FAIL ") + label + " — " + detail);
  if (!condition) problems.push(label);
}

console.log("[오늘: " + DEMO_TODAY + "]");
const todayDiaries = diaries.filter((d) => d.date === DEMO_TODAY);
console.log(
  "  " +
    todayDiaries
      .map((d) => d.userId + "=" + d.status + "(" + d.authorId + ")")
      .join(", "),
);

expect("오늘 일지 없음 (직접 새로 작성 가능)", todayDiaries.length === 0, todayDiaries.length + "건");

const todayNews = newsItems(toNewsEntries(events, diaries, DEMO_TODAY), directory, {
  filter: "all",
  sinceDate: DEMO_TODAY,
});
expect("오늘 소식 5건 이상 (홈 소식 5칸 채우기)", todayNews.length >= 5, todayNews.length + "건");
// 오늘 날짜 일지는 없으므로 오늘 소식은 지난 일지를 오늘 수정한 내역이다
expect(
  "오늘 소식은 지난 일지 수정 내역",
  todayNews.every((n) => n.event.kind === "updated" && n.diary.date < DEMO_TODAY),
  todayNews.map((n) => n.event.kind + "(" + n.diary.date + ")").join(", "),
);
expect(
  "작성 중 일지는 소식에 없음",
  !todayNews.some((n) => diaries.find((d) => d.id === n.diary.id)?.status === "draft"),
  "작성 중 제외 확인",
);

expect(
  "달력 오늘 지표 없음 (일지 0건)",
  dayCompletion(diaries, SERVICE_USERS, DEMO_TODAY) === null,
  "없음",
);

// 일지가 전혀 없는 날짜에는 지표가 없어야 한다
const noDiaryDate = (() => {
  for (let back = 1; back < 90; back += 1) {
    const d = new Date(DEMO_TODAY);
    d.setDate(d.getDate() - back);
    const iso =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    if (!diaries.some((x) => x.date === iso)) return iso;
  }
  return null;
})();
expect(
  "일지 없는 날짜는 지표 없음",
  noDiaryDate !== null && dayCompletion(diaries, SERVICE_USERS, noDiaryDate) === null,
  noDiaryDate ?? "해당 날짜 없음",
);

console.log("");
console.log(problems.length === 0 ? "모든 검증 통과" : problems.length + "개 실패");
process.exit(problems.length === 0 ? 0 : 1);
