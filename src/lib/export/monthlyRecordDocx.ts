import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { fillChartSlots } from "@/lib/export/chartSlots";
import { DOCX_MIME } from "@/lib/export/dailyRecordDocx";
import type { MonthlyRecordData } from "@/services/monthlyRecordService";
import { withKoreanLabels } from "@/services/reportFormFields";

/**
 * 월간 기록 템플릿에 값을 채워 docx 파일(Blob)을 만든다.
 * 그래프 2개(월간 발생 행동 및 총횟수, 행동 항목별 막대그래프)는 넘겨받은 PNG로 바꿔 끼운다.
 * 기본 양식은 정해진 그림 파일을, 기관 양식은 대체 텍스트로 표시한 그래프 자리를 바꾼다 (chartSlots.ts).
 * 그림을 그리는 일은 monthlyRecordCharts.ts가 맡는다 (브라우저 캔버스가 필요해서 나눴다).
 */

/** 템플릿 안 그림 파일 경로. 원본 양식(monthly-record.docx)과 같다 */
export const MONTHLY_IMAGE_PATHS = {
  totals: "word/media/image1.png", // 월간 발생 행동 및 총횟수 (1800×250)
  chart: "word/media/image2.png", // 행동 항목별 월간 누적 횟수 막대그래프 (2045×813)
} as const;

export interface MonthlyRecordImages {
  totals: Uint8Array;
  chart: Uint8Array;
}

export function renderMonthlyRecordDocx(
  template: ArrayBuffer,
  data: MonthlyRecordData,
  images?: MonthlyRecordImages,
  /**
   * 그래프를 어디에 넣을지.
   * fixed: 기본 양식의 정해진 그림 파일을 바꾼다.
   * slots: 기관 양식에서 대체 텍스트가 '그래프:요약'·'그래프:항목별'인 그림만 바꾼다 (로고 등 다른 그림은 그대로).
   */
  placement: "fixed" | "slots" = "fixed",
): Blob {
  const zip = new PizZip(template);
  if (images && placement === "fixed") {
    zip.file(MONTHLY_IMAGE_PATHS.totals, images.totals);
    zip.file(MONTHLY_IMAGE_PATHS.chart, images.chart);
  }
  if (images && placement === "slots") fillChartSlots(zip, images);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true, // {#firstHalf}…{/firstHalf}가 표 한 줄에 걸쳐 있으면 그 줄을 날짜 수만큼 복사한다
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(withKoreanLabels("monthly", data)); // 기관 양식의 한글 표시({이용자이름} 등)도 채운다
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
}
