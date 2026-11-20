import { FormSection } from "@/components/common/FormSection";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReportForms } from "@/api/queries";
import type { ReportForm } from "@/api/types";
import { REPORT_FORMS_ENABLED } from "@/app/features";
import { DEFAULT_FORM, type ReportFormChoice } from "@/lib/export/reportTemplate";
import type { ReportFormKind } from "@/services/reportFormFields";

const DEFAULT_VALUE = "default";

/** 출력할 때 고를 수 있는 기관 양식 (숨긴 양식은 빼고, 최근에 올린 순) */
export function useActiveReportForms(kind: ReportFormKind) {
  const query = useReportForms(REPORT_FORMS_ENABLED);
  const forms: ReportForm[] = (query.data ?? []).filter((form) => form.kind === kind && form.active);
  return { forms, isError: query.isError };
}

/** 선택 칸 값 → 출력 함수에 넘길 양식. 고른 양식이 숨겨져 목록에 없으면 기본 양식으로 */
export function toReportFormChoice(value: string, forms: readonly ReportForm[]): ReportFormChoice {
  return forms.some((form) => form.id === value) ? { type: "uploaded", id: value } : DEFAULT_FORM;
}

/**
 * 출력 화면의 '양식' 칸. 기본 양식과 사용 중인 기관 양식 중에서 고른다.
 * 올린 양식이 없으면 칸을 보이지 않는다 (기본 양식으로 출력). 목록을 못 불러와도 기본 양식으로 출력할 수 있다.
 */
export function ReportFormField({
  kind,
  id,
  value,
  onChange,
  triggerClassName,
}: {
  kind: ReportFormKind;
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** 출력 화면의 다른 선택 칸과 같은 테두리 */
  triggerClassName?: string;
}) {
  const { forms, isError } = useActiveReportForms(kind);
  if (!REPORT_FORMS_ENABLED || (forms.length === 0 && !isError)) return null;
  const current = forms.some((form) => form.id === value) ? value : DEFAULT_VALUE;

  return (
    <FormSection title="양식">
      <Field>
        <FieldLabel htmlFor={id} className="sr-only">
          출력 양식
        </FieldLabel>
        <Select value={current} onValueChange={onChange}>
          <SelectTrigger id={id} aria-label="출력 양식" className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUE}>기본 양식</SelectItem>
            {forms.map((form) => (
              <SelectItem key={form.id} value={form.id}>
                {form.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          {isError
            ? "올린 양식을 불러오지 못해 기본 양식으로 출력해요."
            : kind === "monthly" && current !== DEFAULT_VALUE
              ? "기관 양식에는 그래프가 들어가지 않아요."
              : "출력 양식 관리에서 올린 양식으로도 출력할 수 있어요."}
        </FieldDescription>
      </Field>
    </FormSection>
  );
}
