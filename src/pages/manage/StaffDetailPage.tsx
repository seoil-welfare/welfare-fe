import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { ListRowButton, ListRowStatic } from "@/components/common/ListRow";
import { QueryGate } from "@/components/common/QueryGate";
import { EmptyState } from "@/components/common/states";
import { errorMessage } from "@/api/errors";
import { combineQueries, useSetStaffActive, useStaffList } from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { isStaffActive } from "@/services/diaryService";
import { canChangeRole, canToggleActive, canTransferDirector } from "@/services/staffService";
import { StaffAvatar } from "@/pages/manage/StaffPages";
import { ROLE_POSITION, type Staff } from "@/types";

/**
 * 담당자 상세 (/staff/:staffId). 담당자 관리 목록에서 행을 누르면 온다.
 * 데이터는 GET /staff 목록 캐시에서 id로 찾는다 (상세 조회 API 없음).
 * 권한 관리(역할 변경·관리 권한 이양)와 계정 상태(사용 중지·다시 사용)는 보일 사람에게만 보인다.
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
  const active = isStaffActive(member);
  const showRole = canChangeRole(viewer, member);
  const showTransfer = canTransferDirector(viewer, member);
  const showToggle = canToggleActive(viewer, member);

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
            <ListRowStatic
              tall
              title="역할 변경"
              subtitle={"현재 역할 · " + ROLE_POSITION[member.role]}
              trailing={<PendingBadge />}
            />
          ) : null}
          {showRole && showTransfer ? <Separator /> : null}
          {showTransfer ? (
            <ListRowStatic
              tall
              title="관리 권한 이양"
              subtitle={member.name + " 님에게 국장 권한 넘기기"}
              trailing={<PendingBadge />}
            />
          ) : null}
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

// TODO(4단계): 역할 변경 바텀시트·이양 팝업을 붙이면 지운다
function PendingBadge() {
  return (
    <Badge variant="outline" tone="neutral">
      준비 중
    </Badge>
  );
}
