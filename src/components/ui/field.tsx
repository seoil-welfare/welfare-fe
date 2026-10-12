import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Field / FieldLabel / FieldDescription / FieldError / FieldGroup (가이드 9장).
 * 구조는 '그룹 제목 → 설명 → 필드 → 오류' 순서다.
 * 라벨→컨트롤 8px, 필드→필드 16px, 오류 문구→컨트롤 4px.
 */

export function FieldGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

export function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

export interface FieldLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean;
}

export const FieldLabel = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  FieldLabelProps
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("type-body font-medium text-foreground", className)}
    {...props}
  >
    {children}
    {required ? (
      <span className="ml-1 text-destructive" aria-hidden>
        *
      </span>
    ) : null}
  </LabelPrimitive.Root>
));
FieldLabel.displayName = "FieldLabel";

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("type-caption text-muted-foreground", className)} {...props} />;
}

export function FieldError({
  id,
  children,
  className,
}: {
  id?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn("mt-1 flex items-start gap-1 type-caption text-destructive", className)}
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** 섹션 제목 + 설명 + 내용 (FormSection은 Card form 안에서 쓴다) */
export function FieldSetLegend({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="type-body font-medium text-foreground">{title}</span>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </div>
  );
}
