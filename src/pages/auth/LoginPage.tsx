import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { errorMessage, isApiError } from "@/api/errors";
import { MOCK_PASSWORD } from "@/api/mock/mockApi";
import { useLogin } from "@/api/queries";
import { clearSignedOut, signedOutReason, type SignedOutReason } from "@/app/sessionExpired";
import { IS_MOCK } from "@/config";
import { DemoPanel } from "@/demo/DemoPanel";
import { AuthLayout, PillField, authButtonClass, pillInputClass } from "@/components/auth/AuthLayout";

/**
 * 로그인 (FR-01~FR-03).
 * 입력 오류(형식)와 인증 실패(일치하지 않음)의 문구를 구분한다 (가이드 9장 15번).
 * 가운데 로고와 앱 이름, 아이콘이 붙은 둥근 입력칸, 둥근 로그인 버튼 순으로 둔다.
 * mock 모드에서는 demo.staff1 계정이 미리 입력되어 있다. 다른 데모 계정은 직접 입력한다.
 */
const SIGNED_OUT_NOTICE: Record<SignedOutReason, { title: string; description: string }> = {
  expired: {
    title: "로그인이 만료됐어요",
    description: "한동안 사용하지 않아 자동으로 로그아웃됐어요. 다시 로그인해 주세요.",
  },
  disabled: {
    title: "사용이 중지된 계정이에요",
    description: "팀장이나 국장이 이 계정을 사용 중지해서 로그아웃됐어요. 계속 쓰려면 팀장이나 국장에게 문의해 주세요.",
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const [loginId, setLoginId] = useState(IS_MOCK ? "demo.staff1" : "");
  const [password, setPassword] = useState(IS_MOCK ? MOCK_PASSWORD : "");
  const [showPassword, setShowPassword] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  // 쓰던 중 세션이 만료되거나 계정이 사용 중지되어 이 화면으로 왔으면 이유에 맞는 안내 팝업을 띄운다
  const [signedOut, setSignedOut] = useState(signedOutReason);
  const submitting = loginMutation.isPending;

  function handleSignedOutOpenChange(open: boolean) {
    if (open) return;
    setSignedOut(null);
    clearSignedOut();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return; // 중복 제출 차단 (가이드 8장)
    setAuthError(null);

    // 형식 검사
    if (loginId.trim().length === 0) {
      setIdError("아이디를 입력해 주세요.");
      return;
    }
    setIdError(null);

    // 로그인 성공 전에 이동하지 않는다
    loginMutation.mutate(
      { loginId: loginId.trim(), password, autoLogin },
      {
        onSuccess: () => navigate("/home", { replace: true }),
        onError: (error) =>
          setAuthError(
            isApiError(error) && error.status === 401
              ? error.message || "아이디 또는 비밀번호가 일치하지 않아요."
              : errorMessage(error, "로그인하지 못했어요. 잠시 후 다시 시도해 주세요."),
          ),
      },
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {IS_MOCK ? <DemoPanel /> : null}
      <AuthLayout title="케어로그" description="담당자 계정으로 로그인해 주세요.">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-3">
          <div>
            <PillField invalid={Boolean(idError)} icon={<User aria-hidden />}>
              <label htmlFor="login-id" className="sr-only">
                아이디
              </label>
              <input
                id="login-id"
                autoComplete="username"
                placeholder="아이디"
                value={loginId}
                aria-invalid={idError ? true : undefined}
                aria-describedby={idError ? "login-id-error" : undefined}
                onChange={(event) => setLoginId(event.target.value)}
                onBlur={() => {
                  // 입력 중에는 오류를 띄우지 않고 blur와 제출 때 검사한다 (가이드 9장 8번)
                  setIdError(loginId.trim() ? null : "아이디를 입력해 주세요.");
                }}
                className={pillInputClass}
              />
            </PillField>
            <FieldError id="login-id-error" className="px-5 md:px-1">
              {idError}
            </FieldError>
          </div>

          <div>
            <PillField invalid={Boolean(authError)} icon={<LockKeyhole aria-hidden />}>
              <label htmlFor="login-password" className="sr-only">
                비밀번호
              </label>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="비밀번호"
                value={password}
                aria-describedby={authError ? "login-auth-error" : undefined}
                onChange={(event) => setPassword(event.target.value)}
                className={pillInputClass}
              />
              <Button
                // type="button"이므로 폼을 제출하지 않는다 (가이드 9장 15번)
                variant="ghost"
                size="icon"
                className="-mr-3 shrink-0 rounded-full text-muted-foreground"
                aria-pressed={showPassword}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </Button>
            </PillField>
            <FieldError id="login-auth-error" className="px-5 md:px-1">
              {authError}
            </FieldError>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-2 self-start px-2">
            <Checkbox
              checked={autoLogin}
              onCheckedChange={(value) => setAutoLogin(value === true)}
              id="auto-login"
            />
            <span className="type-body text-muted-foreground">자동 로그인</span>
          </label>

          <Button
            type="submit"
            size="lg"
            block
            disabled={submitting}
            className={authButtonClass}
          >
            {submitting ? <Spinner label="로그인 중…" /> : "로그인"}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-0.5 md:mt-6 md:flex-row md:justify-center md:gap-1">
          <span className="type-caption text-muted-foreground">비밀번호를 잊으셨나요?</span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="dense" className="font-bold text-primary">
                재설정 안내
              </Button>
            </DialogTrigger>
            <DialogContent
              title="비밀번호 재설정"
              description="비밀번호 재설정은 담당자에게 문의해 주세요."
            >
              <DialogClose asChild>
                <Button block>닫기</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={signedOut !== null} onOpenChange={handleSignedOutOpenChange}>
          <DialogContent
            title={SIGNED_OUT_NOTICE[signedOut ?? "expired"].title}
            description={SIGNED_OUT_NOTICE[signedOut ?? "expired"].description}
          >
            <DialogClose asChild>
              <Button block>닫기</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>

      </AuthLayout>
    </div>
  );
}
