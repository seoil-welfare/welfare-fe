import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { useToday } from "@/lib/today";
import { addDays } from "@/lib/utils";
import { UserChecklist, type ExportMeta } from "@/pages/export/shared";
import type { ServiceUser } from "@/types";

/**
 * 엑셀 내보내기. 대상·기간 선택과 진행 피드백만 보여 주고, 파일은 아직 만들지 않는다 (U5 미확정).
 */
export function ExcelExportForm({ meta, users }: { meta: ExportMeta; users: ServiceUser[] }) {
  const navigate = useNavigate();
  const today = useToday();

  const [selectedUsers, setSelectedUsers] = useState<string[]>(users.map((u) => u.id));
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function run() {
    if (running) return; // 중복 클릭 방지 (가이드 7장 파일 출력 피드백)
    setRunning(true);
    setDone(false);
    window.setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, 900);
  }

  return (
    <AppShell
      header={<AppHeader title={meta.title} backTo="/mypage" />}
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button variant="outline" block onClick={() => navigate("/mypage")}>
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
          <p className="type-body-long text-muted-foreground break-keep">{meta.description}</p>
        </FormSection>

        <UserChecklist users={users} selected={selectedUsers} onChange={setSelectedUsers} />

        <FormSection title="조회 기간">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field className="flex-1">
              <FieldLabel htmlFor="export-from">시작일</FieldLabel>
              <Input
                id="export-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor="export-to">종료일</FieldLabel>
              <Input
                id="export-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </Field>
          </div>
        </FormSection>

        {done ? (
          <Alert tone="warning" title="출력 기능은 준비 중이에요">
            <p className="mt-1 break-keep">
              대상 {selectedUsers.length}명 · {from} ~ {to} 범위를 선택했어요.
            </p>
          </Alert>
        ) : null}
      </div>
    </AppShell>
  );
}
