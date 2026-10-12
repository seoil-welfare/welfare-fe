/**
 * 실행 환경 설정.
 * mock 모드는 브라우저 안의 가상 서버(src/api/mock)를 쓰고, http 모드는 실제 백엔드를 호출한다.
 * 검증 스크립트(esbuild → node)에서는 import.meta.env가 없으므로 빈 객체로 대체한다.
 */
const env: Partial<ImportMetaEnv> =
  (import.meta as { env?: Partial<ImportMetaEnv> }).env ?? {};

export type ApiMode = "mock" | "http";

export const API_MODE: ApiMode = env.VITE_API_MODE === "http" ? "http" : "mock";

export const IS_MOCK = API_MODE === "mock";

export const API_BASE_URL = (env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
