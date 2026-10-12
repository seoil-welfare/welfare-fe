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

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full min-h-24 rounded-control border border-input bg-muted px-3 py-2",
      "type-body-long text-foreground placeholder:text-muted-foreground",
      "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
      "aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
