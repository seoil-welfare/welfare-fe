import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { api } from "@/api";
import { downloadDiaryBundle } from "@/lib/export/downloadDailyRecord";
import { useToday } from "@/lib/today";
import { addDays } from "@/lib/utils";
import { bundleRangeError, reportDiaries } from "@/services/exportService";
import { SOFT_BORDER, type ExportMeta } from "@/pages/export/shared";
import type { ServiceUser, Staff } from "@/types";

/**
 * 일지 모아 출력. 이용자 한 명의 작성 완료 일지를 기간으로 받아 일일 기록지 docx 한 파일로 내려받는다.
 * 백엔드 출력 API 없이 GET /diaries?userId&from&to&status=completed 로 받아 브라우저에서 만든다.
 * 일지가 있는 날만 담는다 (없는 날은 건너뜀).
 */
export function DiaryBundleForm({ meta, users, staff }: { meta: ExportMeta; users: ServiceUser[]; staff: Staff[] }) {
  const navigate = useNavigate();
  const today = useToday();

  const [userId, setUserId] = useState(users[0]?.id ?? ""); // 출력할 이용자 한 명
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  const [running, setRunning] = useState(false);
  const [emptyRange, setEmptyRange] = useState<string>(); // 일지가 없었던 기간 안내

  const rangeError = bundleRangeError(from, to, today);
  const user = users.find((u) => u.id === userId);

  async function run() {
    if (running || rangeError || !user) return; // 중복 클릭 방지 (가이드 7장 파일 출력 피드백)
    setRunning(true);
    setEmptyRange(undefined);
    try {
      const diaries = reportDiaries(await api.diaries.list({ userId: user.id, from, to, status: "completed" }), user.id, from, to);
      if (diaries.length === 0) {
        setEmptyRange(user.name + " · " + from + " ~ " + to);
        return;
      }
      await downloadDiaryBundle(diaries, user, { from, to }, staff);
      toast.success("일지 " + diaries.length + "건을 한 파일로 내려받았어요.");
    } catch {
      toast.error("일지 모음 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell
      header={<AppHeader title={meta.title} backTo="/mypage" />}
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button variant="outline" block className={SOFT_BORDER} onClick={() => navigate("/mypage")}>
            닫기
          </Button>
          <Button block onClick={run} disabled={running || Boolean(rangeError) || !user}>
            {running ? <Spinner label="파일 만드는 중…" /> : "출력 시작"}
          </Button>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection title="출력 안내">
          <p className="type-body-long text-muted-foreground break-keep">
            고른 기간에 저장한 작성 완료 일지를 일별활동일지 양식으로 모아 한 파일(docx)로 내려받아요.
            날짜마다 활동 기록과 행동·특이사항을 담고, 일지가 없는 날은 건너뛰어요.
          </p>
        </FormSection>

        <FormSection title="대상 이용자">
          <Field>
            <FieldLabel htmlFor="bundle-user" className="sr-only">
              대상 이용자
            </FieldLabel>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="bundle-user" aria-label="대상 이용자" className={SOFT_BORDER}>
                <SelectValue placeholder="이용자를 골라 주세요" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>한 파일에 한 명의 일지만 담겨요.</FieldDescription>
          </Field>
        </FormSection>

        <FormSection title="조회 기간">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field className="flex-1">
              <FieldLabel htmlFor="bundle-from">시작일</FieldLabel>
              <Input
                id="bundle-from"
                type="date"
                className={SOFT_BORDER}
                value={from}
                max={to < today ? to : today}
                aria-invalid={rangeError ? true : undefined}
                onChange={(event) => setFrom(event.target.value)}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor="bundle-to">종료일</FieldLabel>
              <Input
                id="bundle-to"
                type="date"
                className={SOFT_BORDER}
                value={to}
                min={from}
                max={today}
                aria-invalid={rangeError ? true : undefined}
                onChange={(event) => setTo(event.target.value)}
              />
            </Field>
          </div>
          {rangeError ? (
            <FieldError className="mt-2">{rangeError}</FieldError>
          ) : (
            <FieldDescription className="mt-2">한 번에 3개월(92일)까지 출력할 수 있어요.</FieldDescription>
          )}
        </FormSection>

        {emptyRange ? (
          <Alert tone="neutral" title="이 기간에는 작성 완료된 일지가 없어요">
            <p className="mt-1 break-keep">{emptyRange}</p>
          </Alert>
        ) : null}
      </div>
    </AppShell>
  );
}
