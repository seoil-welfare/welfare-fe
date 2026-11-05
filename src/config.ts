/**
 * 실행 환경 설정.
 * 화면은 항상 실제 백엔드를 호출한다.
 * 검증 스크립트(esbuild → node)에서는 import.meta.env가 없으므로 빈 객체로 대체한다.
 */
const env: Partial<ImportMetaEnv> =
  (import.meta as { env?: Partial<ImportMetaEnv> }).env ?? {};

export const API_BASE_URL = (env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
