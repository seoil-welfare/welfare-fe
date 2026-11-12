import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Phone, Volume2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { Button } from "@/components/ui/button";
import {
  MoodFace,
  PictogramIcon,
  cardDate,
  cardTime,
  useSpeech,
} from "@/components/todayCard/cardParts";
import { cn } from "@/lib/utils";
import type { CardPickInput } from "@/api/types";
import type { CardContent, CardPick, PickHow, TodayCardItem } from "@/types/todayCard";

/**
 * 오늘 카드 화면 (보호자 링크 화면과 담당자 미리보기가 함께 쓴다).
 * 활동마다 카드 한 장을 옆으로 넘겨 본다. 앞면은 이용자에게 보여 주는 그림 카드, 누르면 뒤집혀 보호자 메모가 나온다.
 * 마지막 장에서 이용자가 오늘 제일 좋았던 활동을 고르면 다음 날 담당자 화면에 전한다.
 */

/** 카드 앞면 색. 홈의 일지 작성 카드와 같은 파랑 계열을 장마다 돌려 쓴다 */
const CARD_TONES = [
  {
    face: "bg-linear-to-br from-home-write-from to-home-write-to",
    glow: "var(--home-write-from)",
  },
  {
    face: "bg-linear-to-br from-home-continue-from to-home-continue-to",
    glow: "var(--home-continue-from)",
  },
  { face: "bg-linear-to-br from-chart-2 to-home-write-to", glow: "var(--chart-2)" },
];

export interface TodayCardPreviewActions {
  onBack: () => void;
  /** 보던 장의 활동 id (고르기 장이면 null) */
  onEdit: (itemId: string | null) => void;
  onSend: () => void;
  sending: boolean;
}

