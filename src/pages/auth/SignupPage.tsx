import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { ExpandSelect } from "@/components/common/ExpandSelect";
import { AuthLayout, authButtonClass } from "@/components/auth/AuthLayout";
import { errorMessage, isApiError } from "@/api/errors";
import { useSignup } from "@/api/queries";
import { useToday } from "@/lib/today";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

type FieldKey = "loginId" | "password" | "passwordConfirm" | "name" | "birthDate";

/** 칸에서 벗어났을 때 오류가 나면 그 칸으로 포커스를 옮긴다. 생년월일은 '년' 칸으로 */
const FOCUS_ID: Record<FieldKey, string> = {
  loginId: "signup-loginId",
  password: "signup-password",
  passwordConfirm: "signup-passwordConfirm",
  name: "signup-name",
  birthDate: "signup-birthYear",
};

/**
 * 회원가입.
 * 칸마다 위에 이름을 두는 배치다 (네이버 회원가입 참고).
 * 아이디·비밀번호·이름·생년월일(년은 직접 입력, 월·일은 선택)을 받는다.
 * 직위는 받지 않는다. 누구나 가입할 수 있어서 직위를 고르게 하면 아무나 팀장·국장이 된다.
 * 가입하면 항상 담당자(staff)이고, 팀장·국장 권한은 관리자가 따로 준다 (백엔드 AuthService.signup과 같음).
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
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const birthDate =
    birthYear.length === 4 && birthMonth && birthDay
      ? birthYear + "-" + birthMonth.padStart(2, "0") + "-" + birthDay.padStart(2, "0")
      : "";
  const values = { loginId, password, passwordConfirm, name, birthDate, birthYear, birthMonth, birthDay };

  // 고른 달의 날 수만큼 일을 보여 준다 (년을 모르면 2월은 29일까지)
  const dayCount = daysInMonth(birthYear.length === 4 ? Number(birthYear) : 2000, Number(birthMonth) || 1);
  const days = Array.from({ length: dayCount }, (_, i) => String(i + 1));

  function check(key: FieldKey): string | undefined {
    return validate(key, values, today);
  }

  /**
   * 고치기 시작한 칸의 오류는 바로 지운다. 다른 곳을 누르는 순간(포커스가 빠질 때) 오류 줄이 사라지면
   * 화면이 당겨져 누르려던 버튼에서 클릭이 빗나가기 때문이다. 여전히 틀렸으면 칸을 벗어날 때 다시 알린다.
   */
  function editing(key: FieldKey) {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /** 입력 중에는 오류를 띄우지 않고 칸을 벗어날 때 검사한다 (가이드 9장 8번) */
  function checkOnBlur(key: FieldKey) {
    let message = check(key);
    // 생년월일은 년·월·일 칸을 옮겨 다니는 중이라, 아직 비어 있는 칸은 '가입하기' 때만 알린다
    if (key === "birthDate" && (!birthYear || !birthMonth || !birthDay) && !(birthYear && birthYear.length !== 4)) {
      message = undefined;
    }
    setErrors((prev) => ({ ...prev, [key]: message }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (signup.isPending) return;
    const keys: FieldKey[] = ["loginId", "password", "passwordConfirm", "name", "birthDate"];
    const next = Object.fromEntries(keys.map((key) => [key, check(key)])) as Partial<Record<FieldKey, string>>;
    setErrors(next);
    const firstError = keys.find((key) => next[key]);
    if (firstError) {
      document.getElementById(FOCUS_ID[firstError])?.focus();
      return;
    }

    signup.mutate(
      { loginId: loginId.trim().toLowerCase(), password, name: name.trim(), birthDate },
      {
        onSuccess: (staff) => {
          toast.success("가입했어요. 로그인해 주세요.");
          navigate("/login", { replace: true, state: { loginId: staff.loginId } });
        },
        onError: (error) => {
          if (isApiError(error) && error.code === "DUPLICATE_LOGIN_ID") {
            setErrors((prev) => ({ ...prev, loginId: "이미 사용 중인 아이디예요." }));
            document.getElementById(FOCUS_ID.loginId)?.focus();
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
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <FieldBlock label="아이디" htmlFor={FOCUS_ID.loginId} error={errors.loginId}>
            <Box invalid={Boolean(errors.loginId)}>
              <input
                id={FOCUS_ID.loginId}
                autoComplete="username"
                value={loginId}
                onChange={(event) => {
                  setLoginId(event.target.value);
                  editing("loginId");
                }}
                onBlur={() => checkOnBlur("loginId")}
                {...fieldA11y(FOCUS_ID.loginId, errors.loginId)}
                className={inputClass}
              />
            </Box>
          </FieldBlock>

          <FieldBlock label="비밀번호" htmlFor={FOCUS_ID.password} error={errors.password}>
            <Box invalid={Boolean(errors.password)}>
              <input
                id={FOCUS_ID.password}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  editing("password");
                }}
                onBlur={() => checkOnBlur("password")}
                {...fieldA11y(FOCUS_ID.password, errors.password)}
                className={inputClass}
              />
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 shrink-0 text-muted-foreground"
                aria-pressed={showPassword}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </Button>
            </Box>
          </FieldBlock>

          <FieldBlock label="비밀번호 재확인" htmlFor={FOCUS_ID.passwordConfirm} error={errors.passwordConfirm}>
            <Box invalid={Boolean(errors.passwordConfirm)}>
              <input
                id={FOCUS_ID.passwordConfirm}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => {
                  setPasswordConfirm(event.target.value);
                  editing("passwordConfirm");
                }}
                onBlur={() => checkOnBlur("passwordConfirm")}
                {...fieldA11y(FOCUS_ID.passwordConfirm, errors.passwordConfirm)}
                className={inputClass}
              />
              <LockKeyhole
                aria-hidden
                className={cn(
                  "size-5 shrink-0",
                  passwordConfirm && passwordConfirm === password ? "text-primary" : "text-muted-foreground/60",
                )}
              />
            </Box>
          </FieldBlock>

          <FieldBlock label="이름" htmlFor={FOCUS_ID.name} error={errors.name}>
            <Box invalid={Boolean(errors.name)}>
              <input
                id={FOCUS_ID.name}
                autoComplete="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  editing("name");
                }}
                onBlur={() => checkOnBlur("name")}
                {...fieldA11y(FOCUS_ID.name, errors.name)}
                className={inputClass}
              />
            </Box>
          </FieldBlock>

          {/* 생년월일: 년은 직접 입력, 월·일은 선택 */}
          <fieldset className="border-0 p-0">
            <legend className="mb-1.5 type-body font-bold text-foreground">생년월일</legend>
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <Box invalid={Boolean(errors.birthDate)}>
                <input
                  id={FOCUS_ID.birthDate}
                  inputMode="numeric"
                  autoComplete="bday-year"
                  maxLength={4}
                  placeholder="연도(4자)"
                  aria-label="태어난 해 (4자리)"
                  value={birthYear}
                  onChange={(event) => {
                    setBirthYear(event.target.value.replace(/\D/g, "").slice(0, 4));
                    editing("birthDate");
                  }}
                  onBlur={() => checkOnBlur("birthDate")}
                  {...fieldA11y("signup-birthDate", errors.birthDate)}
                  className={cn(inputClass, "tnum")}
                />
              </Box>
              <SelectBox
                label="태어난 달"
                placeholder="월"
                value={birthMonth}
                options={MONTHS}
                suffix="월"
                invalid={Boolean(errors.birthDate)}
                onChange={(value) => {
                  setBirthMonth(value);
                  editing("birthDate");
                  // 고른 달에 없는 날이면 일을 비운다 (예: 31일 → 2월)
                  if (Number(birthDay) > daysInMonth(Number(birthYear) || 2000, Number(value))) setBirthDay("");
                }}
                onBlur={() => checkOnBlur("birthDate")}
              />
              <SelectBox
                label="태어난 날"
                placeholder="일"
                value={birthDay}
                options={days}
                suffix="일"
                invalid={Boolean(errors.birthDate)}
                onChange={(value) => {
                  setBirthDay(value);
                  editing("birthDate");
                }}
                onBlur={() => checkOnBlur("birthDate")}
              />
            </div>
            <FieldError id="signup-birthDate-error" className="px-1">
              {errors.birthDate}
            </FieldError>
          </fieldset>

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

const inputClass =
  "h-full min-w-0 flex-1 bg-transparent type-input text-foreground outline-none placeholder:text-muted-foreground/70";

/** 칸 위에 이름, 아래에 오류 */
function FieldBlock({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block type-body font-bold text-foreground">
        {label}
      </label>
      {children}
      <FieldError id={htmlFor + "-error"} className="px-1">
        {error}
      </FieldError>
    </div>
  );
}

/** 얇은 테두리의 흰 사각형 칸. 포커스는 남색 테두리, 오류는 빨간 테두리 (가이드 8장) */
function Box({ invalid, children }: { invalid?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        // min-w-0: 생년월일처럼 여러 칸을 한 줄에 놓을 때 칸이 글자 폭보다 줄어들 수 있게 한다
        "flex h-12 min-w-0 items-center gap-2 rounded-control border bg-card px-3.5 transition-shadow duration-150",
        invalid
          ? "border-destructive ring-1 ring-destructive"
          : "border-input/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
      )}
    >
      {children}
    </div>
  );
}

/**
 * 월·일 선택. 일지 작성의 시간 선택과 같은 ExpandSelect를 쓰고, 칸 모양만 회원가입 칸(Box)에 맞춘다.
 * 좁은 칸 셋이 한 줄에 있어 목록이 아래 내용을 밀면 줄이 출렁이므로, 목록을 위에 띄운다.
 */
function SelectBox({
  label,
  placeholder,
  value,
  options,
  suffix,
  invalid,
  onChange,
  onBlur,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: readonly string[];
  suffix: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <ExpandSelect
      overlay
      label={label}
      placeholder={placeholder}
      value={value}
      options={options.map((option) => ({ value: option, label: option + suffix }))}
      onChange={onChange}
      // 목록을 닫을 때가 칸을 벗어나는 때다
      onClose={onBlur}
      invalid={invalid}
      describedBy={invalid ? "signup-birthDate-error" : undefined}
      className="min-w-0"
      triggerClassName={cn(
        "border-input/50 bg-card px-3.5 transition-shadow duration-150",
        "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none",
        "aria-expanded:border-primary aria-expanded:ring-1 aria-expanded:ring-primary",
        "aria-[invalid=true]:border aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive",
      )}
    />
  );
}

/** 오류 문구를 화면 낭독기가 칸과 함께 읽게 연결한다 */
function fieldA11y(id: string, error?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? id + "-error" : undefined,
  } as const;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const LOGIN_ID_PATTERN = /^[a-z0-9._-]{4,50}$/;

/** 백엔드(AuthService.LOGIN_ID, PasswordPolicy)와 같은 규칙 */
function validate(
  key: FieldKey,
  v: Record<FieldKey | "birthYear" | "birthMonth" | "birthDay", string>,
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
    case "birthDate": {
      if (!v.birthYear && !v.birthMonth && !v.birthDay) return "생년월일을 입력해 주세요.";
      if (v.birthYear.length !== 4) return "태어난 해를 4자리로 입력해 주세요. (예: 1995)";
      const year = Number(v.birthYear);
      if (year < 1900 || year > Number(today.slice(0, 4))) return "태어난 해를 다시 확인해 주세요.";
      if (!v.birthMonth || !v.birthDay) return "태어난 달과 날을 골라 주세요.";
      return v.birthDate > today ? "오늘 이후 날짜는 고를 수 없어요." : undefined;
    }
  }
}
