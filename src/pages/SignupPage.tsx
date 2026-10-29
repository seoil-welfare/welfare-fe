import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarDays, Eye, EyeOff, IdCard, LockKeyhole, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { SingleChoiceGroup } from "@/components/common/ChoiceGroup";
import { AuthLayout, PillField, authButtonClass, pillInputClass } from "@/components/auth/AuthLayout";
import { errorMessage, isApiError } from "@/api/errors";
import { useSignup } from "@/api/queries";
import { useToday } from "@/lib/today";
import { ROLE_POSITION, type UserRole } from "@/types";

/** 직위 선택지. 화면에는 직위 이름을, 저장에는 권한(role)을 쓴다 */
const ROLE_OPTIONS: readonly UserRole[] = ["staff", "teamLead", "director"];

type FieldKey = "loginId" | "password" | "passwordConfirm" | "name" | "birthDate";

/**
 * 회원가입.
 * 아이디·비밀번호·이름·생년월일과 직위(담당자·팀장·국장)를 받는다.
 * 아이디·비밀번호 규칙은 백엔드(AuthService, PasswordPolicy)와 같다. 가입만 하고 로그인은 따로 한다.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const today = useToday();
  const signup = useSignup();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const values = { loginId, password, passwordConfirm, name, birthDate };

  function check(key: FieldKey): string | undefined {
    return validate(key, values, today);
  }

  /** 입력 중에는 오류를 띄우지 않고 칸을 벗어날 때 검사한다 (가이드 9장 8번) */
  function checkOnBlur(key: FieldKey) {
    setErrors((prev) => ({ ...prev, [key]: check(key) }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (signup.isPending) return;
    const keys: FieldKey[] = ["loginId", "password", "passwordConfirm", "name", "birthDate"];
    const next = Object.fromEntries(keys.map((key) => [key, check(key)])) as Partial<Record<FieldKey, string>>;
    setErrors(next);
    const firstError = keys.find((key) => next[key]);
    if (firstError) {
      document.getElementById("signup-" + firstError)?.focus();
      return;
    }

    signup.mutate(
      { loginId: loginId.trim().toLowerCase(), password, name: name.trim(), birthDate, role },
      {
        onSuccess: (staff) => {
          toast.success("가입했어요. 로그인해 주세요.");
          navigate("/login", { replace: true, state: { loginId: staff.loginId } });
        },
        onError: (error) => {
          if (isApiError(error) && error.code === "DUPLICATE_LOGIN_ID") {
            setErrors((prev) => ({ ...prev, loginId: "이미 사용 중인 아이디예요." }));
            document.getElementById("signup-loginId")?.focus();
          } else if (isApiError(error) && error.code === "PASSWORD_POLICY") {
            setErrors((prev) => ({ ...prev, password: error.message }));
          } else {
            toast.error("가입하지 못했어요.", { description: errorMessage(error) });
          }
        },
      },
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AuthLayout title="회원가입" description="케어로그에서 쓸 계정을 만들어요." logoSize="small">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-3">
          <TextField
            id="signup-loginId"
            label="아이디"
            icon={<User aria-hidden />}
            autoComplete="username"
            placeholder="아이디"
            hint="영문 소문자·숫자와 . _ - 를 써서 4자 이상"
            value={loginId}
            onChange={setLoginId}
            onBlur={() => checkOnBlur("loginId")}
            error={errors.loginId}
          />

          <TextField
            id="signup-password"
            label="비밀번호"
            icon={<LockKeyhole aria-hidden />}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="비밀번호"
            hint="영문과 숫자를 섞어 8자 이상"
            value={password}
            onChange={setPassword}
            onBlur={() => checkOnBlur("password")}
            error={errors.password}
            trailing={
              <Button
                variant="ghost"
                size="icon"
                className="-mr-3 shrink-0 rounded-full text-muted-foreground"
                aria-pressed={showPassword}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </Button>
            }
          />

          <TextField
            id="signup-passwordConfirm"
            label="비밀번호 확인"
            icon={<LockKeyhole aria-hidden />}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            onBlur={() => checkOnBlur("passwordConfirm")}
            error={errors.passwordConfirm}
          />

          <TextField
            id="signup-name"
            label="이름"
            icon={<IdCard aria-hidden />}
            autoComplete="name"
            placeholder="이름"
            value={name}
            onChange={setName}
            onBlur={() => checkOnBlur("name")}
            error={errors.name}
          />

          <TextField
            id="signup-birthDate"
            label="생년월일"
            icon={<CalendarDays aria-hidden />}
            type="date"
            max={today}
            value={birthDate}
            onChange={setBirthDate}
            onBlur={() => checkOnBlur("birthDate")}
            error={errors.birthDate}
            // 날짜 칸은 값이 없을 때 브라우저 기본 형식(연-월-일)이 흐리게 보인다
            inputClassName={birthDate ? undefined : "text-muted-foreground/70"}
          />

          <div className="px-1 pt-1">
            <SingleChoiceGroup
              label="직위"
              options={ROLE_OPTIONS.map((r) => ROLE_POSITION[r])}
              value={ROLE_POSITION[role]}
              onChange={(label) => {
                const next = ROLE_OPTIONS.find((r) => ROLE_POSITION[r] === label);
                if (next) setRole(next);
              }}
            />
          </div>

          <Button type="submit" size="lg" block disabled={signup.isPending} className={authButtonClass}>
            {signup.isPending ? <Spinner label="가입하는 중…" /> : "가입하기"}
          </Button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1 type-caption text-muted-foreground">
          이미 계정이 있으신가요?
          <Button variant="ghost" size="dense" className="font-bold text-primary" asChild>
            <Link to="/login">로그인</Link>
          </Button>
        </p>
      </AuthLayout>
    </div>
  );
}

function TextField({
  id,
  label,
  icon,
  value,
  onChange,
  onBlur,
  error,
  hint,
  trailing,
  inputClassName,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  /** 규칙 안내. 오류가 없을 때만 칸 아래에 보인다 */
  hint?: string;
  trailing?: React.ReactNode;
  inputClassName?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  max?: string;
}) {
  const errorId = id + "-error";
  const hintId = id + "-hint";
  return (
    <div>
      <PillField invalid={Boolean(error)} icon={icon}>
        {/* 칸 안의 안내 글씨로 이름을 보여 주고, 화면 낭독기용 이름은 따로 둔다 */}
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={inputClassName ? pillInputClass + " " + inputClassName : pillInputClass}
          {...rest}
        />
        {trailing}
      </PillField>
      {error ? (
        <FieldError id={errorId} className="px-5 md:px-1">
          {error}
        </FieldError>
      ) : hint ? (
        <p id={hintId} className="mt-1 px-5 type-caption text-muted-foreground md:px-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const LOGIN_ID_PATTERN = /^[a-z0-9._-]{4,50}$/;

/** 백엔드(AuthService.LOGIN_ID, PasswordPolicy)와 같은 규칙 */
function validate(
  key: FieldKey,
  v: Record<FieldKey, string>,
  today: string,
): string | undefined {
  switch (key) {
    case "loginId": {
      const id = v.loginId.trim().toLowerCase();
      if (!id) return "아이디를 입력해 주세요.";
      if (!LOGIN_ID_PATTERN.test(id)) return "아이디는 영문 소문자·숫자와 . _ - 를 써서 4~50자로 정해 주세요.";
      return undefined;
    }
    case "password": {
      if (!v.password) return "비밀번호를 입력해 주세요.";
      if (/\s/.test(v.password)) return "비밀번호에는 공백을 넣을 수 없어요.";
      if (v.password.length < 8) return "비밀번호는 8자 이상이어야 해요.";
      if (!/[A-Za-z]/.test(v.password) || !/[0-9]/.test(v.password)) {
        return "비밀번호에 영문과 숫자를 모두 넣어 주세요.";
      }
      return undefined;
    }
    case "passwordConfirm":
      if (!v.passwordConfirm) return "비밀번호를 한 번 더 입력해 주세요.";
      return v.passwordConfirm === v.password ? undefined : "비밀번호가 서로 달라요.";
    case "name":
      if (!v.name.trim()) return "이름을 입력해 주세요.";
      return v.name.trim().length > 50 ? "이름이 너무 길어요." : undefined;
    case "birthDate":
      if (!v.birthDate) return "생년월일을 입력해 주세요.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.birthDate)) return "생년월일을 다시 확인해 주세요.";
      return v.birthDate > today ? "오늘 이후 날짜는 고를 수 없어요." : undefined;
  }
}
