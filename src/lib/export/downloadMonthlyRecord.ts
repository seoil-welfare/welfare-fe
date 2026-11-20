import { DEFAULT_FORM, loadReportTemplate, type ReportFormChoice } from "@/lib/export/reportTemplate";
import { saveBlob } from "@/lib/export/downloadDailyRecord";
import { behaviorTotals, monthlyRecordData, monthlyRecordFileName, monthRange } from "@/services/monthlyRecordService";
import { reportDiaries } from "@/services/exportService";
import type { Diary, ServiceUser, Staff } from "@/types";

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
  staff: readonly Staff[] = [],
  form: ReportFormChoice = DEFAULT_FORM,
): Promise<void> {
  const { from, to } = monthRange(year, month);
  diaries = reportDiaries(diaries, client.id, from, to);
  if (!diaries.length) throw new Error("출력할 작성 완료 일지가 없어요.");
  // docx 라이브러리는 출력할 때만 필요해서 이때 불러온다
  const [template, { renderMonthlyRecordDocx }, charts] = await Promise.all([
    loadReportTemplate("monthly", form),
    import("@/lib/export/monthlyRecordDocx"),
    import("@/lib/export/monthlyRecordCharts"),
  ]);

  const totals = behaviorTotals(diaries);
  const [totalsImage, chartImage] = await Promise.all([
    charts.drawBehaviorTotals(totals),
    charts.drawBehaviorChart(totals),
  ]);
  // 기본 양식은 정해진 그림 자리에, 기관 양식은 대체 텍스트로 표시한 그래프 자리에만 넣는다 (로고 등은 그대로)
  const images = { totals: totalsImage, chart: chartImage };
  const placement = form.type === "default" ? "fixed" : "slots";
  const blob = renderMonthlyRecordDocx(template, monthlyRecordData(diaries, client, year, month, staff), images, placement);
  saveBlob(blob, monthlyRecordFileName(client, year, month));
}
