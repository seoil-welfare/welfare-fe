import { useCallback, useEffect, useState } from "react";
import {
  Bus,
  ChefHat,
  Drum,
  Dumbbell,
  Footprints,
  Heart,
  Meh,
  Palette,
  Shirt,
  Smile,
  Sofa,
  Soup,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardMood, Pictogram } from "@/types/todayCard";

const PICTOGRAMS: Record<Pictogram, LucideIcon> = {
  music: Drum,
  meal: Soup,
  art: Palette,
  sports: Dumbbell,
  cooking: ChefHat,
  walk: Footprints,
  outing: Bus,
  daily: Shirt,
  favorite: Heart,
  rest: Sofa,
};

/** 정해진 그림 카드. 글자는 옆에 따로 보이므로 그림은 화면 낭독기에서 숨긴다 */
export function PictogramIcon({ name, className }: { name: Pictogram; className?: string }) {
  const Icon = PICTOGRAMS[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

const MOODS: Record<CardMood, { label: string; icon: LucideIcon; tone: string }> = {
  excited: { label: "신났어요", icon: Smile, tone: "text-brand-gold" },
  good: { label: "좋았어요", icon: Smile, tone: "text-brand-gold" },
  tired: { label: "조금 피곤했어요", icon: Meh, tone: "text-muted-foreground" },
};

export function MoodFace({ mood, className }: { mood: CardMood; className?: string }) {
  const { label, icon: Icon, tone } = MOODS[mood];
  return <Icon className={cn(tone, className)} strokeWidth={2} aria-label={label} role="img" />;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 2026-11-10 → 11월 10일 화요일 */
export function cardDate(date: string, withWeekday = true): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return m + "월 " + d + "일" + (withWeekday ? " " + weekday + "요일" : "");
}

/** 10:00 → 오전 10:00, 12:00 → 낮 12:00, 14:00 → 오후 2:00 */
export function cardTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const mm = String(m).padStart(2, "0");
  if (h < 12) return "오전 " + h + ":" + mm;
  if (h === 12) return "낮 12:" + mm;
  return "오후 " + (h - 12) + ":" + mm;
}

/**
 * 브라우저 음성 읽기(Web Speech API). 지원하지 않는 브라우저에서는 supported가 false다.
 * 새 문장을 읽기 전에 읽던 것을 멈춘다.
 */
export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  // 화면을 떠나면 읽던 소리를 멈춘다
  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop };
}
