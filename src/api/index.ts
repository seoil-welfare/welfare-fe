import { IS_MOCK } from "@/config";
import { httpApi } from "@/api/http/httpApi";
import { mockApi } from "@/api/mock/mockApi";
import type { Api } from "@/api/types";

/** 화면과 훅은 이 객체만 쓴다. 모드 전환은 VITE_API_MODE로 한다 */
export const api: Api = IS_MOCK ? mockApi : httpApi;
