/** 오늘 날짜의 시연 상태 검증 (개발 검증용) */
import { DEMO_TODAY, generateFixtures, SERVICE_USERS, STAFF } from "@/data/fixtures";
import { toNewsEntries } from "@/api/mock/mockApi";
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

expect("오늘 일지 3건", todayDiaries.length === 3, todayDiaries.length + "건");
expect(
  "완료 2건 / 작성 중 1건",
  todayDiaries.filter((d) => d.status === "completed").length === 2 &&
    todayDiaries.filter((d) => d.status === "draft").length === 1,
  "완료 " + todayDiaries.filter((d) => d.status === "completed").length + "건",
);
expect(
  "타인(stf-03) 작성 중 일지",
  todayDiaries.some((d) => d.status === "draft" && d.authorId === "stf-03"),
  "FR-71 상태 재현",
);

const todayNews = newsItems(toNewsEntries(events, diaries, DEMO_TODAY), directory, {
  filter: "all",
  sinceDate: DEMO_TODAY,
});
expect("오늘 소식 3건 이상 ('더 보기' 조건)", todayNews.length >= 3, todayNews.length + "건");
expect(
  "등록·수정 소식 모두 존재",
  todayNews.some((n) => n.event.kind === "created") &&
    todayNews.some((n) => n.event.kind === "updated"),
  todayNews.map((n) => n.event.kind).join(","),
);
expect(
  "작성 중 일지는 소식에 없음",
  !todayNews.some((n) => diaries.find((d) => d.id === n.diary.id)?.status === "draft"),
  "작성 중 제외 확인",
);

const completion = dayCompletion(diaries, SERVICE_USERS, DEMO_TODAY);
expect(
  "달력 오늘 지표 2/3",
  completion?.completed === 2 && completion?.total === 3,
  completion ? completion.completed + "/" + completion.total : "없음",
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
