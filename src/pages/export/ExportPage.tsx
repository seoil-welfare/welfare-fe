import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, useServiceUsers, useStaffList } from "@/api/queries";
import { activeServiceUsers } from "@/services/diaryService";
import { DiaryBundleForm } from "@/pages/export/DiaryBundleForm";
import { MonthlyRecordForm } from "@/pages/export/MonthlyRecordForm";
import { NotFoundPage } from "@/pages/NotFoundPage";
import type { ExportMeta } from "@/pages/export/shared";

/**
 * 파일 출력 설정 (2.1.13/FR-77 ~ FR-79).
 * 일지 모아 출력은 일일 기록지 docx를, 월간 기록 출력은 월별활동일지 docx를 브라우저에서 만든다 (DiaryBundleForm, MonthlyRecordForm).
 * 화면별 폼은 같은 폴더의 파일에 있다. 이 파일은 주소(:kind)를 보고 어떤 폼을 띄울지만 정한다.
 * 엑셀 내보내기는 뺐다. 없는 출력 종류(:kind)는 찾을 수 없는 화면으로 보낸다.
 * 출력 형식과 다운로드 흐름은 U5 미확정 사항이다 (지시서 4.5).
 */

const KIND_META: Record<string, ExportMeta> = {
  diaries: {
    title: "일별활동일지 출력",
    description: "선택한 기간의 일지를 모아 출력해요.",
  },
  monthly: {
    title: "월별활동일지 출력",
    description: "복지관 양식에 맞춘 월간 기록을 출력해요.",
  },
};

export function ExportPage() {
  const { kind } = useParams();
  const meta = Object.hasOwn(KIND_META, kind ?? "") ? KIND_META[kind ?? ""] : undefined;
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();

  if (!meta) return <NotFoundPage />;
  if (usersQuery.data && staffQuery.data) {
    // 불러온 이용자 전원을 기본 선택하려고 목록을 받은 뒤 마운트한다
    const users = activeServiceUsers(usersQuery.data);
    if (kind === "diaries") return <DiaryBundleForm meta={meta} users={users} staff={staffQuery.data} />;
    return <MonthlyRecordForm meta={meta} users={users} staff={staffQuery.data} />;
  }
  return (
    <AppShell header={<AppHeader title={meta.title} backTo="/mypage" />} width="form">
      <QueryGate state={combineQueries([usersQuery, staffQuery])}>{() => null}</QueryGate>
    </AppShell>
  );
}
