import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * 조건부 직접 입력 (가이드 7장 OtherInput).
 * 외곽 안내는 warning-soft 표면 + 금색 장식.
 * 실제 편집 가능한 입력은 input 테두리와 focus 표시를 쓴다 — 금색 선만으로 입력 영역을 식별하게 하지 않는다.
 * 선택 시 내용 필수 여부와 해제 시 입력 보존은 U2 미확정이다.
 */
export function OtherInput({
  id,
  selected,
  value,
  onChange,
  placeholder = "직접 적어 주세요",
  guideText = "‘기타’를 고르면 직접 적을 수 있어요.",
  className,
}: {
  id: string;
  selected: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  guideText?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border-l-4 border-brand-gold bg-warning-soft p-3",
        className,
      )}
    >
      {selected ? (
        <>
          <label htmlFor={id} className="mb-2 block type-caption text-warning-foreground">
            직접 입력
          </label>
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="bg-card"
          />
        </>
      ) : (
        // 안내 글자에 disabled opacity를 적용하지 않는다 (가이드 9장 4번)
        <p className="type-caption text-warning-foreground">{guideText}</p>
      )}
    </div>
  );
}
