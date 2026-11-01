import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { DailyRecordData } from "@/services/dailyRecordService";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * 일일 기록지 템플릿에 값을 채워 docx 파일(Blob)을 만든다.
 * 템플릿 파일을 불러오는 일과 내려받게 하는 일은 하지 않는다 (downloadDailyRecord.ts가 맡는다).
 * 브라우저 전용 기능을 쓰지 않아서 Node 검증 스크립트에서도 그대로 부를 수 있다.
 *
 * - paragraphLoop: {#activities}…{/activities}가 표 한 줄 안에 있으면 그 줄을 활동 수만큼 복사한다
 * - linebreaks: 값 안의 \n을 Word 줄바꿈으로 바꾼다 (한 칸에 값이 여러 개일 때)
 * - nullGetter: 값이 없는 자리표시자는 'undefined' 대신 빈칸으로 둔다
 */
export function renderDailyRecordDocx(template: ArrayBuffer, data: DailyRecordData): Blob {
  const doc = new Docxtemplater(new PizZip(template), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(data);
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
}
