import { useDiaries } from "@/api/queries";
import { IS_MOCK } from "@/config";
import { useDemo } from "@/demo/DemoContext";
import { periodRange, trendPeriods } from "@/services/statsService";
import type { Diary, StatisticPeriod } from "@/types";

/**
 * 통계 화면이 쓰는 일지.
 * 선택한 이용자의 '작성 완료' 일지만, 추이 그래프 첫 구간부터 선택 기간 끝까지 받아 온다.
 * 이전 동기간(FR-34)은 추이 구간 안에 들어 있으므로 따로 부르지 않는다.
 * 집계는 statsService의 순수 함수가 한다. 서버 집계로 옮기면 이 훅만 바꾸면 된다.
 */
export function useStatsDiaries(userId: string, period: StatisticPeriod) {
  const { flags } = useDemo();
  const query = useDiaries(
    {
      userId,
      status: "completed",
      from: periodRange(trendPeriods(period)[0]).start,
      to: periodRange(period).end,
    },
    { enabled: Boolean(userId) },
  );
  // 관찰용 상태: 통계 0건 (mock 모드 전용)
  const diaries: Diary[] = IS_MOCK && flags.forceEmptyStats ? [] : (query.data ?? []);
  return { query, diaries };
}
