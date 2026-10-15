import { useEffect, useRef, type ReactNode } from "react";
import { registerScrollFocus } from "@/experiments/scroll-focus/scrollFocus";

/**
 * EXPERIMENT(statistics-scroll-animation) — 감싼 카드에 스크롤 위치 연동 강조 효과를 준다.
 * 레이아웃에는 영향을 주지 않는다(transform·box-shadow만 바꾼다).
 * 폐기할 때는 <ScrollFocusCard>를 지우고 안의 카드만 남기면 된다.
 */
export function ScrollFocusCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerScrollFocus(el);
  }, []);

  return (
    <div
      ref={ref}
      // 그림자가 카드 모서리를 따라가도록 카드와 같은 radius를 준다.
      // 휠 스크롤처럼 위치가 한 번에 크게 바뀔 때도 끊기지 않게 짧게 보간한다.
      className="rounded-card transition-[transform,box-shadow] duration-100 ease-out will-change-transform motion-reduce:transition-none"
    >
      {children}
    </div>
  );
}
