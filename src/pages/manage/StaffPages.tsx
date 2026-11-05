import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PillToggle } from "@/components/ui/toggle-group";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { ListRowLink } from "@/components/common/ListRow";
import { QueryGate } from "@/components/common/QueryGate";
import { EmptyState } from "@/components/common/states";
import { errorMessage, isApiError } from "@/api/errors";
import { combineQueries, useCreateStaff, useStaffList } from "@/api/queries";
import type { CreatedStaff } from "@/api/types";
import { isStaffActive } from "@/services/diaryService";
import { matchesStaffQuery, sortStaff } from "@/services/staffService";
import { cn } from "@/lib/utils";
import { ROLE_POSITION, type Staff } from "@/types";

/**
 * 담당자 관리 목록 (2.1.13/FR-80, 명세서 SF-01) / 계정 추가 (FR-81, SF-02).
 * 목록은 보여 주기만 하고, 행을 누르면 담당자 상세(StaffDetailPage)로 간다.
 * 사용 중지·역할 변경·관리 권한 이양은 상세 화면에서 한다.
 * 회원가입은 없다. 계정은 팀장·국장이 여기서 만들고, 서버가 준 임시 비밀번호를 본인에게 전달한다.
 */

type StatusFilter = "all" | "active" | "disabled";

export function StaffPage() {
  const staffQuery = useStaffList();

  return (
    <AppShell
      header={<AppHeader title="담당자 관리" backTo="/mypage" />}
      width="form"
      bottom="action"
      bottomBar={
        <BottomActionBar>
          <Button block asChild>
            <Link to="/staff/new">
              <UserPlus aria-hidden />
              계정 추가
            </Link>
          </Button>
        </BottomActionBar>
      }
    >
      <QueryGate state={combineQueries([staffQuery])}>
        {() => <StaffList staff={staffQuery.data!} />}
      </QueryGate>
    </AppShell>
  );
}

