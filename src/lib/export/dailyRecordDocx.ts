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
  return render(new PizZip(template), data);
}

/**
 * 일지 여러 건을 일일 기록지 한 파일로 만든다. 하루가 한 페이지에서 시작한다 (일지 모아 출력).
 * 양식 파일을 따로 두지 않고 단건 양식을 반복형으로 바꿔 쓴다. 양식을 고치면 두 출력에 함께 반영된다.
 */
export function renderDailyRecordBundleDocx(template: ArrayBuffer, records: DailyRecordData[]): Blob {
  return render(toBundleTemplate(new PizZip(template)), {
    records: records.map((record, index) => ({ ...record, pageBreak: index > 0 })),
  });
}

function render(zip: PizZip, data: object): Blob {
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(data);
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
}

const DOCUMENT_XML = "word/document.xml";

/**
 * 본문 전체를 {#records}…{/records}로 감싸 일지 수만큼 반복하게 한다.
 * 두 번째 일지부터는 첫 문단 맨 앞에 페이지 나누기를 넣는다 (빈 줄 없이 새 페이지에서 시작)
 */
function toBundleTemplate(zip: PizZip): PizZip {
  const xml = zip.file(DOCUMENT_XML)?.asText() ?? "";
  const tagParagraph = (tag: string) => "<w:p><w:r><w:t>" + tag + "</w:t></w:r></w:p>";
  const pageBreakRuns =
    "<w:r><w:t>{#pageBreak}</w:t></w:r>" + '<w:r><w:br w:type="page"/></w:r>' + "<w:r><w:t>{/pageBreak}</w:t></w:r>";

  const bodyStart = xml.indexOf("<w:body>") + "<w:body>".length;
  const firstPPrEnd = xml.indexOf("</w:pPr>", bodyStart) + "</w:pPr>".length; // 첫 문단의 서식 바로 뒤
  const sectionStart = xml.lastIndexOf("<w:sectPr");
  if (bodyStart < "<w:body>".length || firstPPrEnd < bodyStart || sectionStart < firstPPrEnd) {
    throw new Error("일일 기록지 양식의 구조가 예상과 달라요.");
  }

  zip.file(
    DOCUMENT_XML,
    xml.slice(0, bodyStart) +
      tagParagraph("{#records}") +
      xml.slice(bodyStart, firstPPrEnd) +
      pageBreakRuns +
      xml.slice(firstPPrEnd, sectionStart) +
      tagParagraph("{/records}") +
      xml.slice(sectionStart),
  );
  return zip;
}
