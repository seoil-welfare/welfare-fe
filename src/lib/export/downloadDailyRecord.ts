import templateUrl from "@/assets/forms/daily-record.template.docx?url";
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
export async function downloadDailyRecord(diary: Diary, client: ServiceUser, staff: readonly Staff[] = []): Promise<void> {
  const [template, { renderDailyRecordDocx }] = await loadTemplate();
  const blob = renderDailyRecordDocx(template, dailyRecordData(diary, client, staff));
  saveBlob(blob, dailyRecordFileName(diary, client));
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
): Promise<void> {
  const [template, { renderDailyRecordBundleDocx }] = await loadTemplate();
  const sorted = reportDiaries(diaries, client.id, range.from, range.to);
  if (!sorted.length) throw new Error("출력할 작성 완료 일지가 없어요.");
  const blob = renderDailyRecordBundleDocx(template, sorted.map((diary) => dailyRecordData(diary, client, staff)));
  saveBlob(blob, diaryBundleFileName(client, range.from, range.to));
}

/** 양식 파일과 docx 라이브러리를 함께 불러온다 */
async function loadTemplate() {
  // docx 라이브러리는 출력할 때만 필요해서 이때 불러온다. 처음 화면을 여는 데 드는 용량이 늘지 않는다
  const [response, docx] = await Promise.all([fetch(templateUrl), import("@/lib/export/dailyRecordDocx")]);
  if (!response.ok) throw new Error("일별활동일지 양식을 불러오지 못했어요.");
  return [await response.arrayBuffer(), docx] as const;
}

/** Blob을 파일로 내려받게 한다. 보이지 않는 링크를 만들어 누른 뒤 바로 치운다 (월간 기록 출력도 쓴다) */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // 바로 지우면 일부 브라우저에서 다운로드가 취소된다. 넉넉히 기다린 뒤 메모리를 돌려준다
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