function StaffList({ staff }: { staff: Staff[] }) {
  const [query, setQuery] = useState(""); // 이름·아이디 검색어
  const [filter, setFilter] = useState<StatusFilter>("all");
  const activeCount = staff.filter(isStaffActive).length;

  const visible = sortStaff(staff).filter(
    (member) =>
      matchesStaffQuery(member, query) &&
      (filter === "all" || (filter === "active") === isStaffActive(member)),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 px-1 pt-1">
        <h2 className="tnum type-title">담당자 {staff.length}명</h2>
        <p className="type-caption text-muted-foreground">계정과 역할을 관리할 수 있어요.</p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름 또는 계정 검색"
          aria-label="이름 또는 계정 검색"
          className="bg-card pl-10"
        />
      </div>

      <PillToggle
        label="계정 상태"
        value={filter}
        onValueChange={setFilter}
        options={[
          { value: "all", label: "전체 " + staff.length },
          { value: "active", label: "사용 중 " + activeCount },
          { value: "disabled", label: "중지 " + (staff.length - activeCount) },
        ]}
      />

      <Card variant="list">
        {visible.length === 0 ? (
          <EmptyState message={query.trim() ? "검색 결과가 없어요." : "해당하는 담당자가 없어요."} />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((member) => (
              <li key={member.id}>
                <StaffRow member={member} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StaffRow({ member }: { member: Staff }) {
  const active = isStaffActive(member);
  return (
    <ListRowLink
      to={"/staff/" + encodeURIComponent(member.id)}
      tall
      leading={<StaffAvatar name={member.name} active={active} />}
      title={
        <span className="inline-flex max-w-full items-center gap-1.5">
          <span className={cn("truncate", !active && "text-muted-foreground")}>{member.name}</span>
          {!active ? (
            <Badge variant="soft" tone="neutral" className="shrink-0">
              사용 중지
            </Badge>
          ) : null}
        </span>
      }
      subtitle={ROLE_POSITION[member.role] + " · " + member.loginId}
    />
  );
}

/** 이름 첫 글자. 목록은 둥근 사각형, 상세는 큰 원(size="lg") */
export function StaffAvatar({
  name,
  active,
  size = "md",
}: {
  name: string;
  active: boolean;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium",
        active ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground",
        size === "lg" ? "size-16 rounded-full type-title" : "size-10 rounded-control type-body",
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function StaffNewPage() {
  const navigate = useNavigate();
  const createStaff = useCreateStaff();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [department, setDepartment] = useState("주간활동지원팀");
  const [errors, setErrors] = useState<{ name?: string; loginId?: string }>({});
  // 방금 만든 계정. 임시 비밀번호는 이 응답에서만 받을 수 있어서 팝업으로 보여 준다
  const [created, setCreated] = useState<CreatedStaff | null>(null);

  function submit() {
    if (createStaff.isPending) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = "이름을 입력해 주세요.";
    if (!loginId.trim()) next.loginId = "아이디를 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    createStaff.mutate(
      {
        name: name.trim(),
        loginId: loginId.trim(),
        department,
        position: ROLE_POSITION.staff,
        role: "staff", // 계정 추가는 담당자로만. 팀장은 상세 화면의 역할 변경으로
      },
      {
        onSuccess: (result) => setCreated(result),
        onError: (error) => {
          // 아이디 중복(409)은 해당 입력란에 바로 알린다
          if (isApiError(error) && error.status === 409) {
            setErrors({ loginId: errorMessage(error) });
            return;
          }
          toast.error("계정을 추가하지 못했어요.", { description: errorMessage(error) });
        },
      },
    );
  }

  return (
    <AppShell
      header={<AppHeader title="계정 추가" backTo="/staff" />}
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button variant="outline" block onClick={() => navigate("/staff")}>
            취소
          </Button>
          <Button block onClick={submit} disabled={createStaff.isPending}>
            {createStaff.isPending ? "추가 중…" : "추가"}
          </Button>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection
          title="계정 정보"
          description="담당자 역할로 만들어져요. 팀장은 계정을 만든 뒤 담당자 상세에서 바꿀 수 있어요."
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="staff-name">이름</FieldLabel>
              <Input
                id="staff-name"
                value={name}
                aria-invalid={errors.name ? true : undefined}
                onChange={(event) => setName(event.target.value)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-login">아이디</FieldLabel>
              <Input
                id="staff-login"
                value={loginId}
                placeholder="예: hong.gildong"
                aria-invalid={errors.loginId ? true : undefined}
                onChange={(event) => setLoginId(event.target.value)}
              />
              <FieldError>{errors.loginId}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-dept">소속 팀</FieldLabel>
              <Input
                id="staff-dept"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              />
            </Field>
          </FieldGroup>
        </FormSection>
      </div>

      <CreatedAccountDialog
        account={created}
        onClose={() => navigate("/staff", { replace: true })}
      />
    </AppShell>
  );
}

/**
 * 계정 추가 완료 팝업. 아이디와 임시 비밀번호를 보여 주고 함께 복사할 수 있다.
 * 닫으면 비밀번호를 다시 볼 수 없으므로 바깥을 눌러 닫히지 않게 하고, 닫을 때 목록으로 간다.
 */
function CreatedAccountDialog({
  account,
  onClose,
}: {
  account: CreatedStaff | null;
  onClose: () => void;
}) {
  async function copy() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(
        "아이디: " + account.loginId + "\n임시 비밀번호: " + account.temporaryPassword,
      );
      toast.success("아이디와 임시 비밀번호를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 화면을 보고 직접 전달해 주세요.");
    }
  }

  return (
    <Dialog
      open={account !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        title="계정을 추가했어요"
        description="아이디와 임시 비밀번호를 본인에게 전달해 주세요. 이 창을 닫으면 임시 비밀번호를 다시 볼 수 없어요."
        onInteractOutside={(event) => event.preventDefault()}
      >
        {account ? (
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-3 rounded-control bg-secondary px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="type-body text-muted-foreground">아이디</dt>
                <dd className="type-body font-medium break-all">{account.loginId}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="type-body text-muted-foreground">임시 비밀번호</dt>
                <dd className="tnum type-heading tracking-wider select-all">
                  {account.temporaryPassword}
                </dd>
              </div>
            </dl>
            <p className="type-caption text-muted-foreground">
              처음 로그인한 뒤 마이페이지 › 비밀번호 변경에서 바꾸도록 안내해 주세요.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" block onClick={copy}>
                <Copy aria-hidden />
                복사하기
              </Button>
              <Button block onClick={onClose}>
                확인
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
