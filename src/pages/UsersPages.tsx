import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { ListRowLink } from "@/components/common/ListRow";
import { EmptyState } from "@/components/common/states";
import { QueryGate } from "@/components/common/QueryGate";
import { errorMessage } from "@/api/errors";
import {
  combineQueries,
  useCloseServiceUser,
  useCreateServiceUser,
  useServiceUsers,
  useStaffList,
  useUpdateServiceUser,
} from "@/api/queries";
import { activeServiceUsers, findStaff } from "@/services/diaryService";
import type { ServiceUser, Staff } from "@/types";

/**
 * 이용자 목록 / 등록 / 정보 수정 (2.1.14/FR-86 ~ FR-92).
 * 이름·생년월일은 필수 입력이다. 생년월일 형식은 U6 권장안인 YYYY-MM-DD를 쓴다.
 * 종결은 삭제가 아니다. 활성 목록에서 숨기고 과거 일지는 보존한다 (FR-91).
 */

export function UsersPage() {
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();

  return (
    <AppShell header={<AppHeader title="이용자 목록" backTo="/mypage" />} width="form">
      <QueryGate state={combineQueries([usersQuery, staffQuery])}>
        {() => <UsersList serviceUsers={usersQuery.data!} staff={staffQuery.data!} />}
      </QueryGate>
    </AppShell>
  );
}