export function TodayCardView({
  card,
  pick,
  onPick,
  preview,
}: {
  card: CardContent;
  /** 이미 고른 결과 (다시 열었을 때) */
  pick?: CardPick;
  /** 보호자가 고르면 서버에 저장한다. 미리보기에서는 주지 않는다 (담당자가 눌러 봐도 저장되지 않게) */
  onPick?: (input: CardPickInput) => void;
  /** 담당자 미리보기일 때만 준다. 상단 뒤로가기와 하단 고치기·보내기가 생긴다 */
  preview?: TodayCardPreviewActions;
}) {
  const total = card.items.length + 1;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [autoRead, setAutoRead] = useState(false);
  const speech = useSpeech();
  const item = card.items[index] as TodayCardItem | undefined;
  const isBack = item !== undefined && flipped === item.id;
  const trackRef = useRef<HTMLDivElement>(null);

  /** 탭·키보드·옆 카드를 누르면 그 장으로 민다. 손가락으로 밀면 아래 onScroll이 index를 맞춘다 */
  function go(next: number) {
    const track = trackRef.current;
    if (!track || next < 0 || next >= total) return;
    const slide = track.children[next] as HTMLElement | undefined;
    if (!slide) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const distance = Math.abs(el.offsetLeft + el.clientWidth / 2 - center);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    if (nearest !== index) {
      speech.stop();
      setFlipped(null);
      setIndex(nearest);
    }
  }

  // 자동 읽기를 켜 두면 장을 넘기거나 뒤집을 때마다 그 면을 읽는다
  useEffect(() => {
    if (!autoRead) return;
    if (!item) speech.speak("오늘 제일 좋았던 건?");
    else
      speech.speak(
        isBack ? item.guardianText : item.word + ". " + item.easyText,
      );
  }, [autoRead, index, isBack]);

  // 키보드 ← → 로도 넘긴다
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "ArrowRight") go(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      {/* 담당자가 확인 화면에서 미리보기로 열었을 때만 돌아갈 길을 준다. 보호자 링크에는 없다 */}
      {preview ? (
        <AppHeader
          title="미리보기"
          onBack={() => {
            speech.stop();
            preview.onBack();
          }}
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-110 flex-col pt-5 pb-safe">
        <header className="flex items-start justify-between gap-3 px-5">
          <div className="min-w-0">
            <p className="type-caption text-muted-foreground">
              {cardDate(card.date)} · {card.program}
            </p>
            <h1 className="mt-0.5 type-display">{card.nickname}님의 오늘</h1>
          </div>
          {speech.supported ? (
            <Button
              variant={autoRead ? "default" : "outline"}
              size="compact"
              className="mt-1"
              aria-pressed={autoRead}
              onClick={() => {
                if (autoRead) speech.stop();
                setAutoRead(!autoRead);
              }}
            >
              <Volume2 aria-hidden />
              자동 읽기
            </Button>
          ) : null}
        </header>

        {/* 활동 시간 탭: 지금 보는 장을 알려 주고, 누르면 그 장으로 간다 */}
        <div
          className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-5"
          role="tablist"
          aria-label="오늘 활동"
        >
          {[...card.items.map((it) => cardTime(it.time)), "고르기"].map(
            (label, i) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => go(i)}
                className={cn(
                  "min-h-10 shrink-0 rounded-control px-3 type-body font-medium transition-colors",
                  i === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-secondary",
                )}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {/* 카드 넘기기: 가운데 한 장이 크게, 양옆 장이 조금 보인다 */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="scrollbar-none mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-[15%] pt-2 pb-10"
        >
          {card.items.map((it, i) => (
            <Slide
              key={it.id}
              active={i === index}
              onFocusSlide={() => go(i)}
              glow={CARD_TONES[i % CARD_TONES.length].glow}
            >
              <FlipCard
                item={it}
                tone={CARD_TONES[i % CARD_TONES.length].face}
                flipped={flipped === it.id}
                needsCall={card.needsCall}
                onFlip={() => {
                  if (i !== index) return go(i);
                  speech.stop();
                  setFlipped(flipped === it.id ? null : it.id);
                }}
                onListen={
                  speech.supported
                    ? () => speech.speak(it.word + ". " + it.easyText)
                    : undefined
                }
              />
            </Slide>
          ))}
          <Slide
            active={index === total - 1}
            onFocusSlide={() => go(total - 1)}
            glow="var(--chart-3)"
          >
            <PickCard card={card} initial={pick} onPick={onPick} />
          </Slide>
        </div>

        {/* 담당자 미리보기: 보내기 전에 알아 둘 것 */}
        {preview ? (
          <div className="mx-5 rounded-card bg-card px-4 py-3 text-center type-body-long text-muted-foreground">
            공유 링크는 7일 뒤 만료돼요.
            <br />
            검토한 뒤 링크를 만들어 보호자에게 보내 주세요.
          </div>
        ) : null}
        {/* 미리보기일 때는 하단 버튼에 가리지 않게 띄운다 */}
        <div
          className={
            preview ? "pb-[calc(76px+env(safe-area-inset-bottom,0px))]" : "pb-2"
          }
        />
      </div>

      {/* 담당자 미리보기: 보이는 그대로 확인했으면 여기서 바로 보낸다 */}
      {preview ? (
        <BottomActionBar className="xl:left-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              speech.stop();
              // 보던 장의 고치기 칸을 열어 둔 채로 확인 화면으로 돌아간다 (고르기 장이면 그냥 돌아간다)
              preview.onEdit(item?.id ?? null);
            }}
          >
            고치기
          </Button>
          <Button className="flex-[2]" disabled={preview.sending} onClick={preview.onSend}>
            {preview.sending ? "링크 만드는 중…" : "공유 링크 만들기"}
          </Button>
        </BottomActionBar>
      ) : null}
    </div>
  );
}

/** 넘기는 한 장. 가운데 장이 아니면 조금 작고 흐리게, 누르면 그 장으로 간다 */
function Slide({
  active,
  glow,
  onFocusSlide,
  children,
}: {
  active: boolean;
  glow: string;
  onFocusSlide: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative w-full shrink-0 snap-center transition-[transform,opacity] duration-300",
        // 옆 장은 색 띠만 보이게 글자·버튼을 숨긴다 (잘린 글자 조각이 보이지 않게)
        active
          ? "scale-100 opacity-100"
          : "scale-[0.92] opacity-55 [&_[data-peek-hide]]:opacity-0",
      )}
      onClickCapture={(event) => {
        if (active) return;
        event.stopPropagation();
        onFocusSlide();
      }}
    >
      {/* 카드 모양 그대로 아래로 번지는 그림자 (카드 색).
          넘기는 영역(overflow) 밖으로 나가면 잘려 경계선이 생기므로, 위아래로 퍼지는 범위를 영역 여백(pt-2·pb-10) 안에 맞춘다 */}
      <div
        className="relative rounded-[28px] transition-shadow duration-300"
        style={{ boxShadow: active ? "0 18px 28px -14px color-mix(in srgb, " + glow + " 65%, transparent)" : "none" }}
      >
        {children}
      </div>
    </div>
  );
}

