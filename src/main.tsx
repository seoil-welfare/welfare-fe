import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { configureHttp } from "@/api/http/client";
import { createQueryClient, queryKeys } from "@/api/queries";
import { DraftProvider } from "@/app/DraftContext";
import { markSignedOut, type SignedOutReason } from "@/app/sessionExpired";
import { DemoProvider } from "@/demo/DemoContext";
import { AppRoutes } from "@/app/router";
import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

const queryClient = createQueryClient();

// 하단 버튼 바(위아래 여백 12 + 버튼 48 + 테두리 1) 위로 12px 띄운다
const TOAST_BOTTOM = "calc(85px + env(safe-area-inset-bottom, 0px))";

// 세션이 만료되거나 계정이 사용 중지되면 로그인 상태를 비운다. RequireAuth가 로그인 화면으로 보낸다.
// 로그인해 있던 중이었을 때만 이유를 표시해서 로그인 화면에 알맞은 안내 팝업을 띄운다.
function signOut(reason: SignedOutReason) {
  if (queryClient.getQueryData(queryKeys.me)) markSignedOut(reason);
  queryClient.setQueryData(queryKeys.me, null);
}

configureHttp({
  onUnauthorized: () => signOut("expired"),
  onAccountDisabled: () => signOut("disabled"),
});

// PWA: 새 버전을 배포하면 바로 바꾸지 않고 안내를 띄운다. 일지를 쓰던 중에 새로고침되면 입력이 사라질 수 있어서다
const updateApp = registerSW({
  onNeedRefresh() {
    toast("새 버전이 있어요.", {
      duration: Infinity,
      action: { label: "새로고침", onClick: () => void updateApp(true) },
    });
  },
});

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DraftProvider>
        <DemoProvider>
          <BrowserRouter>
            <AppRoutes />
            {/*
              저장 피드백: 성공은 짧게, 실패는 재시도와 함께 (가이드 6장).
              누른 버튼 가까이 보이게 화면 아래, 하단 버튼 바(약 73px + 홈 막대) 바로 위에 띄운다
            */}
            <Toaster
              position="bottom-center"
              richColors
              closeButton
              offset={{ bottom: TOAST_BOTTOM }}
              mobileOffset={{ bottom: TOAST_BOTTOM }}
            />
          </BrowserRouter>
        </DemoProvider>
      </DraftProvider>
    </QueryClientProvider>
  </StrictMode>,
);
