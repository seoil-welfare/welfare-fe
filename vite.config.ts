import path from "node:path";
import { defineConfig, loadEnv, normalizePath, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Tailwind는 CSS를 만들 때 읽은 소스 파일을 감시 대상으로 등록한다(addWatchFile).
 * Windows에서는 이 경로가 역슬래시(C:\...)로 넘어와 Vite가 그 파일을 /@fs/C:\... 라는 다른 이름으로 등록한다.
 * 그러면 파일을 고칠 때 화면 갱신(HMR)이 어긋나 같은 모듈이 두 번 로드되고,
 * Context가 둘로 갈라져 "useStatsContext must be used inside StatsProvider" 같은 오류가 난다.
 * 등록할 때만 경로를 / 형식으로 바꿔 준다. Tailwind 동작은 그대로다.
 */
function tailwindWithNormalizedWatchFiles(): Plugin[] {
  return tailwindcss().map((plugin) => {
    const transform = plugin.transform;
    if (!transform) return plugin;
    const handler = typeof transform === "function" ? transform : transform.handler;
    const wrapped: typeof handler = function (this, ...args) {
      const context = new Proxy(this, {
        get(target, key) {
          if (key === "addWatchFile") {
            return (id: string) => target.addWatchFile(normalizePath(id));
          }
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      return handler.apply(context, args);
    };
    return {
      ...plugin,
      transform: typeof transform === "function" ? wrapped : { ...transform, handler: wrapped },
    };
  });
}

/**
 * PWA: 홈 화면에 추가해 앱처럼 쓰게 한다 (주소창 없는 화면, 앱 아이콘, 빠른 실행).
 * 서비스 워커는 화면 파일(JS·CSS·아이콘·양식)만 미리 저장한다.
 * /api 응답은 저장하지 않는다 — 이용자 개인정보·일지가 기기에 남지 않게 하고, 항상 서버의 최신 값을 보여 주기 위해서다.
 * 새 버전은 바로 바꾸지 않고 안내를 띄운다 (main.tsx). 일지를 쓰던 중에 화면이 새로고침되지 않게 하려는 것이다.
 */
const pwa = VitePWA({
  registerType: "prompt",
  includeAssets: ["icons/favicon-32.png", "icons/apple-touch-icon.png"],
  manifest: {
    name: "케어로그",
    short_name: "케어로그",
    description: "복지관 돌봄 일지 작성·인수인계",
    lang: "ko",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f3fa", // --background. 앱을 켤 때 잠깐 보이는 화면 색
    theme_color: "#ffffff", // 상단바(bg-card)와 같은 색이라 상태바와 이어져 보인다
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    // docx: 일일 기록지·월간 기록 양식. 출력도 미리 받아 둔 양식을 쓴다
    globPatterns: ["**/*.{js,css,html,png,svg,woff2,docx}"],
    // 앱 주소로 새로고침해도 index.html을 준다. /api는 서버로 그대로 보낸다
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        // 글꼴(Noto Sans KR)은 바뀌지 않으므로 한 번 받으면 기기에 두고 쓴다
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  // 개발 서버(npm run dev)는 /api 요청을 로컬 백엔드로 넘긴다
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";

  return {
    plugins: [react(), tailwindWithNormalizedWatchFiles(), pwa],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    // 일일 기록지 출력 라이브러리는 버튼을 누를 때만 import()로 불러와서, 개발 서버가 켜질 때 찾지 못한다.
    // 그러면 첫 클릭에 Vite가 패키지를 새로 변환하며 페이지를 통째로 새로고침한다. 미리 변환해 두게 한다
    optimizeDeps: { include: ["docxtemplater", "pizzip"] },
    server: {
      host: true,
      port: 5173,
      // /api 요청을 백엔드로 넘겨 CORS 없이 쿠키 세션을 쓸 수 있게 한다
      proxy: { "/api": { target: proxyTarget, changeOrigin: true } },
    },
  };
});
