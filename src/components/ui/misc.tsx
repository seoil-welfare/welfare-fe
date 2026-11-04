import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Separator */

export const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    className={cn("shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px", className)}
    {...props}
  />
));
Separator.displayName = "Separator";

/* ------------------------------------------------------------------- Switch */

/** 44x26px, on은 primary / off는 input 색 트랙 (가이드 4-3, 8장) */
export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
      "border-2 border-transparent transition-colors duration-150",
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-4 rounded-full bg-white shadow",
        "transition-transform duration-150",
        "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

/* --------------------------------------------------------------- RadioGroup */

export const RadioGroup = RadioGroupPrimitive.Root;
export const RadioGroupItem = RadioGroupPrimitive.Item;
export const RadioGroupIndicator = RadioGroupPrimitive.Indicator;

/* ---------------------------------------------------------------- Accordion */

/** 일지 활동 펼치기 — multiple (가이드 6장) */
export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("overflow-hidden", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group flex min-h-12 flex-1 items-center justify-between gap-3 px-4 py-3 text-left",
        "transition-colors duration-200 hover:bg-accent",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
        aria-hidden
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn("overflow-hidden bg-card", className)}
    {...props}
  >
    <div className="px-4 pb-4 pt-1">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

/* ------------------------------------------------------------------- Alert  */

/** 작성 중 안내 등 (가이드 6장). 수정할 수 없는 이유를 본문으로 안내한다 */
export function Alert({
  tone = "warning",
  icon,
  title,
  children,
  className,
}: {
  tone?: "warning" | "behavior" | "destructive" | "neutral";
  icon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const toneClass = {
    warning: "bg-warning-soft text-warning-foreground",
    behavior: "bg-behavior-soft text-behavior",
    destructive: "bg-destructive-soft text-destructive",
    neutral: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div className={cn("flex items-start gap-2 rounded-card p-3", toneClass, className)}>
      <span className="mt-px shrink-0" aria-hidden>
        {icon ?? <TriangleAlert className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="type-body font-medium">{title}</p> : null}
        {children ? <div className="type-caption leading-[1.125rem]">{children}</div> : null}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-control bg-secondary", className)} aria-hidden />;
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />
      {label ? <span>{label}</span> : <span className="sr-only">처리 중</span>}
    </span>
  );
}

/* ------------------------------------------------------------------- Avatar */

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
        "bg-primary type-caption font-medium text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}
