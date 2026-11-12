import { useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { EmptyState, LoadFailureState } from "@/components/common/states";
import { TodayCardView } from "@/components/todayCard/TodayCardView";
import { errorMessage, isApiError } from "@/api/errors";
import { useGuardianCard, usePickTodayCard, useVerifyGuardian } from "@/api/queries";

/**
 * 오늘 카드 (보호자가 휴대폰에서 링크로 여는 화면, 로그인 없음).
 * 처음 열면 이용자 생년월일 4자리로 보호자 확인을 한 번 거친다. 링크는 보낸 날부터 7일 동안 열린다.
 */
export function GuardianCardPage() {
  const { token = "" } = useParams();
  const cardQuery = useGuardianCard(token);
  const pick = usePickTodayCard(token);

  if (cardQuery.isPending) {
    return (
      <Centered>
        <Spinner label="카드를 불러오는 중…" />
      </Centered>
    );
  }

  if (cardQuery.isError) {
    const error = cardQuery.error;
    if (isApiError(error) && error.code === "CARD_VERIFY_REQUIRED") return <VerifyGuardian token={token} />;
    if (isApiError(error) && error.status === 410) {
      return (
        <Centered>
          <EmptyState message="링크 기간이 지났어요. 담당 선생님께 다시 보내 달라고 말씀해 주세요." />
        </Centered>
      );
    }
    if (isApiError(error) && error.status === 404) {
      return (
        <Centered>
          <EmptyState message="열 수 없는 링크예요. 받은 문자의 링크를 다시 눌러 주세요." />
        </Centered>
      );
    }
    return (
      <Centered>
        <LoadFailureState reason={errorMessage(error, "카드를 불러오지 못했어요.")} onRetry={() => void cardQuery.refetch()} />
      </Centered>
    );
  }

  return (
    <TodayCardView
      card={cardQuery.data}
      pick={cardQuery.data.pick}
      onPick={(input) =>
        pick.mutate(input, {
          onError: (error) => toast.error(errorMessage(error, "고른 것을 전하지 못했어요. 다시 눌러 주세요.")),
        })
      }
    />
  );
}

/** 보호자 확인: 이용자 생년월일 4자리 (예: 3월 7일 → 0307) */
function VerifyGuardian({ token }: { token: string }) {
  const verify = useVerifyGuardian(token);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}$/.test(value)) {
      setError("숫자 4자리로 입력해 주세요.");
      return;
    }
    setError(null);
    verify.mutate(value, { onError: (err) => setError(errorMessage(err, "확인하지 못했어요. 다시 입력해 주세요.")) });
  }

  return (
    <Centered>
      <form onSubmit={submit} noValidate className="w-full rounded-card border border-border bg-card p-5">
        <h1 className="type-title">보호자 확인</h1>
        <p className="mt-1 type-body text-muted-foreground">오늘 카드를 보려면 한 번만 확인해 주세요.</p>
        <Field className="mt-4">
          <FieldLabel htmlFor="guardian-birth">이용자 생일 4자리</FieldLabel>
          <Input
            id="guardian-birth"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="예: 0307"
            value={value}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
          />
          <FieldDescription>생일이 3월 7일이면 0307로 입력해요.</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
        <Button type="submit" block className="mt-4" disabled={verify.isPending}>
          {verify.isPending ? "확인 중…" : "확인"}
        </Button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="flex w-full max-w-110 justify-center">{children}</div>
    </div>
  );
}
