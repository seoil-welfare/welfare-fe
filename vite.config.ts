import path from "node:path";
import { defineConfig, loadEnv, normalizePath, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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

// vite-plugin-pwa는 시연에 필수가 아니므로 도입하지 않았다 (지시서 0-4).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [react(), tailwindWithNormalizedWatchFiles()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    // 일일 기록지 출력 라이브러리는 버튼을 누를 때만 import()로 불러와서, 개발 서버가 켜질 때 찾지 못한다.
    // 그러면 첫 클릭에 Vite가 패키지를 새로 변환하며 페이지를 통째로 새로고침한다. 미리 변환해 두게 한다
    optimizeDeps: { include: ["docxtemplater", "pizzip"] },
    server: {
      host: true,
      port: 5173,
      // http 모드 개발 시 /api 요청을 백엔드로 넘겨 CORS 없이 쿠키 세션을 쓸 수 있게 한다
      proxy: proxyTarget ? { "/api": { target: proxyTarget, changeOrigin: true } } : undefined,
    },
  };
});
