import { FormSection } from "@/components/common/FormSection";
import { SingleChoiceGroup } from "@/components/common/ChoiceGroup";
import { useCategoryChoices } from "@/app/useCategoryChoices";
import { TEMPERATURE_BANDS } from "@/data/catalog";
import { choiceLabels } from "@/services/categoryService";
import type { Condition, DiaryDraft, Weather } from "@/types";

/** 온도 칩: 추움 10℃ 이하 (칩 글자 ↔ 저장 코드) */
const TEMPERATURE_OPTIONS = TEMPERATURE_BANDS.map((band) => ({ code: band.code, label: band.label + " " + band.range }));

/**
 * 날씨·온도·컨디션 (FR-10, FR-11).
 * - 날씨 기본 '맑음', 컨디션 기본 '양호', 컨디션 '기타'는 직접 입력
 * - 온도 구간은 날씨 아래에서 고른다. 필수가 아니라 기본 미선택이고, 다시 누르면 선택이 풀린다 (복지관 요청)
 * - 선택지는 서버 목록(GET /categories)을 쓰고, 지금 고른 값이 목록에서 빠졌어도 보이게 남긴다
 */
export function WeatherConditionSection({
  draft,
  onChange,
}: {
  draft: DiaryDraft;
  onChange: (partial: Partial<DiaryDraft>) => void;
}) {
  const choices = useCategoryChoices();
  return (
    <FormSection title="날씨와 컨디션">
      <SingleChoiceGroup
        label="날씨"
        options={choiceLabels(choices.weather, [draft.weather])}
        value={draft.weather}
        onChange={(value) => onChange({ weather: value as Weather })}
      />
      <SingleChoiceGroup
        label="온도"
        options={TEMPERATURE_OPTIONS.map((option) => option.label)}
        value={TEMPERATURE_OPTIONS.find((option) => option.code === draft.temperature)?.label ?? ""}
        onChange={(label) => onChange({ temperature: TEMPERATURE_OPTIONS.find((option) => option.label === label)?.code })}
        clearable
      />
      <SingleChoiceGroup
        label="이용자 컨디션"
        options={choiceLabels(choices.condition, [draft.condition])}
        value={draft.condition}
        onChange={(value) => onChange({ condition: value as Condition })}
        otherValue={draft.conditionOther}
        onOtherChange={(value) => onChange({ conditionOther: value })}
      />
    </FormSection>
  );
}
