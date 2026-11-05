/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** 'mock'(기본) — 브라우저 안의 가상 서버 / 'http' — 실제 백엔드 */
  readonly VITE_API_MODE?: "mock" | "http";
  /** http 모드의 API 기본 경로. 기본값 '/api' (개발 서버는 vite proxy로 넘긴다) */
  readonly VITE_API_BASE_URL?: string;
  /** 개발 서버 proxy 대상. 예: http://localhost:8080 */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
