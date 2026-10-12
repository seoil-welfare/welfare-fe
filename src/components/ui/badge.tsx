import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge는 비상호작용 표시다. 조작 컨트롤로 쓰지 않는다 (가이드 6장).
 * 모양(variant)과 의미(tone)를 따로 지정한다 (가이드 7장).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 type-caption font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        soft: "rounded-badge",
        outline: "rounded-full border bg-transparent",
        solid: "rounded-badge",
      },
      tone: {
        neutral: "",
        primary: "",
        warning: "",
        behavior: "",
        destructive: "",
      },
    },
    compoundVariants: [
      { variant: "soft", tone: "neutral", class: "bg-secondary text-secondary-foreground" },
      { variant: "soft", tone: "primary", class: "bg-accent text-accent-foreground" },
      { variant: "soft", tone: "warning", class: "bg-warning-soft text-warning-foreground" },
      { variant: "soft", tone: "behavior", class: "bg-behavior-soft text-behavior" },
      { variant: "soft", tone: "destructive", class: "bg-destructive-soft text-destructive" },
      { variant: "outline", tone: "neutral", class: "border-input text-muted-foreground" },
      { variant: "outline", tone: "primary", class: "border-primary text-primary" },
      { variant: "outline", tone: "warning", class: "border-warning-foreground text-warning-foreground" },
      { variant: "outline", tone: "behavior", class: "border-behavior text-behavior" },
      { variant: "outline", tone: "destructive", class: "border-destructive text-destructive" },
      { variant: "solid", tone: "neutral", class: "bg-muted-foreground text-white" },
      { variant: "solid", tone: "primary", class: "bg-primary text-primary-foreground" },
      { variant: "solid", tone: "warning", class: "bg-warning-foreground text-white" },
      { variant: "solid", tone: "behavior", class: "bg-behavior text-white" },
      { variant: "solid", tone: "destructive", class: "bg-destructive text-white" },
    ],
    defaultVariants: { variant: "soft", tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, tone }), className)} {...props} />;
}

export { badgeVariants };
