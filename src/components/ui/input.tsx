import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input / Textarea.
 * 높이 48(dense 40), 표면 muted, 테두리 input, 좌우 padding 12px(로그인 16px).
 * 오류는 destructive 테두리 2px + aria-invalid (가이드 8장).
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "default" | "dense";
  padding?: "default" | "login";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "default", padding = "default", ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-control border bg-muted type-input text-foreground",
        "placeholder:text-muted-foreground transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "read-only:bg-secondary",
        inputSize === "default" ? "h-12" : "h-10",
        padding === "login" ? "px-4" : "px-3",
        // 테두리 두께 변경으로 내부 내용이 움직이지 않게 공간을 확보한다 (가이드 2-3 3번)
        "border-input aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive",
        "aria-[invalid=true]:px-[11px]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

/**
 * Textarea는 내용이 늘면 높이도 같이 늘어난다. 안쪽 스크롤 없이 쓴 글 전체가 보인다.
 * - size="default": 여러 줄 메모 (최소 높이 96)
 * - size="line": Input처럼 한 줄 높이(48)·글자 크기로 시작하고, 길어지면 아래로 줄바꿈된다
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: "default" | "line";
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size = "default", value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    // 바깥에서 받은 ref도 같은 textarea를 가리키게 한다
    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    // 값이 바뀔 때마다 높이를 내용에 맞춘다.
    // 먼저 auto로 줄여야 글을 지웠을 때도 높이가 줄어든다.
    // scrollHeight에는 테두리가 빠져 있어서 (offsetHeight - clientHeight)만큼 더한다.
    React.useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + (el.offsetHeight - el.clientHeight) + "px";
    }, [value]);

    return (
      <textarea
        ref={innerRef}
        value={value}
        rows={size === "line" ? 1 : undefined}
        className={cn(
          "w-full resize-none overflow-hidden rounded-control border border-input bg-muted px-3",
          "text-foreground placeholder:text-muted-foreground",
          "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive",
          // line: 테두리 1px×2 + 위아래 11px×2 + 줄 높이 24px = 48px로 Input과 같은 높이
          size === "line" ? "min-h-12 py-[11px] type-input" : "min-h-24 py-2 type-body-long",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
