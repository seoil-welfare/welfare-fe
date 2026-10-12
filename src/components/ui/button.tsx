import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * 가이드 4-3의 프로젝트 확장 API.
 * size: default 48 / lg 52 / dense 40 / compact 32(radius full) / icon 44x44
 * variant: default / outline / ghost / dashed / destructive
 * hover는 bg-primary/90 대신 primary-hover를 쓴다 (가이드 11-1).
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "type-body font-medium transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        dashed:
          "w-full border border-dashed border-input bg-card text-foreground hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
      },
      size: {
        default: "min-h-12 rounded-control px-4 [&_svg]:size-5",
        lg: "min-h-[52px] rounded-control px-4 type-input font-medium [&_svg]:size-5",
        dense: "min-h-10 rounded-control px-3 [&_svg]:size-5",
        // 보이는 높이 32px, 실제 클릭 영역은 44px을 확보한다
        compact:
          "min-h-8 rounded-full px-3 type-caption font-medium relative after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] [&_svg]:size-4",
        icon: "size-11 rounded-control [&_svg]:size-5",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "default", size: "default", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
