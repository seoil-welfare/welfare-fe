import templateUrl from "@/assets/forms/monthly-record.template.docx?url";
import { saveBlob } from "@/lib/export/downloadDailyRecord";
import { behaviorTotals, monthlyRecordData, monthlyRecordFileName } from "@/services/monthlyRecordService";
import type { Diary, ServiceUser } from "@/types";

/**
 * 한 이용자의 한 달치 일지를 월간 기록(월별활동일지) docx로 만들어 내려받게 한다.
 * 서버 출력 API 없이 브라우저에서 만든다. 어떤 일지를 넣을지는 부르는 화면이 정한다 (그 달 작성 완료 일지).
 *
 * 순서: 양식·라이브러리 불러오기 → 값 만들기(monthlyRecordData) → 그림 2개 그리기 → 채우기 → 파일 저장
 * 실패하면 예외를 그대로 던진다. 안내 문구는 부르는 화면이 정한다.
 */
export async function downloadMonthlyRecord(
  diaries: Diary[],
  client: ServiceUser,
  year: number,
  month: number,
): Promise<void> {
  // docx 라이브러리는 출력할 때만 필요해서 이때 불러온다
  const [response, { renderMonthlyRecordDocx }, charts] = await Promise.all([
    fetch(templateUrl),
    import("@/lib/export/monthlyRecordDocx"),
    import("@/lib/export/monthlyRecordCharts"),
  ]);
  if (!response.ok) throw new Error("월간 기록 양식을 불러오지 못했어요.");

  const totals = behaviorTotals(diaries);
  const [totalsImage, chartImage] = await Promise.all([
    charts.drawBehaviorTotals(totals),
    charts.drawBehaviorChart(totals),
  ]);
  const blob = renderMonthlyRecordDocx(await response.arrayBuffer(), monthlyRecordData(diaries, client, year, month), {
    totals: totalsImage,
    chart: chartImage,
  });
  saveBlob(blob, monthlyRecordFileName(client, year, month));
}