/** 앞면(그림 카드)과 뒷면(보호자 메모). 누르면 뒤집힌다 */
function FlipCard({
  item,
  tone,
  flipped,
  needsCall,
  onFlip,
  onListen,
}: {
  item: TodayCardItem;
  tone: string;
  flipped: boolean;
  needsCall: boolean;
  onFlip: () => void;
  onListen?: () => void;
}) {
  return (
    <div className="aspect-[3/4.8] w-full perspective-[1200px]">
      <div
        className={cn(
          "relative size-full transition-transform duration-500 transform-3d",
          flipped ? "rotate-y-180" : "",
        )}
      >
        {/* 앞면 */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-[28px] text-white backface-hidden",
            tone,
          )}
          aria-hidden={flipped}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-white/10"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-10 size-48 rounded-full bg-white/10"
          />
          <button
            type="button"
            onClick={onFlip}
            data-peek-hide
            className="absolute inset-0 flex flex-col items-center px-6 pb-7 pt-5 text-center transition-opacity"
            aria-label={item.word + ". " + item.easyText + " 보호자 메모 보기"}
          >
            {/* 왼쪽 위: 시간과 그때 기분 */}
            <span className="self-start type-body font-medium text-white/80">{cardTime(item.time)}</span>
            <span className="mt-2 grid size-9 place-items-center self-start rounded-full bg-white">
              <MoodFace mood={item.mood} className="size-6" />
            </span>
            <PictogramIcon name={item.pictogram} className="my-auto size-32 text-white" />
            {/* 큰 제목(한 단어)과 이용자에게 읽어 주는 문장 */}
            <span className="text-[2.5rem] font-bold leading-tight">{item.word}</span>
            <span className="mt-1.5 break-keep type-input text-white/90">{item.easyText}</span>
          </button>
          {/* 오른쪽 위 모서리 탭: 소리로 듣기 */}
          {onListen ? (
            <button
              type="button"
              onClick={onListen}
              aria-label="소리로 듣기"
              data-peek-hide
              className="absolute right-0 top-0 grid size-16 place-items-center rounded-bl-[24px] bg-black/20 transition-colors hover:bg-black/30"
            >
              <Volume2 className="size-6" aria-hidden />
            </button>
          ) : null}
        </div>

        {/* 뒷면: 아무 데나 누르면 다시 앞면으로 */}
        <div
          role="button"
          tabIndex={flipped ? 0 : -1}
          aria-label="그림 카드로 돌아가기"
          onClick={onFlip}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onFlip();
            }
          }}
          className="absolute inset-0 flex rotate-y-180 cursor-pointer flex-col overflow-y-auto rounded-[28px] border border-border bg-card p-5 text-left backface-hidden"
          aria-hidden={!flipped}
        >
          <p className="type-caption font-bold text-primary">보호자님께</p>
          <h2 className="mt-1 type-title">
            {cardTime(item.time)} · {item.activity}
          </h2>
          <p className="mt-3 type-body-long">{item.guardianText}</p>
          {needsCall ? (
            <p className="mt-4 flex items-start gap-2 rounded-control bg-behavior-soft px-4 py-3 type-body-long text-behavior">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
              오늘 있었던 일은 선생님이 전화로 따로 연락드릴게요.
            </p>
          ) : null}
          {item.homeTip ? (
            <div className="mt-4 rounded-control bg-warning-soft px-4 py-3">
              <p className="type-caption font-bold text-warning-foreground">
                집에서 해 보세요
              </p>
              <p className="mt-1 type-body-long">{item.homeTip}</p>
            </div>
          ) : null}
          <p className="mt-auto pt-5 type-caption text-muted-foreground">
            담당 선생님이 확인하고 보낸 메모예요
          </p>
        </div>
      </div>
    </div>
  );
}

