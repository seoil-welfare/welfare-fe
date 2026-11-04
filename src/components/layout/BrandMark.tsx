import logoUrl from "@/assets/logo-128.png";
import { cn } from "@/lib/utils";

/**
 * 서비스 로고 (협력 복지관 로고 + 서비스명). 홈 헤더와 데스크톱 Sidebar가 같이 쓴다.
 * 원본(assets/logo.png, 3762px)은 화면에 쓰기엔 커서 128px로 줄인 파일을 쓴다.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src={logoUrl} alt="" width={32} height={32} className="size-8 shrink-0" />
      <span className="type-brand text-primary">케어로그</span>
    </span>
  );
}
