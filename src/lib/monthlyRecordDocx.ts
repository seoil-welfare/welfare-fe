import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { DOCX_MIME } from "@/lib/dailyRecordDocx";
import type { MonthlyRecordData } from "@/services/monthlyRecordService";

/**
 * 월간 기록 템플릿에 값을 채워 docx 파일(Blob)을 만든다.
 * 양식 안의 그림 2개(월간 발생 행동 및 총횟수, 행동 항목별 막대그래프)는 넘겨받은 PNG로 바꿔 끼운다.
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
  images: MonthlyRecordImages,
): Blob {
  const zip = new PizZip(template);
  zip.file(MONTHLY_IMAGE_PATHS.totals, images.totals);
  zip.file(MONTHLY_IMAGE_PATHS.chart, images.chart);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true, // {#firstHalf}…{/firstHalf}가 표 한 줄에 걸쳐 있으면 그 줄을 날짜 수만큼 복사한다
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(data);
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
}
