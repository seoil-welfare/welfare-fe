import { buildDailyRecordDocx } from "@/lib/export/downloadDailyRecord";
import { buildMonthlyRecordDocx } from "@/lib/export/downloadMonthlyRecord";
import type { ReportFormChoice } from "@/lib/export/reportTemplate";
import { saveBlob } from "@/lib/export/saveBlob";
import type { ReportFormKind } from "@/services/reportFormFields";
import { SAMPLE_CLIENT, SAMPLE_MONTH, SAMPLE_STAFF, sampleDailyDiary, sampleMonthlyDiaries } from "@/services/reportSample";

/**
 * 양식 샘플 받기: 가상 일지로 양식을 채워 '샘플_양식이름.docx'로 내려받는다.
 * 실제 출력과 같은 함수로 만들어서, Word로 열면 실제 출력 모양 그대로 확인할 수 있다.
 */
export async function downloadReportSample(kind: ReportFormKind, form: ReportFormChoice, formName: string): Promise<void> {
  const fileName = "샘플_" + formName.replace(/[\\/:*?"<>|]/g, "_") + ".docx";
  const blob =
    kind === "daily"
      ? await buildDailyRecordDocx(sampleDailyDiary(), SAMPLE_CLIENT, SAMPLE_STAFF, form)
      : await buildMonthlyRecordDocx(sampleMonthlyDiaries(), SAMPLE_CLIENT, SAMPLE_MONTH.year, SAMPLE_MONTH.month, SAMPLE_STAFF, form);
  saveBlob(blob, fileName);
}
