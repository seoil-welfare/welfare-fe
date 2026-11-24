import { useId, useState } from "react";
import { ExpandSelect, type ExpandSelectOption } from "@/components/common/ExpandSelect";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { activityMinutes } from "@/services/activityTime";

/** 목록: 복지관 양식 기준 10:00~17:00, 30분 간격. 그 밖의 시각·분 단위 시각은 '직접 입력'으로 적는다 */
const FIRST_HOUR = 10;
const LAST_HOUR = 17;
const STEP_MINUTES = 30;
const MANUAL = "manual";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toTime = (minutes: number) => pad2(Math.floor(minutes / 60)) + ":" + pad2(minutes % 60);

/** 시작 10:00~16:30, 종료 10:30~17:00 */
function steps(end: boolean): string[] {
  const count = ((LAST_HOUR - FIRST_HOUR) * 60) / STEP_MINUTES;
  return Array.from({ length: count }, (_, i) => toTime(FIRST_HOUR * 60 + (i + (end ? 1 : 0)) * STEP_MINUTES));
}

/**
 * 활동 시작·종료 시각 하나를 고른다. 시와 분을 따로 고르지 않고 "10:30" 한 칸을 고른다.
 * - 목록은 10:00~17:00, 30분 간격, 아래로 펼쳐지는 ExpandSelect. 종료 목록은 시작 시각보다 늦은 시각만 보여 준다
 * - 그 밖의 시각(09:00, 18:30 …)이나 10:15 같은 분 단위 시각은 목록 끝 '직접 입력'으로 적는다
 *   (약속: 00:00~24:00, HH:mm 분 단위, 종료만 24:00 허용)
 * - 저장된 값이 목록에 없는 시각이면 처음부터 직접 입력 칸을 보여 준다
 */
export function ActivityTimeSelect({
  label,
  id,
  value,
  onChange,
  end = false,
  after,
  invalid = false,
}: {
  label: string;
  id: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  /** 종료 시각이면 true (24:00 허용) */
  end?: boolean;
  /** 이 시각보다 늦은 것만 목록에 보여 준다 (종료 칸에 시작 시각을 넘긴다) */
  after?: string;
  invalid?: boolean;
}) {
  const inputId = useId();
  const list = steps(end);
  const [manual, setManual] = useState(() => Boolean(value) && !list.includes(value!));
  const afterMinutes = activityMinutes(after);
  const options: ExpandSelectOption[] = [
    ...list
      // 시작을 나중에 바꿔 이미 고른 종료가 더 이르게 됐어도, 고른 값은 목록에 남겨 칸이 비어 보이지 않게 한다
      .filter((time) => time === value || afterMinutes === null || (activityMinutes(time, end) ?? 0) > afterMinutes)
      .map((time) => ({ value: time, label: time })),
    { value: MANUAL, label: "직접 입력" },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ExpandSelect
        id={id}
        label={label}
        placeholder="시각 선택"
        options={options}
        value={manual ? MANUAL : value}
        invalid={invalid}
        describedBy={invalid ? "activity-time-error" : undefined}
        onChange={(next) => {
          if (next === MANUAL) {
            setManual(true);
            return;
          }
          setManual(false);
          onChange(next);
        }}
      />
      {manual ? (
        <Input
          id={inputId}
          aria-label={label + " 직접 입력"}
          inputMode="numeric"
          placeholder={end ? "예: 10:15 (자정은 24:00)" : "예: 10:15"}
          maxLength={5}
          value={value ?? ""}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(formatTyped(event.target.value) || undefined)}
        />
      ) : null}
    </div>
  );
}

/** 숫자만 쳐도 1015 → 10:15 처럼 콜론을 넣어 준다 */
function formatTyped(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? digits.slice(0, 2) + ":" + digits.slice(2) : digits;
}
