import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { QueryGate } from "@/components/common/QueryGate";
import { combineQueries, useServiceUsers } from "@/api/queries";
import { useToday } from "@/lib/today";
import { activeServiceUsers } from "@/services/diaryService";
import { addDays } from "@/lib/utils";
import type { ServiceUser } from "@/types";

/**
 * 파일 출력 설정 (2.1.13/FR-77 ~ FR-79).
 * 대상·기간 선택과 진행 피드백은 보여 주되, 실제 문서가 생성됐다는 성공 메시지는 표시하지 않는다.
 * 출력 형식과 다운로드 흐름은 U5 미확정 사항이다 (지시서 4.5).
 */

const KIND_META: Record<string, { title: string; description: string }> = {
  diaries: {
    title: "일지 모아 출력",
    description: "선택한 기간의 일지를 모아 출력해요.",
  },
  monthly: {
    title: "월간 기록 출력",
    description: "복지관 양식에 맞춘 월간 기록을 출력해요.",
  },
  excel: {
    title: "엑셀 내보내기",
    description: "일지 관련 데이터를 표 형태로 내보내요.",
  },
};

export function ExportPage() {
  const { kind } = useParams();
  const meta = KIND_META[kind ?? ""] ?? KIND_META.diaries;
  const usersQuery = useServiceUsers();

  if (usersQuery.data) {
    // 불러온 이용자 전원을 기본 선택하려고 목록을 받은 뒤 마운트한다
    return <ExportForm meta={meta} users={activeServiceUsers(usersQuery.data)} byMonth={kind === "monthly"} />;
  }
  return (
    <AppShell header={<AppHeader title={meta.title} backTo="/mypage" />} width="form">
      <QueryGate state={combineQueries([usersQuery])}>{() => null}</QueryGate>
    </AppShell>
  );
}

/** 월간 기록 출력에서 고를 수 있는 연도 수 (올해부터 거슬러) */
const MONTHLY_YEAR_COUNT = 5;

function ExportForm({
  meta,
  users,
  byMonth,
}: {
  meta: (typeof KIND_META)[string];
  users: ServiceUser[];
  /** 월간 기록 출력: 조회 기간을 연도·월로 고른다 (월별활동일지 양식의 '작성월') */
  byMonth: boolean;
}) {
  const navigate = useNavigate();
  const today = useToday();
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));

  const [selectedUsers, setSelectedUsers] = useState<string[]>(users.map((u) => u.id));
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  // 월간 기록 작성월. 지난 달을 마감해 쓰는 일이 많아 지난 달로 시작한다 (1월이면 작년 12월)
  const [year, setYear] = useState(thisMonth === 1 ? thisYear - 1 : thisYear);
  const [month, setMonth] = useState(thisMonth === 1 ? 12 : thisMonth - 1);
  const periodLabel = byMonth ? year + "년 " + month + "월" : from + " ~ " + to;

  // 올해를 고르면 이번 달 뒤는 고를 수 없다. 연도를 바꿔 고른 달이 미래가 되면 이번 달로 당긴다
  function changeYear(next: number) {
    setYear(next);
    if (next === thisYear && month > thisMonth) setMonth(thisMonth);
  }
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

        <FormSection title="대상 이용자" description={selectedUsers.length + "명 선택됨"}>
          <ul className="flex flex-col gap-1">
            {users.map((user) => {
              const checked = selectedUsers.includes(user.id);
              return (
                <li key={user.id}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-1 hover:bg-accent">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        setSelectedUsers((prev) =>
                          value === true ? [...prev, user.id] : prev.filter((id) => id !== user.id),
                        )
                      }
                    />
                    <span className="type-body">{user.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FormSection>

        {byMonth ? (
          <FormSection title="조회 기간">
            <div className="flex gap-3">
              <Field className="flex-1">
                <FieldLabel htmlFor="export-year">연도</FieldLabel>
                <Select value={String(year)} onValueChange={(value) => changeYear(Number(value))}>
                  <SelectTrigger id="export-year">
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
                  <SelectTrigger id="export-month">
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
        ) : (
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
        )}

        {done ? (
          <Alert tone="warning" title="출력 기능은 준비 중이에요">
            <p className="mt-1 break-keep">
              대상 {selectedUsers.length}명 · {periodLabel} 범위를 선택했어요.
            </p>
          </Alert>
        ) : null}

      </div>
    </AppShell>
  );
}
