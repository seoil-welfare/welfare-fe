/**
 * EXPERIMENT(statistics-scroll-animation) — 스크롤 위치에 따른 카드 강조 시안.
 * 팀 검토용 실험 코드다. 폐기할 때는 이 폴더와 ScrollFocusCard 감싸기만 걷어내면 된다.
 *
 * 화면의 기준선(보이는 영역 가운데쯤)에 걸친 카드만 원래 크기로 또렷하게 떠오르고(그림자),
 * 기준선에서 멀어진 카드는 작아지고 흐려져 뒤로 물러난다.
 * 스크롤마다 React 상태를 바꾸지 않고, requestAnimationFrame 한 번에 모든 카드의 style을 직접 갱신한다.
 */

/** 비활성 카드의 최소 배율 */
const MIN_SCALE = 0.9;
/** 비활성 카드의 최소 불투명도 (1이면 흐려지지 않음) */
const MIN_OPACITY = 0.35;
/** 활성 카드 그림자의 최대 진하기 (0이면 그림자 없음) */
const MAX_SHADOW_ALPHA = 0.18;
/** 화면 위에서 기준선까지의 비율. 상단 헤더·하단 내비게이션을 감안해 가운데보다 약간 위 */
const FOCUS_LINE_RATIO = 0.45;
/**
 * 페이지 끝에 가까워지면 기준선을 이 위치(화면 높이 대비)까지 내린다.
 * 맨 아래 카드는 스크롤해도 가운데까지 올라올 수 없으므로, 기준선이 마지막 카드 쪽으로 따라간다.
 */
const END_FOCUS_LINE_RATIO = 0.8;
/** 페이지 끝까지 남은 스크롤이 이 거리(화면 높이 대비)보다 짧아지면 기준선을 내리기 시작한다 */
const END_ZONE_RATIO = 0.5;
/** 기준선에서 이 거리(화면 높이 대비)만큼 떨어지면 효과가 최대가 된다. 작을수록 전환이 급하다 */
const FALLOFF_RATIO = 0.22;

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
  el.style.opacity = "";
  el.style.boxShadow = "";
}

function update(): void {
  frame = 0;
  const viewport = window.innerHeight;
  // 페이지 끝까지 남은 스크롤 거리. 끝에 가까울수록 기준선을 아래로 옮긴다
  const remaining = document.documentElement.scrollHeight - (window.scrollY + viewport);
  const towardEnd = 1 - Math.min(Math.max(remaining / (viewport * END_ZONE_RATIO), 0), 1);
  const focusY =
    viewport *
    (FOCUS_LINE_RATIO + (END_FOCUS_LINE_RATIO - FOCUS_LINE_RATIO) * smoothstep(towardEnd));
  const falloff = viewport * FALLOFF_RATIO;

  cards.forEach((el) => {
    const rect = el.getBoundingClientRect();
    // 기준선이 카드 안에 있으면 거리 0. 키가 큰 카드도 기준선에 걸쳐 있는 동안은 강조 상태다
    const distance =
      focusY < rect.top ? rect.top - focusY : focusY > rect.bottom ? focusY - rect.bottom : 0;
    // t: 0 = 활성(가운데), 1 = 완전히 물러남
    const t = smoothstep(distance / falloff);
    const scale = 1 - (1 - MIN_SCALE) * t;
    const opacity = 1 - (1 - MIN_OPACITY) * t;
    const lift = 1 - t;
    el.style.transform = t === 0 ? "" : "scale(" + scale.toFixed(4) + ")";
    el.style.opacity = t === 0 ? "" : opacity.toFixed(3);
    el.style.boxShadow =
      lift === 0
        ? ""
        : "0 " +
          (12 * lift).toFixed(1) +
          "px " +
          (32 * lift).toFixed(1) +
          "px rgb(15 23 42 / " +
          (MAX_SHADOW_ALPHA * lift).toFixed(3) +
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
