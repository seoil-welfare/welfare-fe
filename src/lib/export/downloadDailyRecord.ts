import { DEFAULT_FORM, loadReportTemplate, type ReportFormChoice } from "@/lib/export/reportTemplate";
import { saveBlob } from "@/lib/export/saveBlob";
import { dailyRecordData, dailyRecordFileName, diaryBundleFileName } from "@/services/dailyRecordService";
import { reportDiaries } from "@/services/exportService";
import type { Diary, ServiceUser, Staff } from "@/types";

/**
 * 일지 1건을 일일 기록지 docx로 만들어 바로 내려받게 한다 (JD-09, 협의 사항 B-12: docx · 동기 다운로드).
 * 서버를 거치지 않고 브라우저에서 만든다 — 화면에 이미 불러온 일지 데이터만 쓰므로 새 API가 필요 없다.
 *
 * 순서: 템플릿 파일 받기 → 값 만들기(dailyRecordData) → 채우기(renderDailyRecordDocx) → 파일 저장
 * 실패하면 예외를 그대로 던진다. 안내 문구는 부르는 화면이 정한다.
 */
export async function downloadDailyRecord(
  diary: Diary,
  client: ServiceUser,
  staff: readonly Staff[] = [],
  form: ReportFormChoice = DEFAULT_FORM,
): Promise<void> {
  saveBlob(await buildDailyRecordDocx(diary, client, staff, form), dailyRecordFileName(diary, client));
}

/** 일지 1건으로 일일 기록지 docx를 만든다. 실제 출력과 양식 샘플 받기가 함께 쓴다 */
export async function buildDailyRecordDocx(
  diary: Diary,
  client: ServiceUser,
  staff: readonly Staff[],
  form: ReportFormChoice,
): Promise<Blob> {
  const [template, { renderDailyRecordDocx }] = await loadTemplate(form);
  return renderDailyRecordDocx(template, dailyRecordData(diary, client, staff));
}

/**
 * 한 이용자의 일지 여러 건을 일일 기록지 한 파일로 내려받게 한다 (일지 모아 출력).
 * 날짜순으로 하루 한 페이지씩 담는다. 어떤 일지를 넣을지는 부르는 화면이 정한다.
 */
export async function downloadDiaryBundle(
  diaries: Diary[],
  client: ServiceUser,
  range: { from: string; to: string },
  staff: readonly Staff[] = [],
  form: ReportFormChoice = DEFAULT_FORM,
): Promise<void> {
  const [template, { renderDailyRecordBundleDocx }] = await loadTemplate(form);
  const sorted = reportDiaries(diaries, client.id, range.from, range.to);
  if (!sorted.length) throw new Error("출력할 작성 완료 일지가 없어요.");
  const blob = renderDailyRecordBundleDocx(template, sorted.map((diary) => dailyRecordData(diary, client, staff)));
  saveBlob(blob, diaryBundleFileName(client, range.from, range.to));
}

/** 고른 양식 파일과 docx 라이브러리를 함께 불러온다 */
async function loadTemplate(form: ReportFormChoice) {
  // docx 라이브러리는 출력할 때만 필요해서 이때 불러온다. 처음 화면을 여는 데 드는 용량이 늘지 않는다
  return Promise.all([loadReportTemplate("daily", form), import("@/lib/export/dailyRecordDocx")]);
}
