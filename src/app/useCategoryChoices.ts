import { useMemo } from "react";
import { useCategories } from "@/api/queries";
import type { Categories } from "@/api/types";
import { defaultCategories } from "@/services/categoryService";

/**
 * 일지 작성 화면의 선택 항목. 서버 목록(GET /categories)을 쓴다.
 * 받기 전이나 실패했을 때는 catalog.ts 기본 목록으로 그려서 작성 화면이 막히지 않게 한다.
 */
export function useCategoryChoices(): Categories {
  const { data } = useCategories();
  return useMemo(() => data ?? defaultCategories(), [data]);
}
