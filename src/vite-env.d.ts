/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** API 기본 경로. 기본값 '/api' (개발 서버는 vite proxy로 넘긴다) */
  readonly VITE_API_BASE_URL?: string;
  /** 개발 서버 proxy 대상. 예: http://localhost:8080 */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
