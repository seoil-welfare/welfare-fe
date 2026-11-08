import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/api/errors";
import { useChangePassword, useLogout } from "@/api/queries";
import { useDraft } from "@/app/DraftContext";
import { PASSWORD_HINT, passwordError } from "@/services/accountValidation";

/**
 * 첫 로그인(또는 임시 비밀번호 재발급 뒤) 비밀번호 변경 창.
 * 바깥 클릭·Esc·닫기 버튼으로 닫을 수 없다. 바꾸거나 로그아웃해야 한다.
 * 바꾸면 서버가 세션을 끊으므로 새 비밀번호로 다시 로그인하게 한다 (비밀번호 변경 화면과 같음).
 */
export function ForcePasswordChangeDialog() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const logout = useLogout();
  const { discardDraft } = useDraft();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = changePassword.isPending || logout.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!current || !next) {
      setError("임시 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (next !== confirm) {
      setError("새 비밀번호가 서로 달라요. 다시 입력해 주세요.");
      return;
    }
    const problem = passwordError(next);
    if (problem || next === current) {
      setError(problem ?? "임시 비밀번호와 다르게 정해 주세요.");
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
        onError: (err) => setError(errorMessage(err, "비밀번호를 변경하지 못했어요.")),
      },
    );
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSettled: () => {
        discardDraft();
        navigate("/login", { replace: true });
      },
    });
  }

  return (
    <Dialog open>
      <DialogContent
        title="비밀번호를 바꿔 주세요"
        description="임시 비밀번호로 로그인했어요. 앱을 쓰려면 먼저 내 비밀번호로 바꿔야 해요."
        closable={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="force-pw-current">임시 비밀번호</FieldLabel>
              <Input
                id="force-pw-current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="force-pw-next">새 비밀번호</FieldLabel>
              <Input
                id="force-pw-next"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
              <FieldDescription>{PASSWORD_HINT}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="force-pw-confirm">새 비밀번호 확인</FieldLabel>
              <Input
                id="force-pw-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setConfirm(event.target.value)}
              />
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
          <div className="mt-5 flex gap-2">
            <Button type="button" variant="outline" block disabled={busy} onClick={handleLogout}>
              로그아웃
            </Button>
            <Button type="submit" block disabled={busy}>
              {changePassword.isPending ? "변경 중…" : "변경"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
