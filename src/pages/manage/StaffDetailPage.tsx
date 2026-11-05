import { useId, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent, SheetContent } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupIndicator, RadioGroupItem, Separator } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { ListRowButton } from "@/components/common/ListRow";
import { QueryGate } from "@/components/common/QueryGate";
import { EmptyState } from "@/components/common/states";
import { TemporaryPasswordDialog } from "@/components/staff/TemporaryPasswordDialog";
import { errorMessage } from "@/api/errors";
import {
  combineQueries,
  useChangeStaffRole,
  useResetStaffPassword,
  useSetStaffActive,
  useStaffList,
  useTransferDirector,
} from "@/api/queries";
import type { ChangeableRole, CreatedStaff, PreviousDirectorRole } from "@/api/types";
import { useCurrentStaff } from "@/app/auth";
import { isStaffActive } from "@/services/diaryService";
import {
  canChangeRole,
  canResetPassword,
  canToggleActive,
  canTransferDirector,
} from "@/services/staffService";
import { StaffAvatar } from "@/pages/manage/StaffPages";
import { cn } from "@/lib/utils";
import { ROLE_POSITION, type Staff } from "@/types";

/**
 * 담당자 상세 (/staff/:staffId). 담당자 관리 목록에서 행을 누르면 온다.
 * 데이터는 GET /staff 목록 캐시에서 id로 찾는다 (상세 조회 API 없음).
 * 권한 관리(역할 변경 바텀시트·관리 권한 이양 팝업), 비밀번호(임시 비밀번호 다시 발급),
 * 계정 상태(사용 중지·다시 사용)는 보일 사람에게만 보인다.
 * 보일지는 services/staffService, 실제 허용은 서버가 정한다.
 */
export function StaffDetailPage() {
  const { staffId } = useParams();
  const staffQuery = useStaffList();

  return (
    <AppShell header={<AppHeader title="담당자 상세" backTo="/staff" />} width="form">
      <QueryGate state={combineQueries([staffQuery])}>
        {() => {
          const member = staffQuery.data!.find((s) => s.id === staffId);
          return member ? <StaffDetail member={member} /> : <NotFound />;
        }}
      </QueryGate>
    </AppShell>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <Card variant="form">
      <EmptyState
        message="찾을 수 없는 담당자예요."
        action={<Button onClick={() => navigate("/staff")}>담당자 목록으로</Button>}
      />
    </Card>
  );
}

