import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * 프로젝트 컴포넌트 (가이드 11-2).
 * 일반 폼 섹션은 Card `form`을 쓴다. 목록 Card에 폼 padding을 적용하지 않는다.
 */
export function FormSection({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Card variant="form" className={cn("flex flex-col gap-3", className)} id={id}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? <h2 className="type-heading">{title}</h2> : null}
            {description ? (
              <p className="type-caption text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </Card>
  );
}
