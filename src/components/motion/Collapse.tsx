import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 펼침 애니메이션의 공통 속도·곡선. 열 때와 닫을 때를 같은 속도로 보이게 한다 */
export const EXPAND_EASE = "duration-250 ease-[cubic-bezier(0.2,0,0,1)]";

/**
 * Collapse (공통 애니메이션).
 * open이 바뀌면 높이(0fr → 1fr)와 투명도·위치(살짝 위에서 내려옴)를 같은 곡선으로 함께 움직인다.
 * 닫힌 동안에는 inert로 화면 낭독기·키보드에서 숨긴다.
 *
 * 기본은 아래 내용을 밀어내며 펼친다. 위에 띄우려면 className에 absolute 위치를 준다.
 * 사용 예: 목록 상자(ExpandSelect), 접히는 안내 문구 등
 */
export function Collapse({
  open,
  className,
  panelClassName,
  children,
}: {
  open: boolean;
  /** 바깥 틀(높이가 움직이는 칸). 위치·여백을 여기에 준다 */
  className?: string;
  /** 안쪽 내용 상자(투명도·위치가 움직이는 칸). 테두리·배경을 여기에 준다 */
  panelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows]",
        EXPAND_EASE,
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "transition-[opacity,translate]",
            EXPAND_EASE,
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
