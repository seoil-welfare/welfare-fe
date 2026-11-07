import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { errorMessage } from "@/api/errors";
import { useChangePassword } from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { PASSWORD_HINT, passwordError } from "@/services/accountValidation";
import { useDraft } from "@/app/DraftContext";

/** 비밀번호 변경 (FR-83) */
export function PasswordPage() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const { discardDraft } = useDraft();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (changePassword.isPending) return;
    if (!current || !next) {
      setError("현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (next !== confirm) {
      setError("새 비밀번호가 서로 달라요. 다시 입력해 주세요.");
      return;
    }
    const problem = passwordError(next);
    if (problem || next === current) {
      setError(problem ?? "지금 쓰는 비밀번호와 다르게 정해 주세요.");
      return;
    }
    setError(null);
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          discardDraft();
          toast.success("비밀번호를 변경했어요. 새 비밀번호로 다시 로그인해 주세요.");
          navigate("/login", { replace: true });
        },
        // 현재 비밀번호 불일치·규칙 위반 등 서버 안내를 그대로 보여 준다
        onError: (err) => setError(errorMessage(err, "비밀번호를 변경하지 못했어요.")),
      },
    );
  }

  return (
    <AppShell
      header={<AppHeader title="비밀번호 변경" backTo="/mypage" />}
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button variant="outline" block onClick={() => navigate("/mypage")}>
            취소
          </Button>
          <Button block onClick={submit} disabled={changePassword.isPending}>
            {changePassword.isPending ? "변경 중…" : "변경"}
          </Button>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection title="비밀번호">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pw-current">현재 비밀번호</FieldLabel>
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pw-next">새 비밀번호</FieldLabel>
              <Input
                id="pw-next"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
              <FieldDescription>
                {PASSWORD_HINT}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="pw-confirm">새 비밀번호 확인</FieldLabel>
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setConfirm(event.target.value)}
              />
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
        </FormSection>

      </div>
    </AppShell>
  );
}

/** 사용자 정보 상세 조회 (FR-74). 구성·수정 가능 항목은 미확정 */
export function ProfilePage() {
  const currentStaff = useCurrentStaff();

  return (
    <AppShell header={<AppHeader title="내 정보" backTo="/mypage" />} width="form">
      <div className="flex flex-col gap-3">
        <FormSection>
          <div className="flex items-center gap-3">
            <Avatar name={currentStaff?.name ?? "담당"} className="size-12 type-body" />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-heading">{currentStaff?.name ?? "담당자"}</span>
                {currentStaff?.position === "팀장" ? (
                  <Badge variant="soft" tone="primary">
                    팀장
                  </Badge>
                ) : null}
              </div>
              <span className="type-caption text-muted-foreground">
                {currentStaff?.department} · {currentStaff?.position}
              </span>
            </div>
          </div>
        </FormSection>

        <FormSection title="계정 정보">
          <dl className="flex flex-col gap-3">
            <Row label="아이디" value={currentStaff?.loginId ?? "–"} />
            <Row label="소속 팀" value={currentStaff?.department ?? "–"} />
            <Row label="직책" value={currentStaff?.position ?? "–"} />
            <Row
              label="권한"
              value={
                currentStaff?.role === "teamLead"
                  ? "팀장"
                  : currentStaff?.role === "director"
                    ? "국장"
                    : "담당 직원"
              }
            />
          </dl>
        </FormSection>

      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="type-body">{value}</dd>
    </div>
  );
}
