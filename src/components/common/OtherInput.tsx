import { Textarea } from "@/components/ui/input";
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
  className,
}: {
  id: string;
  selected: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  if (!selected) return null;

  return (
    <div
      className={cn(
        "rounded-card border-l-4 border-brand-gold bg-warning-soft p-3",
        className,
      )}
    >
      <label htmlFor={id} className="mb-2 block type-caption text-warning-foreground">
        직접 입력
      </label>
      {/* 긴 글이 화면 밖으로 나가지 않게 줄바꿈되는 Textarea를 쓴다.
          다만 '기타'는 짧은 한 줄 답이라 Enter·붙여넣기로 생긴 줄바꿈 문자는 넣지 않는다 */}
      <Textarea
        id={id}
        size="line"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, " "))}
        onKeyDown={(event) => {
          // 한글 조합 중 Enter를 막으면 마지막 글자가 사라질 수 있어서 조합이 끝난 Enter만 막는다
          if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
        }}
        placeholder={placeholder}
        className="bg-card"
      />
    </div>
  );
}
