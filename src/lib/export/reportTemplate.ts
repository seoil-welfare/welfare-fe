import dailyTemplateUrl from "@/assets/forms/daily-record.template.docx?url";
import monthlyTemplateUrl from "@/assets/forms/monthly-record.template.docx?url";
import { api } from "@/api";
import type { ReportFormKind } from "@/services/reportFormFields";

/**
 * 출력할 때 쓸 양식. 기본 양식은 앱 안에 있고, 기관이 올린 양식은 서버에서 받는다.
 * 출력 화면·일지 상세 인쇄 버튼이 고른 값을 출력 함수에 넘긴다.
 */
export type ReportFormChoice = { type: "default" } | { type: "uploaded"; id: string };

export const DEFAULT_FORM: ReportFormChoice = { type: "default" };

const DEFAULT_URL: Record<ReportFormKind, string> = { daily: dailyTemplateUrl, monthly: monthlyTemplateUrl };

/** 고른 양식 파일 내용 */
export async function loadReportTemplate(kind: ReportFormKind, choice: ReportFormChoice): Promise<ArrayBuffer> {
  if (choice.type === "uploaded") return api.reportForms.file(choice.id);
  const response = await fetch(DEFAULT_URL[kind]);
  if (!response.ok) throw new Error((kind === "daily" ? "일별" : "월별") + "활동일지 양식을 불러오지 못했어요.");
  return response.arrayBuffer();
}