function StaffDetail({ member }: { member: Staff }) {
  const viewer = useCurrentStaff();
  const setActive = useSetStaffActive();
  const [confirmOpen, setConfirmOpen] = useState(false); // 사용 중지·다시 사용 확인 창
  const [roleOpen, setRoleOpen] = useState(false); // 역할 변경 바텀시트
  const [transferOpen, setTransferOpen] = useState(false); // 관리 권한 이양 팝업
  const resetPassword = useResetStaffPassword();
  const [resetOpen, setResetOpen] = useState(false); // 임시 비밀번호 발급 확인 창
  const [issued, setIssued] = useState<CreatedStaff | null>(null); // 방금 발급한 임시 비밀번호
  const active = isStaffActive(member);
  const showRole = canChangeRole(viewer, member);
  const showTransfer = canTransferDirector(viewer, member);
  const showToggle = canToggleActive(viewer, member);
  const showReset = canResetPassword(viewer, member);

  function confirmToggle() {
    const next = !active;
    setActive.mutate(
      { staffId: member.id, active: next },
      {
        onSuccess: (updated) =>
          toast.success(updated.name + " 님 계정을 " + (next ? "다시 사용하게 했어요." : "사용 중지했어요.")),
        onError: (error) => toast.error(errorMessage(error, "계정 상태를 바꾸지 못했어요.")),
      },
    );
  }

  function confirmReset() {
    resetPassword.mutate(member.id, {
      onSuccess: (result) => setIssued(result),
      onError: (error) => toast.error(errorMessage(error, "임시 비밀번호를 발급하지 못했어요.")),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Card variant="form" className="flex flex-col items-center gap-2 py-6 text-center">
        <StaffAvatar name={member.name} active={active} size="lg" />
        <p className="mt-1 type-title">{member.name}</p>
        <Badge variant="soft" tone={active ? "primary" : "neutral"}>
          {active ? "사용 중" : "사용 중지"}
        </Badge>
        <p className="type-caption text-muted-foreground">
          {member.department} · {member.loginId}
        </p>
      </Card>

      <Section title="계정 정보">
        <InfoRow label="이름" value={member.name} />
        <Separator />
        <InfoRow label="소속" value={member.department} />
      </Section>

      {showRole || showTransfer ? (
        <Section title="권한 관리">
          {showRole ? (
            <ListRowButton
              tall
              title="역할 변경"
              subtitle={"현재 역할 · " + ROLE_POSITION[member.role]}
              onClick={() => setRoleOpen(true)}
            />
          ) : null}
          {showRole && showTransfer ? <Separator /> : null}
          {showTransfer ? (
            <ListRowButton
              tall
              title="관리 권한 이양"
              subtitle={member.name + " 님에게 국장 권한 넘기기"}
              onClick={() => setTransferOpen(true)}
            />
          ) : null}
        </Section>
      ) : null}

      {showReset ? (
        <Section title="비밀번호">
          <ListRowButton
            tall
            title="임시 비밀번호 발급"
            subtitle="비밀번호를 잊었을 때 새로 만들어 알려 줘요."
            disabled={resetPassword.isPending}
            onClick={() => setResetOpen(true)}
          />
        </Section>
      ) : null}

      {showToggle ? (
        <Section title="계정 상태">
          <ListRowButton
            tall
            title={active ? "계정 사용 중지" : "계정 다시 사용"}
            subtitle={active ? "로그인과 서비스 이용을 제한해요." : "이 계정으로 다시 로그인할 수 있어요."}
            disabled={setActive.isPending}
            onClick={() => setConfirmOpen(true)}
          />
        </Section>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={member.name + " 님 계정을 " + (active ? "사용 중지할까요?" : "다시 사용할까요?")}
        description={
          active
            ? "이 계정으로 로그인할 수 없게 되고, 지금 로그인된 기기도 로그아웃돼요. 작성한 일지와 담당 이용자는 그대로 남으니 담당 직원을 바꿔 주세요."
            : "이 계정으로 다시 로그인할 수 있어요."
        }
        confirmLabel={active ? "사용 중지" : "다시 사용"}
        tone={active ? "destructive" : "default"}
        onConfirm={confirmToggle}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={member.name + " 님의 임시 비밀번호를 새로 발급할까요?"}
        description="지금 쓰는 비밀번호로는 더 이상 로그인할 수 없어요. 새 임시 비밀번호는 다음 창에서 한 번만 보여 줘요."
        confirmLabel="발급"
        tone="default"
        onConfirm={confirmReset}
      />
      <TemporaryPasswordDialog
        account={issued}
        title="임시 비밀번호를 발급했어요"
        onClose={() => setIssued(null)}
      />

      {showRole ? <RoleSheet member={member} open={roleOpen} onOpenChange={setRoleOpen} /> : null}
      {showTransfer ? (
        <TransferDialog member={member} open={transferOpen} onOpenChange={setTransferOpen} />
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 type-heading">{title}</h2>
      <Card variant="list">{children}</Card>
    </section>
  );
}

/** 왼쪽 항목 이름, 오른쪽 값 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
      <span className="shrink-0 type-body text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate type-body text-foreground">{value}</span>
    </div>
  );
}

const ROLE_OPTIONS: readonly Option<ChangeableRole>[] = [
  { value: "teamLead", label: "팀장", description: "담당자 관리와 일지 항목 관리를 할 수 있어요." },
  { value: "staff", label: "담당자", description: "일지 작성과 조회를 할 수 있어요." },
];

/** 역할 변경 바텀시트. 담당자와 팀장 중 고른다 (POST /staff/:id/role) */
function RoleSheet({
  member,
  open,
  onOpenChange,
}: {
  member: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changeRole = useChangeStaffRole();
  const current = member.role as ChangeableRole; // 국장은 이 시트를 열 수 없다 (canChangeRole)
  const [role, setRole] = useState<ChangeableRole>(current);

  function submit() {
    changeRole.mutate(
      { staffId: member.id, role },
      {
        onSuccess: (updated) => {
          toast.success(updated.name + " 님의 역할을 " + ROLE_POSITION[updated.role] + "(으)로 바꿨어요.");
          onOpenChange(false);
        },
        onError: (error) => toast.error(errorMessage(error, "역할을 바꾸지 못했어요.")),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRole(current); // 열 때마다 지금 역할에서 시작
        onOpenChange(next);
      }}
    >
      <SheetContent title="역할 변경">
        <p className="pb-3 type-body text-muted-foreground">{member.name} 님의 역할을 골라 주세요.</p>
        <OptionList label="역할" options={ROLE_OPTIONS} value={role} onChange={setRole} />
        <Button block className="mt-4" disabled={role === current || changeRole.isPending} onClick={submit}>
          {changeRole.isPending ? "바꾸는 중…" : "변경하기"}
        </Button>
      </SheetContent>
    </Dialog>
  );
}

const PREVIOUS_OPTIONS: readonly Option<PreviousDirectorRole>[] = [
  { value: "teamLead", label: "팀장으로 남기", description: "팀장 권한으로 계속 사용해요." },
  {
    value: "deactivate",
    label: "계정 사용 중지",
    description: "바로 로그아웃되고, 이 계정으로 다시 로그인할 수 없어요.",
  },
];

/** 관리 권한 이양 팝업. 넘긴 뒤 내 계정을 팀장으로 둘지 사용 중지할지 고른다 (POST /staff/:id/transfer-director) */
function TransferDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const transfer = useTransferDirector();
  const [previousRole, setPreviousRole] = useState<PreviousDirectorRole>("teamLead"); // 기본은 팀장

  function submit() {
    transfer.mutate(
      { staffId: member.id, previousRole },
      {
        onSuccess: ({ director, previous }) => {
          onOpenChange(false);
          if (previous.active === false) {
            toast.success("관리 권한을 넘기고 계정을 사용 중지했어요.");
            navigate("/login", { replace: true });
            return;
          }
          toast.success(director.name + " 님이 국장이 됐어요.");
          navigate("/staff", { replace: true });
        },
        onError: (error) => toast.error(errorMessage(error, "관리 권한을 넘기지 못했어요.")),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setPreviousRole("teamLead");
        onOpenChange(next);
      }}
    >
      <DialogContent
        title={member.name + " 님에게 관리 권한을 넘길까요?"}
        description={member.name + " 님이 국장이 돼요. 국장은 한 명이라 넘긴 뒤에는 새 국장만 다시 넘길 수 있어요."}
      >
        <p className="mb-2 type-body font-medium text-foreground">넘긴 뒤 내 계정</p>
        <OptionList
          label="넘긴 뒤 내 계정"
          options={PREVIOUS_OPTIONS}
          value={previousRole}
          onChange={setPreviousRole}
        />
        <div className="mt-6 flex gap-3">
          <Button variant="outline" block onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button variant="destructive" block disabled={transfer.isPending} onClick={submit}>
            {transfer.isPending ? "넘기는 중…" : "권한 넘기기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  description: string;
}

/** 설명이 붙은 단일 선택 목록 (바텀시트·팝업 공용) */
function OptionList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="flex flex-col gap-2"
    >
      {options.map((option) => (
        <label
          key={option.value}
          htmlFor={id + option.value}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-control border px-4 py-3 transition-colors duration-150",
            value === option.value ? "border-primary bg-accent" : "border-input bg-card hover:bg-accent",
          )}
        >
          <RadioGroupItem
            id={id + option.value}
            value={option.value}
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input data-[state=checked]:border-primary"
          >
            <RadioGroupIndicator className="size-2.5 rounded-full bg-primary" />
          </RadioGroupItem>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="type-body font-medium text-foreground">{option.label}</span>
            <span className="type-caption text-muted-foreground">{option.description}</span>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
