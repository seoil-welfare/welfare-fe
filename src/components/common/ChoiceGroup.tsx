import { useId } from "react";
import { Check } from "lucide-react";
import { EXCLUSIVE_NONE_LABEL, OTHER_LABEL } from "@/data/catalog";
import { OtherInput } from "@/components/common/OtherInput";
import { FieldDescription } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * 선택 칩 그룹 (프로젝트 컴포넌트).
 * - 단일 선택은 radio, 복수 선택은 checkbox의 접근성 의미를 유지한다 (가이드 9장 3번)
 * - Badge를 조작 컨트롤로 쓰지 않는다 (가이드 6장)
 * - 칩 최소 높이 40px, 조작 영역 44px, 글자가 길면 줄바꿈하며 늘어난다 (가이드 4-3)
 */

interface BaseProps {
  label: string;
  options: readonly string[];
  description?: string;
  /** '기타' 직접 입력 값 */
  otherValue?: string;
  onOtherChange?: (value: string) => void;
  className?: string;
}

export function SingleChoiceGroup({
  label,
  options,
  value,
  onChange,
  description,
  otherValue,
  onOtherChange,
  className,
}: BaseProps & { value: string; onChange: (value: string) => void }) {
  const name = useId();
  return (
    <fieldset className={cn("flex flex-col gap-2 border-0 p-0", className)}>
      <legend className="mb-2 type-body font-medium text-foreground">{label}</legend>
      {description ? <FieldDescription className="-mt-1 mb-1">{description}</FieldDescription> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option}
            type="radio"
            name={name}
            label={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
        ))}
      </div>
      {options.includes(OTHER_LABEL) && onOtherChange ? (
        <OtherInput
          id={name + "-other"}
          selected={value === OTHER_LABEL}
          value={otherValue ?? ""}
          onChange={onOtherChange}
          className="mt-1"
        />
      ) : null}
    </fieldset>
  );
}

export function MultiChoiceGroup({
  label,
  options,
  values,
  onChange,
  description = "여러 개 고를 수 있어요",
  otherValue,
  onOtherChange,
  /** U2_REVIEW — '없음' 배타 선택. 글자가 '없음'이라는 이유로 모든 그룹에 적용하지 않는다 */
  exclusiveNone = false,
  className,
}: BaseProps & {
  values: readonly string[];
  onChange: (values: string[]) => void;
  exclusiveNone?: boolean;
}) {
  const name = useId();

  function toggle(option: string) {
    const isOn = values.includes(option);
    if (exclusiveNone && option === EXCLUSIVE_NONE_LABEL) {
      // '없음'을 선택하면 다른 항목의 선택이 모두 해제된다 (FR-21 / U2_REVIEW)
      onChange(isOn ? [] : [EXCLUSIVE_NONE_LABEL]);
      return;
    }
    const base = exclusiveNone ? values.filter((v) => v !== EXCLUSIVE_NONE_LABEL) : values;
    onChange(isOn ? base.filter((v) => v !== option) : [...base, option]);
  }

  return (
    <fieldset className={cn("flex flex-col gap-2 border-0 p-0", className)}>
      <legend className="mb-2 type-body font-medium text-foreground">{label}</legend>
      <FieldDescription className="-mt-1 mb-1">
        {description}
        {values.length > 0 ? <span className="ml-1 tnum">· {values.length}개 선택됨</span> : null}
      </FieldDescription>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option}
            type="checkbox"
            name={name + "-" + option}
            label={option}
            checked={values.includes(option)}
            onChange={() => toggle(option)}
          />
        ))}
      </div>
      {options.includes(OTHER_LABEL) && onOtherChange ? (
        <OtherInput
          id={name + "-other"}
          selected={values.includes(OTHER_LABEL)}
          value={otherValue ?? ""}
          onChange={onOtherChange}
          className="mt-1"
        />
      ) : null}
    </fieldset>
  );
}

function Chip({
  type,
  name,
  label,
  checked,
  onChange,
}: {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2",
        "type-body font-medium transition-colors duration-150",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card text-foreground hover:bg-accent",
        // 조작 영역 44px 확보
        "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="absolute size-0 opacity-0"
      />
      {/* 색만으로 선택을 전달하지 않는다 (가이드 2-3 8번) */}
      {checked ? <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden /> : null}
      <span className="break-keep">{label}</span>
    </label>
  );
}
