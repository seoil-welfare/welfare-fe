import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  FileText,
  KeyRound,
  ListChecks,
  LogOut,
  Printer,
  Share,
  Smartphone,
  UserPlus,
  Users,
  UserCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator, Switch } from "@/components/ui/misc";
import { AppShell } from "@/components/layout/AppShell";
import { MainHeader } from "@/components/layout/AppHeader";
import { ListRowButton, ListRowLink, ListRowStatic } from "@/components/common/ListRow";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import {
  useLogout,
  useNotificationSettings,
  useServiceUsers,
  useStaffList,
  useUpdateNotificationSettings,
} from "@/api/queries";
import { useCurrentStaff } from "@/app/auth";
import { useDraft } from "@/app/DraftContext";
import { promptInstall, useInstallMode } from "@/app/installApp";
import { activeServiceUsers } from "@/services/diaryService";
import { useState } from "react";

const APP_VERSION = "0.1.0";

/**
 * 마이페이지 (2.1.13/FR-73 ~ FR-85).
 * 계정 추가·관리 메뉴의 가시성은 역할별 데모 예시이며 확정 권한이 아니다 (지시서 4.5).
 * 로그아웃은 메뉴 행 구조를 유지하고 일반 foreground를 쓴다 (가이드 2-3 3번).
 */
export function MyPage() {
  const navigate = useNavigate();
  const currentStaff = useCurrentStaff();
  const notifySettings = useNotificationSettings();
  const updateNotify = useUpdateNotificationSettings();
  const { discardDraft } = useDraft();
  const logout = useLogout();
  const usersQuery = useServiceUsers();
  const staffQuery = useStaffList();
  const [logoutOpen, setLogoutOpen] = useState(false);
  // 홈 화면에 추가: Chrome·Edge는 설치 창, 아이폰 Safari는 안내 창. 이미 설치했거나 지원하지 않으면 줄을 숨긴다
  const installMode = useInstallMode();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  async function handleInstall() {
    if (installMode === "ios") {
      setIosGuideOpen(true);
      return;
    }
    if (await promptInstall()) toast.success("홈 화면에 추가했어요.");
  }
  const userCount = usersQuery.data ? activeServiceUsers(usersQuery.data).length + "명" : "–";
  const staffCount = staffQuery.data ? staffQuery.data.length + "명" : "–";

  // 담당자 관리 메뉴는 현재 목업에서 팀장 전용으로 표시되어 있다 (FR-80, FR-81 미확정)
  const canManageStaff = currentStaff?.role === "teamLead" || currentStaff?.role === "director";

  return (
    <AppShell header={<MainHeader />}>
      <div className="flex flex-col gap-3">
        {/* 화면 이름은 하단 탭에 있어 화면 낭독기용으로만 남긴다 */}
        <h1 className="sr-only">마이페이지</h1>

        <Card variant="list">
          <ListRowLink
            to="/profile"
            tall
            title={currentStaff?.name ?? "담당자"}
            subtitle={
              (currentStaff?.department ?? "") +
              " · " +
              (currentStaff?.position ?? "")
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
          </Card>
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
          </section>
        ) : null}

        {canManageStaff ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 type-heading">일지 항목 관리</h2>
            <Card variant="list">
              <ListRowLink
                to="/settings/participation"
                leading={<ListChecks className="size-5 text-primary" aria-hidden />}
                title="참여 활동 관리"
              />
            </Card>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <h2 className="px-1 type-heading">설정</h2>
          <Card variant="list">
            <ListRowStatic
              // 스위치가 작아져 다른 줄과 같은 48px 높이로 맞춘다
              tall={false}
              leading={<Bell className="size-5 text-primary" aria-hidden />}
              title="새 일지 알림 받기"
              trailing={
                <Switch
                  checked={notifySettings.data?.notifyNewLog ?? false}
                  disabled={!notifySettings.data || updateNotify.isPending}
                  onCheckedChange={(value) => {
                    updateNotify.mutate(
                      { notifyNewLog: value },
                      {
                        onSuccess: () =>
                          toast.success(value ? "알림을 받도록 설정했어요." : "알림을 껐어요."),
                        onError: () => toast.error("알림 설정을 저장하지 못했어요. 다시 시도해 주세요."),
                      },
                    );
                  }}
                  aria-label="새 일지 알림 받기"
                />
              }
            />
            {installMode === "prompt" || installMode === "ios" ? (
              <>
                <Separator />
                <ListRowButton
                  leading={<Smartphone className="size-5 text-primary" aria-hidden />}
                  title="홈 화면에 추가"
                  onClick={() => void handleInstall()}
                />
              </>
            ) : null}
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

        {/* 아이폰·아이패드 Safari는 버튼으로 바로 설치할 수 없어 방법을 안내한다 */}
        <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
          <DialogContent title="홈 화면에 추가하기" description="Safari에서 아래 순서로 추가할 수 있어요.">
            <ol className="flex flex-col gap-3 type-body">
              <li>
                <span className="tnum font-medium">1.</span> 공유 버튼{" "}
                <Share className="inline size-5 align-text-bottom text-primary" aria-label="공유 아이콘" />
                을 눌러요. 아이폰은 화면 아래, 아이패드는 위에 있어요.
              </li>
              <li>
                <span className="tnum font-medium">2.</span> 목록에서 <strong>홈 화면에 추가</strong>를 골라요.
              </li>
              <li>
                <span className="tnum font-medium">3.</span> 오른쪽 위 <strong>추가</strong>를 눌러요.
              </li>
            </ol>
            <DialogClose asChild>
              <Button block className="mt-5">
                확인
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          title="로그아웃할까요?"
          description="작성 중이지만 저장하지 않은 내용은 사라져요."
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
