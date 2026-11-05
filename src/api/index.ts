import { httpApi } from "@/api/http/httpApi";
import type { Api } from "@/api/types";

/** 화면과 훅은 이 객체만 쓴다 */
export const api: Api = httpApi;
