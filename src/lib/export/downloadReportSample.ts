import { loadReportTemplate, type ReportFormChoice } from "@/lib/export/reportTemplate";
import { saveBlob } from "@/lib/export/saveBlob";
import { dailyRecordData } from "@/services/dailyRecordService";
import { behaviorTotals, monthlyRecordData } from "@/services/monthlyRecordService";
import type { ReportFormKind } from "@/services/reportFormFields";
import { SAMPLE_CLIENT, SAMPLE_MONTH, SAMPLE_STAFF, sampleDailyDiary, sampleMonthlyDiaries } from "@/services/reportSample";

/**
 * 양식 샘플 받기: 가상 일지로 양식을 채워 '샘플_양식이름.docx'로 내려받는다.
 * 실제 출력과 같은 함수로 만들어서, Word로 열면 실제 출력 모양 그대로 확인할 수 있다.
 */
export async function downloadReportSample(kind: ReportFormKind, form: ReportFormChoice, formName: string): Promise<void> {
  const fileName = "샘플_" + formName.replace(/[\\/:*?"<>|]/g, "_") + ".docx";

  if (kind === "daily") {
    const [template, { renderDailyRecordDocx }] = await Promise.all([
      loadReportTemplate("daily", form),
      import("@/lib/export/dailyRecordDocx"),
    ]);
    saveBlob(renderDailyRecordDocx(template, dailyRecordData(sampleDailyDiary(), SAMPLE_CLIENT, SAMPLE_STAFF)), fileName);
    return;
  }

  const diaries = sampleMonthlyDiaries();
  const [template, { renderMonthlyRecordDocx }, charts] = await Promise.all([
    loadReportTemplate("monthly", form),
    import("@/lib/export/monthlyRecordDocx"),
    import("@/lib/export/monthlyRecordCharts"),
  ]);
  const data = monthlyRecordData(diaries, SAMPLE_CLIENT, SAMPLE_MONTH.year, SAMPLE_MONTH.month, SAMPLE_STAFF);
  // 그래프는 실제 출력과 같은 규칙으로 넣는다 (기관 양식은 그래프 자리에만)
  const totals = behaviorTotals(diaries);
  const [totalsImage, chartImage] = await Promise.all([charts.drawBehaviorTotals(totals), charts.drawBehaviorChart(totals)]);
  const images = { totals: totalsImage, chart: chartImage };
  saveBlob(renderMonthlyRecordDocx(template, data, images, form.type === "default" ? "fixed" : "slots"), fileName);
}