/** 마지막 장: 이용자가 오늘 제일 좋았던 활동을 고른다. 고른 결과는 다음 날 담당자 화면에 전한다 */
function PickCard({
  card,
  initial,
  onPick,
}: {
  card: CardContent;
  initial?: CardPick;
  onPick?: (input: CardPickInput) => void;
}) {
  const [picked, setPicked] = useState<string | null>(initial?.itemId ?? null);
  const [how, setHow] = useState<PickHow | null>(initial?.how ?? null);
  const [skipped, setSkipped] = useState(initial?.skipped ?? false);

  return (
    <div className="aspect-[3/4.8] w-full overflow-y-auto rounded-[28px] border border-border bg-card px-4 pb-3 pt-3">
      <div
        data-peek-hide
        className="flex min-h-full flex-col transition-opacity"
      >
        <div className="rounded-control bg-muted px-3 py-2">
          <p className="type-caption font-bold text-primary">오늘의 한마디</p>
          <p className="mt-0.5 type-body">{card.summary}</p>
        </div>
        <h2 className="mt-3 text-center type-title">오늘 제일 좋았던 건?</h2>
        <p className="mt-1 text-center type-caption text-muted-foreground">
          {card.nickname}님이 가리키거나
          <br />
          반응한 그림을 눌러 주세요
        </p>

        {/* 고른 그림은 배경색으로 표시한다. 한 번 더 누르면 고르기를 취소한다 */}
        <div
          role="group"
          aria-label="오늘 제일 좋았던 활동"
          className="mt-4 grid grid-cols-3 gap-2"
        >
          {card.items.map((item) => {
            const selected = picked === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setSkipped(false);
                  if (selected) {
                    setPicked(null);
                    setHow(null);
                  } else {
                    setPicked(item.id);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-card border-2 px-1 py-2.5 transition-colors",
                  selected
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-muted",
                )}
              >
                <PictogramIcon
                  name={item.pictogram}
                  className="size-10 text-primary"
                />
                <span className="type-heading">{item.word}</span>
              </button>
            );
          })}
        </div>

        {picked ? (
          <div className="mt-4">
            <p className="text-center type-heading">어떻게 골랐나요?</p>
            <div
              role="radiogroup"
              aria-label="고른 방법"
              className="mt-2 grid grid-cols-2 gap-2"
            >
              {(
                [
                  ["pointed", card.nickname + "님이\n직접 가리켰어요"],
                  ["observed", "제가 보기에\n좋아했어요"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={how === value}
                  onClick={() => {
                    setHow(value);
                    // 고른 활동과 고른 방법이 모두 정해지면 저장한다
                    if (picked) onPick?.({ itemId: picked, how: value, skipped: false });
                  }}
                  className={cn(
                    "min-h-14 whitespace-pre-line rounded-control border-2 px-2 py-2 type-body font-medium transition-colors",
                    how === value
                      ? "border-primary bg-accent"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {how ? (
              <p className="mt-3 flex items-center justify-center gap-1.5 type-body text-primary">
                <Check className="size-4" aria-hidden />
                내일 선생님께 전할게요
              </p>
            ) : null}
          </div>
        ) : skipped ? (
          <p className="mt-auto text-center type-body text-muted-foreground">
            괜찮아요. 내일 다시 물어봐 주세요.
          </p>
        ) : (
          <Button
            variant="ghost"
            className="mx-auto mt-auto underline underline-offset-4"
            onClick={() => {
              setSkipped(true);
              onPick?.({ skipped: true });
            }}
          >
            오늘은 고르지 않았어요
          </Button>
        )}
      </div>
    </div>
  );
}
