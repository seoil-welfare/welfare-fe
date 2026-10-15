import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { errorMessage, isApiError } from "@/api/errors";
import { MOCK_PASSWORD } from "@/api/mock/mockApi";
import { readDb } from "@/api/mock/mockDb";
import { useLogin } from "@/api/queries";
import { IS_MOCK } from "@/config";
import { DemoPanel } from "@/demo/DemoPanel";

/**
 * 로그인 (FR-01~FR-03).
 * 입력 오류(형식)와 인증 실패(일치하지 않음)의 문구를 구분한다 (가이드 9장 15번).
 * 배경은 로그인만 흰색이고 좌우 여백은 28px이다 (가이드 2-1, 4-1).
 * 데모 계정 목록과 기본 입력값은 mock 모드에서만 보인다.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const [loginId, setLoginId] = useState(IS_MOCK ? "demo.staff1" : "");
  const [password, setPassword] = useState(IS_MOCK ? MOCK_PASSWORD : "");
  const [showPassword, setShowPassword] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const submitting = loginMutation.isPending;

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
    <div className="flex min-h-dvh flex-col bg-card">
      {IS_MOCK ? <DemoPanel /> : null}
      <div className="mx-auto flex w-full max-w-120 flex-1 flex-col justify-center px-7 py-8">
        <div className="mb-7 flex flex-col gap-2">
          <span className="type-display text-primary">원광 일지</span>
          <p className="type-body text-muted-foreground">
            복지관 일지를 모바일에서 바로 작성해요.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-id">아이디</FieldLabel>
              <Input
                id="login-id"
                padding="login"
                autoComplete="username"
                value={loginId}
                aria-invalid={idError ? true : undefined}
                aria-describedby={idError ? "login-id-error" : undefined}
                onChange={(event) => setLoginId(event.target.value)}
                onBlur={() => {
                  // 입력 중에는 오류를 띄우지 않고 blur와 제출 때 검사한다 (가이드 9장 8번)
                  setIdError(loginId.trim() ? null : "아이디를 입력해 주세요.");
                }}
              />
              <FieldError id="login-id-error">{idError}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="login-password">비밀번호</FieldLabel>
              <div className="relative">
                <Input
                  id="login-password"
                  padding="login"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  className="pr-14"
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button
                  // type="button"이므로 폼을 제출하지 않는다 (가이드 9장 15번)
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </Button>
              </div>
              <FieldError id="login-auth-error">{authError}</FieldError>
            </Field>

            <label className="flex min-h-11 cursor-pointer items-center gap-2">
              <Checkbox
                checked={autoLogin}
                onCheckedChange={(value) => setAutoLogin(value === true)}
                id="auto-login"
              />
              <span className="type-body">자동 로그인</span>
            </label>

            <Button type="submit" size="lg" block disabled={submitting}>
              {submitting ? <Spinner label="로그인 중…" /> : "로그인"}
            </Button>
          </FieldGroup>
        </form>

        <div className="mt-4 flex justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="dense">
                비밀번호를 잊으셨나요?
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

        {IS_MOCK ? (
          <DemoAccounts
            onPick={(id) => {
              setLoginId(id);
              setPassword(MOCK_PASSWORD);
              setAuthError(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** DEMO_ONLY — mock 모드의 가상 직원 계정 목록. 운영 화면에는 계정 목록을 노출하지 않는다 */
function DemoAccounts({ onPick }: { onPick: (loginId: string) => void }) {
  const staff = readDb().staff;
  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="rounded-card border border-border p-3">
        <p className="mb-2 type-caption text-muted-foreground">계정 선택</p>
        <ul className="flex flex-col gap-1">
          {staff.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => onPick(member.loginId)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-control px-2 text-left type-body hover:bg-accent"
              >
                <span className="truncate">
                  {member.name} · {member.position}
                </span>
                <span className="shrink-0 type-caption text-muted-foreground">
                  {member.loginId}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
