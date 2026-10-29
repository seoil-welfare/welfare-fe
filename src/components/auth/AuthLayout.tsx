import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo-128.png";

/**
 * 로그인·회원가입 공통 틀.
 * 휴대폰: 배경 위에 바로 놓고 큰 로고·알약 모양 입력칸.
 * 데스크톱(md 이상): 가운데 흰 카드 안에 담고, 로고는 작은 타일·입력칸은 얇은 테두리 사각형.
 */
export function AuthLayout({
  title,
  description,
  logoSize = "large",
  children,
}: {
  title: string;
  /** 데스크톱 카드에서만 보이는 안내 문구 */
  description?: string;
  /** 회원가입처럼 입력이 많은 화면은 휴대폰에서도 로고를 작게 둔다 */
  logoSize?: "large" | "small";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10",
        "md:my-auto md:max-w-[26rem] md:flex-none md:rounded-[1.5rem] md:border md:border-border",
        "md:bg-card md:px-10 md:py-12 md:shadow-[0_1px_2px_rgb(21_46_99/0.04)]",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center md:mb-8 md:gap-2",
          logoSize === "large" ? "mb-10 gap-3" : "mb-6 gap-2",
        )}
      >
        <span className="md:mb-3 md:rounded-2xl md:border md:border-border md:bg-card md:p-2.5 md:shadow-[0_4px_12px_-4px_rgb(21_46_99/0.15)]">
          <img
            src={logoUrl}
            alt=""
            width={88}
            height={88}
            className={cn("md:size-10", logoSize === "large" ? "size-22" : "size-14")}
          />
        </span>
        <h1
          className={cn(
            "font-bold tracking-tight text-primary md:text-2xl md:leading-8",
            logoSize === "large" ? "text-[1.75rem] leading-9" : "text-2xl leading-8",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="hidden type-body text-muted-foreground md:block">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export const pillInputClass =
  "h-full min-w-0 flex-1 bg-transparent type-input text-foreground outline-none placeholder:text-muted-foreground/70";

/** 아이콘이 붙은 둥근 흰 입력칸. 포커스는 칸 전체 테두리로 보여 준다 (가이드 8장) */
export function PillField({
  icon,
  invalid,
  children,
}: {
  icon: ReactNode;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-14 items-center gap-3 rounded-full bg-card px-5 shadow-[0_6px_16px_-6px_rgb(21_46_99/0.18)]",
        // 데스크톱: 카드 안이라 그림자 대신 얇은 테두리의 사각형 칸
        "md:h-12 md:rounded-control md:border md:border-input/50 md:px-4 md:shadow-none",
        "ring-primary transition-shadow duration-150 focus-within:ring-2",
        "[&_svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground",
        invalid && "ring-2 ring-destructive focus-within:ring-destructive",
      )}
    >
      {icon}
      {children}
    </div>
  );
}

/** 로그인·회원가입의 주 버튼 모양 (휴대폰 알약 / 데스크톱 사각형) */
export const authButtonClass = cn(
  "mt-2 h-14 rounded-full text-base shadow-[0_10px_20px_-8px_rgb(21_46_99/0.45)]",
  "md:mt-1 md:h-12 md:rounded-control md:shadow-none",
);
