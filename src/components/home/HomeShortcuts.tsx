import { useRef, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * 홈 상단 바로가기 카드 (피그마 홈).
 * 모바일: 가로로 넘기는 카드 + 위치 점. 다음 카드가 화면 오른쪽에 살짝 보인다.
 * 태블릿 이상: 카드를 한 줄에 나란히 놓고 점은 숨긴다.
 */

export type ShortcutTone = 'continue' | 'write' | 'register';

export interface Shortcut {
  id: string;
  tone: ShortcutTone;
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** 카드 왼쪽 위 표시 (예: 이어쓰기) */
  badge?: string;
  /** 이동은 링크, 동작은 버튼 (가이드 6장) */
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const toneClass: Record<ShortcutTone, string> = {
  continue:
    'bg-linear-to-br from-home-continue-from to-home-continue-to text-primary-foreground hover:brightness-110',
  write:
    'bg-linear-to-br from-home-write-from to-home-write-to text-primary-foreground hover:brightness-110',
  register: 'border border-border bg-card text-primary hover:bg-accent',
};

export function HomeShortcuts({ items }: { items: Shortcut[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    if (!first) return;
    // 끝까지 넘기면 마지막 카드가 왼쪽 정렬되지 않으므로 끝 도달을 따로 본다
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) {
      setActive(items.length - 1);
      return;
    }
    const step =
      first.offsetWidth + parseFloat(getComputedStyle(track).columnGap || '0');
    setActive(Math.round(track.scrollLeft / step));
  }

  function scrollToCard(index: number) {
    const card = trackRef.current?.children[index] as HTMLElement | undefined;
    if (!card) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    // scroll-padding(16)을 따라 카드 왼쪽이 본문 여백에 맞춰진다
    card.scrollIntoView({
      inline: 'start',
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  return (
    <section aria-label="바로가기" className="flex flex-col gap-3">
      <ul
        ref={trackRef}
        onScroll={handleScroll}
        className={cn(
          // 본문 여백(16)을 넘어 화면 끝까지 넘길 수 있게 한다
          'scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4',
          // 가로 스크롤 영역은 세로로도 잘라내므로 그림자가 보일 자리를 위아래로 둔다
          '-mt-2 -mb-5 pt-2 pb-5',
          'md:mx-0 md:grid md:auto-cols-fr md:grid-flow-col md:overflow-visible md:px-0',
        )}
      >
        {items.map((item) => (
          <li key={item.id} className="w-[84%] shrink-0 snap-start md:w-auto">
            <ShortcutCard item={item} />
          </li>
        ))}
      </ul>

      {items.length > 1 ? (
        <div className="flex justify-center gap-1.5 md:hidden">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.title + ' 카드로 이동'}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => scrollToCard(index)}
              className="flex size-11 items-center justify-center"
            >
              <span
                className={cn(
                  'h-2 rounded-full transition-all duration-200',
                  index === active
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30',
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ShortcutCard({ item }: { item: Shortcut }) {
  const { tone, title, description, Icon, badge } = item;
  const onDark = tone !== 'register';

  const body = (
    <>
      {/* 원형 장식 — 바로가기 카드끼리만 쓴다 */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-6 -top-8 size-28 rounded-full',
          onDark ? 'bg-white/8' : 'bg-accent',
        )}
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -bottom-14 right-2 size-36 rounded-full',
          onDark ? 'bg-white/6' : 'bg-muted',
        )}
      />

      <span className="relative flex flex-col gap-1.5">
        {badge ? (
          <span className="mb-1 self-start rounded-badge bg-brand-gold px-2 py-0.5 type-caption font-bold text-primary">
            {badge}
          </span>
        ) : null}
        <span className="type-title">{title}</span>
        <span
          className={cn(
            'truncate type-body',
            onDark ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {description}
        </span>
      </span>

      <Icon
        aria-hidden
        className={cn(
          'absolute bottom-5 right-5 size-11',
          onDark ? 'text-primary-foreground/70' : 'text-primary/70',
        )}
      />
    </>
  );

  const className = cn(
    'relative flex min-h-44 w-full flex-col overflow-hidden rounded-card p-5 text-left',
    'shadow-[var(--shadow-shortcut)] transition-[filter,background-color] duration-150',
    'disabled:pointer-events-none disabled:opacity-60',
    toneClass[tone],
  );

  if (item.to) {
    return (
      <Link to={item.to} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={item.onClick}
      disabled={item.disabled}
      className={className}
    >
      {body}
    </button>
  );
}
