import templateUrl from "@/assets/forms/daily-record.template.docx?url";
import { dailyRecordData, dailyRecordFileName } from "@/services/dailyRecordService";
import type { Diary, ServiceUser } from "@/types";

/**
 * 일지 1건을 일일 기록지 docx로 만들어 바로 내려받게 한다 (JD-09, 협의 사항 B-12: docx · 동기 다운로드).
 * 서버를 거치지 않고 브라우저에서 만든다 — 화면에 이미 불러온 일지 데이터만 쓰므로 새 API가 필요 없다.
 *
 * 순서: 템플릿 파일 받기 → 값 만들기(dailyRecordData) → 채우기(renderDailyRecordDocx) → 파일 저장
 * 실패하면 예외를 그대로 던진다. 안내 문구는 부르는 화면이 정한다.
 */
export async function downloadDailyRecord(diary: Diary, client: ServiceUser): Promise<void> {
  // docx 라이브러리는 출력할 때만 필요해서 이때 불러온다. 처음 화면을 여는 데 드는 용량이 늘지 않는다
  const [response, { renderDailyRecordDocx }] = await Promise.all([
    fetch(templateUrl),
    import("@/lib/dailyRecordDocx"),
  ]);
  if (!response.ok) throw new Error("일일 기록지 양식을 불러오지 못했어요.");

  const blob = renderDailyRecordDocx(await response.arrayBuffer(), dailyRecordData(diary, client));
  saveBlob(blob, dailyRecordFileName(diary, client));
}


/** Blob을 파일로 내려받게 한다. 보이지 않는 링크를 만들어 누른 뒤 바로 치운다 */
function saveBlob(blob: Blob, fileName: string) {
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
