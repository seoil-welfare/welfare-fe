import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomActionBar } from "@/components/layout/bars";
import { FormSection } from "@/components/common/FormSection";
import { ListRowStatic } from "@/components/common/ListRow";
import { QueryGate } from "@/components/common/QueryGate";
import { errorMessage, isApiError } from "@/api/errors";
import { combineQueries, useCreateStaff, useStaffList } from "@/api/queries";
import type { Staff, UserRole } from "@/types";

/**
 * 담당자 목록 / 계정 추가 (2.1.13/FR-80, FR-81).
 * 계정 삭제·정지 정책과 새 직위는 U4 확인 전까지 추가하지 않는다.
 */

export function StaffPage() {
  const staffQuery = useStaffList();

  return (
    <AppShell header={<AppHeader title="담당자 목록" backTo="/mypage" />} width="form">
      <QueryGate state={combineQueries([staffQuery])}>
        {() => <StaffList staff={staffQuery.data!} />}
      </QueryGate>
    </AppShell>
  );
}

function StaffList({ staff }: { staff: Staff[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 tnum type-caption text-muted-foreground">등록된 담당자 {staff.length}명</p>

      <Card variant="list">
        <ul className="divide-y divide-border">
          {staff.map((member) => (
            <li key={member.id}>
              <ListRowStatic
                tall
                leading={<Avatar name={member.name} />}
                title={member.name}
                subtitle={member.department + " · " + member.loginId}
                trailing={
                  member.position === "팀장" ? (
                    <Badge variant="soft" tone="primary">
                      팀장
                    </Badge>
                  ) : member.unconfirmedPosition ? (
                    <Badge variant="outline" tone="neutral">
                      {member.position}
                    </Badge>
                  ) : (
                    <span className="type-caption text-muted-foreground">{member.position}</span>
                  )
                }
              />
            </li>
          ))}
        </ul>
      </Card>

      <Button block asChild>
        <Link to="/staff/new">계정 추가</Link>
      </Button>

    </div>
  );
}

export function StaffNewPage() {
  const navigate = useNavigate();
  const createStaff = useCreateStaff();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [department, setDepartment] = useState("주간활동지원팀");
  const [role, setRole] = useState<UserRole>("staff");
  const [errors, setErrors] = useState<{ name?: string; loginId?: string }>({});

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
        position: role === "teamLead" ? "팀장" : "사회복지사",
        role,
      },
      {
        onSuccess: () => {
          toast.success("계정을 추가했어요.");
          navigate("/staff");
        },
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
        <FormSection title="계정 정보">
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
                placeholder="demo.staff6"
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
            <Field>
              <FieldLabel htmlFor="staff-role">직위</FieldLabel>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="staff-role" aria-label="직위">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">사회복지사</SelectItem>
                  <SelectItem value="teamLead">팀장</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </FormSection>

      </div>
    </AppShell>
  );
}
