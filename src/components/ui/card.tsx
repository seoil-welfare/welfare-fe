import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Card variant (가이드 4-3).
 * form: padding 16 / list: 외곽 padding 0, 행마다 16·12 / metric: padding 16 / hero: padding 20, 홈 전용
 * 일반 카드는 평면이다. elevation="home"만 약한 그림자를 쓴다.
 */
const cardVariants = cva("rounded-card", {
  variants: {
    variant: {
      form: "bg-card text-card-foreground border border-border p-4",
      list: "bg-card text-card-foreground border border-border p-0 overflow-hidden",
      metric: "bg-card text-card-foreground border border-border p-4",
      hero: "bg-primary text-primary-foreground p-5 relative overflow-hidden",
      plain: "bg-card text-card-foreground border border-border",
    },
    elevation: {
      none: "",
      home: "shadow-[0_1px_2px_rgb(21_46_99_/_0.08)]",
    },
  },
  defaultVariants: { variant: "form", elevation: "none" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, elevation, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, elevation }), className)} {...props}>
      {variant === "hero" ? (
        <>
          {/* 홈 전용 원형 장식 — 원본 그라데이션의 근사 구현 (가이드 4-3) */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-12 right-10 size-24 rounded-full bg-white/[0.07]"
          />
          <div className="relative">{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  ),
);
Card.displayName = "Card";
