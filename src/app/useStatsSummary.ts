import { useStatsSummary as useStatsSummaryQuery } from "@/api/queries";
import type { StatsSummary } from "@/api/types";
import { IS_MOCK } from "@/config";
import { useDemo } from "@/demo/DemoContext";
import { statsSummary } from "@/services/statsService";
import type { StatisticPeriod } from "@/types";

/**
 * 통계 화면이 쓰는 집계 (GET /stats/summary).
 * 선택한 이용자·기간의 작성 완료 일지를 서버가 세어 숫자만 준다.
 * 통계 메인과 상세 화면이 같은 응답을 함께 쓰므로 상세로 옮겨도 다시 부르지 않는다.
 * 불러오기 전에는 0건 집계를 돌려준다. 화면은 query 상태(QueryGate)로 로딩·오류를 가린다.
 */
export function useStatsSummary(userId: string, period: StatisticPeriod) {
  const { flags } = useDemo();
  const query = useStatsSummaryQuery({ userId, ...period });
  // 관찰용 상태: 통계 0건 (mock 모드 전용)
  const summary: StatsSummary =
    (IS_MOCK && flags.forceEmptyStats ? undefined : query.data) ?? statsSummary([], userId, period);
  return { query, summary };
}