function UsersList({ serviceUsers, staff }: { serviceUsers: ServiceUser[]; staff: Staff[] }) {
  const users = activeServiceUsers(serviceUsers);
  const closed = serviceUsers.filter((u) => u.status === "closed");

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 tnum type-caption text-muted-foreground">
        현재 이용 중 {users.length}명
      </p>

      <Card variant="list">
        {users.length === 0 ? (
          <EmptyState message="등록된 이용자가 없어요." />
        ) : (
          <ul className="divide-y divide-border">
            {users.map((user) => (
              <li key={user.id}>
                <ListRowLink
                  to={"/users/" + user.id}
                  tall
                  leading={<Avatar name={user.name} />}
                  title={user.name}
                  subtitle={
                    user.birthDate +
                    " · 담당 " +
                    (findStaff(staff, user.assignedStaffId)?.name ?? "미지정")
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button block asChild>
        <Link to="/users/new">이용자 등록</Link>
      </Button>

      {closed.length > 0 ? (
        <FormSection title="이용 종결" description={closed.length + "명"}>
          <ul className="flex flex-col gap-2">
            {closed.map((user) => (
              <li key={user.id} className="flex items-center gap-2">
                <span className="type-body">{user.name}</span>
                <Badge variant="outline" tone="neutral">
                  이용 종결
                </Badge>
              </li>
            ))}
          </ul>
        </FormSection>
      ) : null}
    </div>
  );
}

export function UserNewPage() {
  const staffQuery = useStaffList();
  if (staffQuery.data) return <UserNewForm staff={staffQuery.data} />;

  return (
    <AppShell header={<AppHeader title="이용자 등록" backTo="/mypage" />} width="form">
      <QueryGate state={combineQueries([staffQuery])}>{() => null}</QueryGate>
    </AppShell>
  );
}

function UserNewForm({ staff }: { staff: Staff[] }) {
  const navigate = useNavigate();
  const createUser = useCreateServiceUser();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string }>({});

  function submit() {
    if (createUser.isPending) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = "이름을 입력해 주세요.";
    if (!isValidDate(birthDate)) next.birthDate = "생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    createUser.mutate(
      { name: name.trim(), birthDate, assignedStaffId: staffId },
      {
        onSuccess: (created) => {
          toast.success(created.name + " 님을 등록했어요.");
          navigate("/users");
        },
        onError: (error) => toast.error("등록하지 못했어요.", { description: errorMessage(error) }),
      },
    );
  }

  return (
    <AppShell
      header={<AppHeader title="이용자 등록" backTo="/mypage" />}
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button variant="outline" block onClick={() => navigate("/users")}>
            취소
          </Button>
          <Button block onClick={submit} disabled={createUser.isPending}>
            {createUser.isPending ? "등록 중…" : "등록"}
          </Button>
        </BottomActionBar>
      }
    >
      <FormSection title="기본 정보">
        <UserForm
          name={name}
          onNameChange={setName}
          birthDate={birthDate}
          onBirthDateChange={setBirthDate}
          staffId={staffId}
          onStaffChange={setStaffId}
          errors={errors}
          staffOptions={staff}
        />
      </FormSection>
    </AppShell>
  );
}

export function UserDetailPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();
  const user = usersQuery.data?.find((u) => u.id === userId);

  if (usersQuery.isSuccess && !user) {
    return (
      <AppShell header={<AppHeader title="이용자 정보" backTo="/users" />}>
        <Card variant="form">
          <EmptyState
            message="찾을 수 없는 이용자예요."
            action={<Button onClick={() => navigate("/users")}>이용자 목록으로</Button>}
          />
        </Card>
      </AppShell>
    );
  }

  if (!user || !staffQuery.data) {
    return (
      <AppShell header={<AppHeader title="이용자 정보" backTo="/users" />} width="form">
        <QueryGate state={combineQueries([usersQuery, staffQuery])}>{() => null}</QueryGate>
      </AppShell>
    );
  }

  // 불러온 값으로 폼을 초기화하려고 이용자별로 새로 마운트한다
  return <UserDetailForm key={user.id} user={user} staff={staffQuery.data} />;
}

function UserDetailForm({ user, staff }: { user: ServiceUser; staff: Staff[] }) {
  const navigate = useNavigate();
  const updateUser = useUpdateServiceUser();
  const closeUser = useCloseServiceUser();
  const [name, setName] = useState(user.name);
  const [birthDate, setBirthDate] = useState(user.birthDate);
  const [staffId, setStaffId] = useState(user.assignedStaffId || (staff[0]?.id ?? ""));
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string }>({});
  const [closeOpen, setCloseOpen] = useState(false);
  const busy = updateUser.isPending || closeUser.isPending;

  function save() {
    if (busy) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = "이름을 입력해 주세요.";
    if (!isValidDate(birthDate)) next.birthDate = "생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // 저장을 누른 경우에만 반영한다 (이용자 공통 규칙 1)
    updateUser.mutate(
      { userId: user.id, input: { name: name.trim(), birthDate, assignedStaffId: staffId } },
      {
        onSuccess: () => {
          toast.success("이용자 정보를 저장했어요.");
          navigate("/users");
        },
        onError: (error) => toast.error("저장하지 못했어요.", { description: errorMessage(error) }),
      },
    );
  }

  return (
    <AppShell
      header={
        <AppHeader
          title="이용자 정보"
          action={
            <Button variant="ghost" size="dense" onClick={() => navigate("/users")}>
              취소
            </Button>
          }
          backTo="/users"
        />
      }
      bottom="action"
      width="form"
      bottomBar={
        <BottomActionBar>
          <Button variant="outline" block disabled={busy} onClick={() => setCloseOpen(true)}>
            종결
          </Button>
          <Button block disabled={busy} onClick={save}>
            {updateUser.isPending ? "저장 중…" : "저장"}
          </Button>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col gap-3">
        <FormSection title="기본 정보">
          <UserForm
            name={name}
            onNameChange={setName}
            birthDate={birthDate}
            onBirthDateChange={setBirthDate}
            staffId={staffId}
            onStaffChange={setStaffId}
            errors={errors}
            staffOptions={staff}
          />
        </FormSection>


        <ConfirmDialog
          open={closeOpen}
          onOpenChange={setCloseOpen}
          title={user.name + " 님의 이용을 종결할까요?"}
          description="현재 이용 중인 이용자 목록에서 빠져요. 기존 일지와 통계 기록은 그대로 남아요."
          confirmLabel="종결"
          onConfirm={() => {
            closeUser.mutate(user.id, {
              onSuccess: () => {
                toast.success(user.name + " 님의 이용을 종결했어요.", {
                  description: "활성 목록에서 숨겼고 과거 일지는 유지했습니다.",
                });
                navigate("/users");
              },
              onError: (error) =>
                toast.error("종결하지 못했어요.", { description: errorMessage(error) }),
            });
          }}
        />
      </div>
    </AppShell>
  );
}

function UserForm({
  name,
  onNameChange,
  birthDate,
  onBirthDateChange,
  staffId,
  onStaffChange,
  errors,
  staffOptions,
}: {
  name: string;
  onNameChange: (value: string) => void;
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  staffId: string;
  onStaffChange: (value: string) => void;
  errors: { name?: string; birthDate?: string };
  staffOptions: readonly { id: string; name: string; position: string }[];
}) {
  return (
    <FieldGroup>
      {/* 별표는 원본에서 확인된 이름·생년월일에만 붙인다 (가이드 9장 2번) */}
      <Field>
        <FieldLabel htmlFor="user-name" required>
          이름
        </FieldLabel>
        <Input
          id="user-name"
          value={name}
          required
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "user-name-error" : undefined}
          onChange={(event) => onNameChange(event.target.value)}
        />
        <FieldError id="user-name-error">{errors.name}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor="user-birth" required>
          생년월일
        </FieldLabel>
        <Input
          id="user-birth"
          value={birthDate}
          required
          placeholder="2001-04-18"
          inputMode="numeric"
          aria-invalid={errors.birthDate ? true : undefined}
          aria-describedby={errors.birthDate ? "user-birth-error" : undefined}
          onChange={(event) => onBirthDateChange(event.target.value)}
        />
        <FieldError id="user-birth-error">{errors.birthDate}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor="user-staff">담당 직원</FieldLabel>
        <Select value={staffId} onValueChange={onStaffChange}>
          <SelectTrigger id="user-staff" aria-label="담당 직원">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {staffOptions.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name} · {member.position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
