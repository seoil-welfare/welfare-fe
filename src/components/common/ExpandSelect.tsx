import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Collapse } from "@/components/motion/Collapse";
import { cn } from "@/lib/utils";

export interface ExpandSelectOption {
  value: string;
  label: string;
}

/**
 * ExpandSelect (프로젝트 컴포넌트).
 * 값이 보이는 칸은 그대로 두고, 그 아래에 목록 상자가 내려왔다 올라간다.
 * 기본은 아래 내용을 밀어내고, overlay면 아래 내용 위에 뜬다(좁은 칸이 한 줄에 여럿일 때).
 * 한 번에 약 4칸이 보이고 나머지는 상자 안에서 스크롤한다. 펼침 효과는 공통 Collapse를 쓴다.
 *
 * 키보드: 열린 상태에서 ↑↓로 이동, Enter·Space로 선택, Esc로 닫기 (listbox 패턴)
 */
export function ExpandSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  describedBy,
  overlay,
  onClose,
  className,
  triggerClassName,
}: {
  /** 화면 낭독기용 이름 */
  label: string;
  options: readonly ExpandSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  /** 필수 값이 비었을 때 오류 테두리를 보여 준다 */
  invalid?: boolean;
  /** 오류 문구 id (화면 낭독기가 함께 읽는다) */
  describedBy?: string;
  /** 목록을 아래 내용 위에 띄운다 */
  overlay?: boolean;
  /** 목록이 닫힌 뒤 부른다 (칸을 벗어날 때의 검사용). 고른 값이 반영된 뒤에 불린다 */
  onClose?: () => void;
  className?: string;
  /** 값 칸 모양을 화면에 맞게 바꿀 때 */
  triggerClassName?: string;
}) {
  const id = useId();
  const listId = id + "-list";
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.value === value);

  // 열면 지금 고른 항목(없으면 첫 항목)에 포커스를 두고 보이게 스크롤한다
  useEffect(() => {
    if (!open) return;
    const index = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    );
    setActive(index);
    // scrollIntoView는 페이지까지 스크롤해서 여는 순간 화면이 튄다. 목록 안에서만 위치를 맞춘다
    scrollListTo(index, "center");
    listRef.current?.focus({ preventScroll: true });
    // 열리는 순간만 맞춘다. 열린 동안 목록이 바뀌어도 위치를 다시 잡지 않는다
  }, [open]);

  // 닫힌 뒤 알린다. 효과에서 불러야 방금 고른 값이 반영된 onClose를 쓴다
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) onClose?.();
    wasOpen.current = open;
  }, [open]);

  // 칸 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function choose(option: ExpandSelectOption) {
    onChange(option.value);
    close();
  }

  function scrollListTo(index: number, align: "center" | "nearest") {
    const list = listRef.current;
    const item = list?.children[index] as HTMLElement | undefined;
    if (!list || !item) return;
    if (align === "center") {
      list.scrollTop = item.offsetTop - (list.clientHeight - item.offsetHeight) / 2;
      return;
    }
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }

  function moveActive(next: number) {
    const clamped = Math.min(options.length - 1, Math.max(0, next));
    setActive(clamped);
    scrollListTo(clamped, "nearest");
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") moveActive(active + 1);
    else if (event.key === "ArrowUp") moveActive(active - 1);
    else if (event.key === "Home") moveActive(0);
    else if (event.key === "End") moveActive(options.length - 1);
    else if (event.key === "Enter" || event.key === " ") {
      const option = options[active];
      if (option) choose(option);
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") close();
      else setOpen(false);
      return;
    } else return;
    event.preventDefault();
  }

  return (
    <div ref={rootRef} className={cn("relative flex flex-col", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-control border border-input bg-muted px-3",
          // 오류 상태: 테두리 2px + 아래 문구 (가이드 8장)
          "aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive",
          "text-left type-input disabled:cursor-not-allowed disabled:opacity-50",
          selected ? "text-foreground" : "text-muted-foreground",
          triggerClassName,
        )}
      >
        <span className="truncate tnum">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform duration-250 ease-out",
            open && "rotate-180",
          )}
        />
      </button>

      {/* 목록 상자. 닫힌 동안에는 화면 낭독기·키보드에서 숨긴다 */}
      <Collapse
        open={open}
        className={overlay ? "absolute inset-x-0 top-full z-20" : undefined}
        panelClassName="mt-1.5 rounded-control border border-border bg-card shadow-[var(--shadow-home)]"
      >
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={open && options[active] ? id + "-opt-" + active : undefined}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="scrollbar-none relative max-h-[11.5rem] overflow-y-auto overscroll-contain p-1 outline-none"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={id + "-opt-" + index}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(option)}
                onPointerMove={() => setActive(index)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-control px-3",
                  "type-body tnum transition-colors duration-100",
                  index === active && "bg-accent",
                  isSelected ? "font-medium text-primary" : "text-foreground",
                )}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      </Collapse>
    </div>
  );
}
