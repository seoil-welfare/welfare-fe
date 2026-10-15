/**
 * EXPERIMENT(statistics-scroll-animation) — 스크롤 위치에 따른 카드 강조 시안.
 * 팀 검토용 실험 코드다. 폐기할 때는 이 폴더와 ScrollFocusCard 감싸기만 걷어내면 된다.
 *
 * 화면의 기준선(보이는 영역 가운데쯤)에 걸친 카드는 원래 크기,
 * 기준선에서 멀어진 카드는 살짝 작아지고 옅은 그림자가 생긴다.
 * 스크롤마다 React 상태를 바꾸지 않고, requestAnimationFrame 한 번에 모든 카드의 style을 직접 갱신한다.
 */

/** 비활성 카드의 최소 배율 */
const MIN_SCALE = 0.97;
/** 비활성 카드 그림자의 최대 진하기 */
const MAX_SHADOW_ALPHA = 0.08;
/** 화면 위에서 기준선까지의 비율. 상단 헤더·하단 내비게이션을 감안해 가운데보다 약간 위 */
const FOCUS_LINE_RATIO = 0.45;
/** 기준선에서 이 거리(화면 높이 대비)만큼 떨어지면 효과가 최대가 된다 */
const FALLOFF_RATIO = 0.35;

const cards = new Set<HTMLElement>();
let frame = 0;
let listening = false;
let reducedMotion: MediaQueryList | null = null;

function smoothstep(x: number): number {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
}

function clearStyle(el: HTMLElement): void {
  el.style.transform = "";
  el.style.boxShadow = "";
}

function update(): void {
  frame = 0;
  const viewport = window.innerHeight;
  const focusY = viewport * FOCUS_LINE_RATIO;
  const falloff = viewport * FALLOFF_RATIO;

  cards.forEach((el) => {
    const rect = el.getBoundingClientRect();
    // 기준선이 카드 안에 있으면 거리 0. 키가 큰 카드도 기준선에 걸쳐 있는 동안은 강조 상태다
    const distance =
      focusY < rect.top ? rect.top - focusY : focusY > rect.bottom ? focusY - rect.bottom : 0;
    const t = smoothstep(distance / falloff);
    const scale = 1 - (1 - MIN_SCALE) * t;
    const alpha = MAX_SHADOW_ALPHA * t;
    el.style.transform = t === 0 ? "" : "scale(" + scale.toFixed(4) + ")";
    el.style.boxShadow =
      t === 0
        ? ""
        : "0 " +
          (2 + 6 * t).toFixed(1) +
          "px " +
          (6 + 14 * t).toFixed(1) +
          "px rgb(15 23 42 / " +
          alpha.toFixed(3) +
          ")";
  });
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(update);
}

function start(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
}

function stop(): void {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

function prefersReducedMotion(): boolean {
  if (!reducedMotion) {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 설정이 바뀌면 효과를 켜거나 끈다
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion?.matches) {
        stop();
        cards.forEach(clearStyle);
      } else if (cards.size > 0) {
        start();
      }
    });
  }
  return reducedMotion.matches;
}

/** 카드를 등록한다. 반환값을 호출하면 등록을 해제하고 style을 원래대로 돌린다 */
export function registerScrollFocus(el: HTMLElement): () => void {
  cards.add(el);
  if (!prefersReducedMotion()) start();
  return () => {
    cards.delete(el);
    clearStyle(el);
    if (cards.size === 0) stop();
  };
}
