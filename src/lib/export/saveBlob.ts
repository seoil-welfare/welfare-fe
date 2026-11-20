/**
 * Blob을 파일로 내려받게 한다. 보이지 않는 링크를 만들어 누른 뒤 바로 치운다.
 * 일별·월별 출력, 양식 샘플 받기, 양식 파일 받기가 함께 쓴다.
 */
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
