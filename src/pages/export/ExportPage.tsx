import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, useServiceUsers } from "@/api/queries";
import { activeServiceUsers } from "@/services/diaryService";
import { DiaryBundleForm } from "@/pages/export/DiaryBundleForm";
import { ExcelExportForm } from "@/pages/export/ExcelExportForm";
import { MonthlyRecordForm } from "@/pages/export/MonthlyRecordForm";
import type { ExportMeta } from "@/pages/export/shared";

/**
 * 파일 출력 설정 (2.1.13/FR-77 ~ FR-79).
 * 일지 모아 출력은 일일 기록지 docx를, 월간 기록 출력은 월별활동일지 docx를 브라우저에서 만든다 (DiaryBundleForm, MonthlyRecordForm).
 * 화면별 폼은 같은 폴더의 파일에 있다. 이 파일은 주소(:kind)를 보고 어떤 폼을 띄울지만 정한다.
 * 엑셀은 대상·기간 선택과 진행 피드백만 보여 주고, 문서가 생성됐다는 성공 메시지는 표시하지 않는다.
 * 출력 형식과 다운로드 흐름은 U5 미확정 사항이다 (지시서 4.5).
 */

const KIND_META: Record<string, ExportMeta> = {
  diaries: {
    title: "일지 모아 출력",
    description: "선택한 기간의 일지를 모아 출력해요.",
  },
  monthly: {
    title: "월간 기록 출력",
    description: "복지관 양식에 맞춘 월간 기록을 출력해요.",
  },
  excel: {
    title: "엑셀 내보내기",
    description: "일지 관련 데이터를 표 형태로 내보내요.",
  },
};

export function ExportPage() {
  const { kind } = useParams();
  const meta = KIND_META[kind ?? ""] ?? KIND_META.diaries;
  const usersQuery = useServiceUsers();

  if (usersQuery.data) {
    // 불러온 이용자 전원을 기본 선택하려고 목록을 받은 뒤 마운트한다
    const users = activeServiceUsers(usersQuery.data);
    if (kind === "diaries") return <DiaryBundleForm meta={meta} users={users} />;
    if (kind === "monthly") return <MonthlyRecordForm meta={meta} users={users} />;
    return <ExcelExportForm meta={meta} users={users} />;
  }
  return (
    <AppShell header={<AppHeader title={meta.title} backTo="/mypage" />} width="form">
      <QueryGate state={combineQueries([usersQuery])}>{() => null}</QueryGate>
    </AppShell>
  );
}
