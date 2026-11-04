import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { api } from "@/api";
import { downloadMonthlyRecord } from "@/lib/export/downloadMonthlyRecord";
import { useToday } from "@/lib/today";
import { monthRange } from "@/services/monthlyRecordService";
import { SOFT_BORDER, UserChecklist, type ExportMeta } from "@/pages/export/shared";
import type { ServiceUser } from "@/types";

/** 월간 기록 출력에서 고를 수 있는 연도 수 (올해부터 거슬러) */
const MONTHLY_YEAR_COUNT = 5;

/** 파일을 연달아 내려받을 때 사이에 두는 간격(ms). 너무 붙이면 브라우저가 뒤 파일을 막기 쉽다 */
const DOWNLOAD_GAP_MS = 600;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** 출력 결과: 내려받은 이용자, 그 달 일지가 없어 건너뛴 이용자, 실패한 이용자 */
interface MonthlyResult {
  label: string;
  saved: string[];
  empty: string[];
  failed: string[];
}

/**
 * 월간 기록 출력. 고른 이용자마다 그 달 작성 완료 일지로 월별활동일지 docx를 하나씩 만들어 연달아 내려받는다.
 * 백엔드 출력 API 없이 GET /diaries?userId&from&to&status=completed 로 받아 브라우저에서 만든다.
 * 그 달 일지가 없는 이용자는 파일을 만들지 않고 결과에 알린다.
 */
export function MonthlyRecordForm({ meta, users }: { meta: ExportMeta; users: ServiceUser[] }) {
  const navigate = useNavigate();
  const today = useToday();
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));

  const [selectedUsers, setSelectedUsers] = useState<string[]>(users.map((u) => u.id));
  // 작성월. 지난 달을 마감해 쓰는 일이 많아 지난 달로 시작한다 (1월이면 작년 12월)
  const [year, setYear] = useState(thisMonth === 1 ? thisYear - 1 : thisYear);
  const [month, setMonth] = useState(thisMonth === 1 ? 12 : thisMonth - 1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MonthlyResult>();

  // 올해를 고르면 이번 달 뒤는 고를 수 없다. 연도를 바꿔 고른 달이 미래가 되면 이번 달로 당긴다
  function changeYear(next: number) {
    setYear(next);
    if (next === thisYear && month > thisMonth) setMonth(thisMonth);
  }

  async function run() {
    if (running) return; // 중복 클릭 방지 (가이드 7장 파일 출력 피드백)
    setRunning(true);
    setResult(undefined);
    const targets = users.filter((u) => selectedUsers.includes(u.id)); // 목록 순서대로 내려받는다
    const { from, to } = monthRange(year, month);
    const next: MonthlyResult = { label: year + "년 " + month + "월", saved: [], empty: [], failed: [] };
    for (const user of targets) {
      try {
        const diaries = await api.diaries.list({ userId: user.id, from, to, status: "completed" });
        if (diaries.length === 0) {
          next.empty.push(user.name);
          continue;
        }
        if (next.saved.length > 0) await wait(DOWNLOAD_GAP_MS);
        await downloadMonthlyRecord(diaries, user, year, month);
        next.saved.push(user.name);
      } catch {
        next.failed.push(user.name);
      }
    }
    setResult(next);
    setRunning(false);
    if (next.saved.length > 0) toast.success("월간 기록 " + next.saved.length + "개를 내려받았어요.");
    else if (next.failed.length > 0) toast.error("월간 기록을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
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
          <Button block onClick={run} disabled={running || selectedUsers.length === 0}>
            {running ? <Spinner label="파일 만드는 중…" /> : "출력 시작"}
          </Button>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection title="출력 안내">
          <p className="type-body-long text-muted-foreground break-keep">
            고른 달의 작성 완료된 일지를 월별활동일지 양식으로 정리해 내려받아요. 이용자마다 파일(docx)이 하나씩
            만들어져요.
          </p>
        </FormSection>

        <UserChecklist users={users} selected={selectedUsers} onChange={setSelectedUsers} />

        <FormSection title="조회 기간">
          <div className="flex gap-3">
            <Field className="flex-1">
              <FieldLabel htmlFor="export-year">연도</FieldLabel>
              <Select value={String(year)} onValueChange={(value) => changeYear(Number(value))}>
                <SelectTrigger id="export-year" className={SOFT_BORDER}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MONTHLY_YEAR_COUNT }, (_, i) => thisYear - i).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor="export-month">월</FieldLabel>
              <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                <SelectTrigger id="export-month" className={SOFT_BORDER}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)} disabled={year === thisYear && m > thisMonth}>
                      {m}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FormSection>

        {result ? <MonthlyResultAlert result={result} /> : null}
      </div>
    </AppShell>
  );
}

function MonthlyResultAlert({ result }: { result: MonthlyResult }) {
  const { label, saved, empty, failed } = result;
  return (
    <Alert
      tone={failed.length > 0 ? "destructive" : "neutral"}
      title={saved.length > 0 ? label + " 월간 기록 " + saved.length + "개를 내려받았어요" : label + " 월간 기록을 만들지 않았어요"}
    >
      <ul className="mt-1 flex flex-col gap-1 break-keep">
        {saved.length > 0 ? <li>내려받음: {saved.join(", ")}</li> : null}
        {empty.length > 0 ? <li>{label} 일지가 없어 건너뜀: {empty.join(", ")}</li> : null}
        {failed.length > 0 ? <li>만들지 못함: {failed.join(", ")}</li> : null}
        {saved.length > 1 ? (
          <li className="text-muted-foreground">
            파일이 덜 받아졌다면 브라우저 주소창의 '여러 파일 다운로드' 허용을 확인한 뒤 다시 눌러 주세요.
          </li>
        ) : null}
      </ul>
    </Alert>
  );
}
