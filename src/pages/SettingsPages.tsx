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
import { DemoNote } from "@/components/common/states";
import { errorMessage } from "@/api/errors";
import { useChangePassword } from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { IS_MOCK } from "@/config";

/** 비밀번호 변경 (FR-83). mock 모드에서는 실제로 변경하지 않는다 */
export function PasswordPage() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();
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
    setError(null);
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          // mock 모드에서는 실제 계정 변경이라고 주장하지 않는다 (지시서 4.5)
          toast.success(IS_MOCK ? "시연용 안내입니다." : "비밀번호를 변경했어요.", {
            description: IS_MOCK
              ? "실제 비밀번호는 변경되지 않았습니다. 운영 환경에서는 서버 검증 후 처리합니다."
              : undefined,
          });
          navigate("/mypage");
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
                비밀번호 규칙은 아직 정하지 않았어요. 운영 환경에서 서버 정책을 따릅니다.
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

        <DemoNote>
          샘플 폼입니다. 실제 비밀번호를 변경하지 않고, 입력값을 저장하거나 전송하지도 않습니다.
        </DemoNote>
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
                    ? "국장 (U4 미확정 예시)"
                    : "담당 직원"
              }
            />
          </dl>
        </FormSection>

        <DemoNote>
          프로필 상세 화면의 구성과 수정 가능 항목은 미확정 사항입니다(FR-73, FR-74). 팀장·국장의
          구체적인 역할과 접근 권한도 복지관 측과 추가 협의 후 확정됩니다.
        </DemoNote>
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
