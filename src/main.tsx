import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { configureHttp } from "@/api/http/client";
import { createQueryClient, queryKeys } from "@/api/queries";
import { DraftProvider } from "@/app/DraftContext";
import { DemoProvider } from "@/demo/DemoContext";
import { AppRoutes } from "@/app/router";
import "@/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

const queryClient = createQueryClient();

// 세션이 만료되면 로그인 상태를 비운다. RequireAuth가 로그인 화면으로 보낸다.
configureHttp({ onUnauthorized: () => queryClient.setQueryData(queryKeys.me, null) });

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DraftProvider>
        <DemoProvider>
          <BrowserRouter>
            <AppRoutes />
            {/* 저장 피드백: 성공은 짧게, 실패는 재시도와 함께 (가이드 6장) */}
            <Toaster position="top-center" richColors closeButton />
          </BrowserRouter>
        </DemoProvider>
      </DraftProvider>
    </QueryClientProvider>
  </StrictMode>,
);
