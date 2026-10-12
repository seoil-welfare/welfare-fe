import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LogOut,
  Printer,
  UserPlus,
  Users,
  UserCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator, Switch } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { ListRowButton, ListRowLink, ListRowStatic } from "@/components/common/ListRow";
import { DemoNote } from "@/components/common/states";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useLogout, useServiceUsers, useStaffList } from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { useDraft } from "@/app/DraftContext";
import { IS_MOCK } from "@/config";
import { useDemo } from "@/demo/DemoContext";
import { activeServiceUsers } from "@/services/diaryService";
import { useState } from "react";

const APP_VERSION = IS_MOCK ? "0.1.0 (UI 시연)" : "0.1.0";

/**
 * 마이페이지 (2.1.13/FR-73 ~ FR-85).
 * 계정 추가·관리 메뉴의 가시성은 역할별 데모 예시이며 확정 권한이 아니다 (지시서 4.5).
 * 로그아웃은 메뉴 행 구조를 유지하고 일반 foreground를 쓴다 (가이드 2-3 3번).
 */
export function MyPage() {
  const navigate = useNavigate();
  const currentStaff = useCurrentStaff();
  const { notifyNewDiary, setNotifyNewDiary } = useDemo();
  const { discardDraft } = useDraft();
  const logout = useLogout();
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const userCount = usersQuery.data ? activeServiceUsers(usersQuery.data).length + "명" : "–";
  const staffCount = staffQuery.data ? staffQuery.data.length + "명" : "–";

  // 담당자 관리 메뉴는 현재 목업에서 팀장 전용으로 표시되어 있다 (FR-80, FR-81 미확정)
  const canManageStaff = currentStaff?.role === "teamLead" || currentStaff?.role === "director";

  return (
    <AppShell>
      <div className="flex flex-col gap-3">
        <h1 className="px-1 type-title">마이페이지</h1>

        <Card variant="list">
          <ListRowLink
            to="/profile"
            tall
            title={currentStaff?.name ?? "담당자"}
            subtitle={
              (currentStaff?.department ?? "") +
              " · " +
              (currentStaff?.position ?? "") +
              (currentStaff?.unconfirmedPosition ? " (U4 미확정 예시)" : "")
            }
            trailing={
              currentStaff?.position === "팀장" ? (
                <Badge variant="soft" tone="primary">
                  팀장
                </Badge>
              ) : undefined
            }
          />
        </Card>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 type-heading">이용자 관리</h2>
          <Card variant="list">
            <ListRowLink
              to="/users"
              leading={<Users className="size-5 text-primary" aria-hidden />}
              title="이용자 목록"
              trailing={<span className="tnum type-body text-muted-foreground">{userCount}</span>}
            />
            <Separator />
            <ListRowLink
              to="/users/new"
              leading={<UserPlus className="size-5 text-primary" aria-hidden />}
              title="이용자 등록"
            />
          </Card>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 type-heading">파일 출력</h2>
          <Card variant="list">
            <ListRowLink
              to="/exports/diaries"
              leading={<FileText className="size-5 text-primary" aria-hidden />}
              title="일지 모아 출력"
            />
            <Separator />
            <ListRowLink
              to="/exports/monthly"
              leading={<Printer className="size-5 text-primary" aria-hidden />}
              title="월간 기록 출력"
            />
            <Separator />
            <ListRowLink
              to="/exports/excel"
              leading={<FileSpreadsheet className="size-5 text-primary" aria-hidden />}
              title="엑셀 내보내기"
            />
          </Card>
          <DemoNote>
            출력 형식과 다운로드 흐름은 U5 미확정 사항입니다. 실제 문서는 만들지 않습니다.
          </DemoNote>
        </section>

        {canManageStaff ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 type-heading">담당자 관리</h2>
            <Card variant="list">
              <ListRowLink
                to="/staff"
                leading={<UserCog className="size-5 text-primary" aria-hidden />}
                title="담당자 목록"
                trailing={
                  <span className="tnum type-body text-muted-foreground">{staffCount}</span>
                }
              />
              <Separator />
              <ListRowLink
                to="/staff/new"
                leading={<UserPlus className="size-5 text-primary" aria-hidden />}
                title="계정 추가"
              />
            </Card>
            <DemoNote>
              담당자 관리 메뉴의 접근 권한은 미확정이라(FR-80, FR-81) 현재는 팀장·국장 역할에만
              보이게 두었습니다. 확정된 권한 정책이 아닙니다.
            </DemoNote>
          </section>
        ) : (
          <DemoNote>
            담당자 관리 메뉴는 역할별 가시성 예시로 숨겨져 있습니다. 시연 설정에서 팀장으로 바꾸면
            보입니다. 확정된 권한이 아닙니다.
          </DemoNote>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="px-1 type-heading">설정</h2>
          <Card variant="list">
            <ListRowStatic
              leading={<Bell className="size-5 text-primary" aria-hidden />}
              title="새 일지 알림 받기"
              subtitle="알림 발생 조건과 전달 방식은 미확정이에요"
              trailing={
                <Switch
                  checked={notifyNewDiary}
                  onCheckedChange={(value) => {
                    setNotifyNewDiary(value);
                    toast.success(value ? "알림을 받도록 설정했어요." : "알림을 끄었어요.", {
                      description: "시연용 설정입니다. 실제 알림을 보내지 않습니다.",
                    });
                  }}
                  aria-label="새 일지 알림 받기"
                />
              }
            />
            <Separator />
            <ListRowLink
              to="/settings/password"
              leading={<KeyRound className="size-5 text-primary" aria-hidden />}
              title="비밀번호 변경"
            />
            <Separator />
            {/* 로그아웃은 메뉴 행 구조를 유지하고 일반 글자색을 쓴다 */}
            <ListRowButton
              leading={<LogOut className="size-5 text-foreground" aria-hidden />}
              title="로그아웃"
              showChevron={false}
              onClick={() => setLogoutOpen(true)}
            />
          </Card>
        </section>

        <p className="px-1 py-2 type-caption text-muted-foreground">앱 버전 {APP_VERSION}</p>

        <ConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          title="로그아웃할까요?"
          description="작성 중이지만 저장하지 않은 내용은 사라져요. 저장되지 않은 데이터의 처리 기준은 회의 미확정 사항입니다."
          confirmLabel="로그아웃"
          tone="default"
          onConfirm={() => {
            // 서버 로그아웃이 실패해도 이 기기의 로그인 상태는 비운다 (useLogout onSettled)
            logout.mutate(undefined, {
              onSettled: () => {
                discardDraft();
                navigate("/login", { replace: true });
              },
            });
          }}
        />
      </div>
    </AppShell>
  );
}
