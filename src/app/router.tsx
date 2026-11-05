import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/misc";
import { useDiary } from "@/api/queries";
import { errorMessage } from "@/api/errors";
import { RequireAuth } from "@/app/auth";
import { useDraft } from "@/app/DraftContext";
import { useRememberLastPage } from "@/app/lastPage";
import { StatsProvider } from "@/app/StatsContext";
import { LoginPage } from "@/pages/auth/LoginPage";
import { HomePage } from "@/pages/home/HomePage";
import { NewsPage } from "@/pages/home/NewsPage";
import { DiaryEditPage } from "@/pages/diary/DiaryEditPage";
import { ActivityEditPage } from "@/pages/diary/ActivityEditPage";
import { BehaviorDetailPage } from "@/pages/diary/BehaviorDetailPage";
import { CalendarPage } from "@/pages/calendar/CalendarPage";
import { DiaryDetailPage } from "@/pages/diary/DiaryDetailPage";
import { StatsPage } from "@/pages/stats/StatsPage";
import { StatsBehaviorsPage } from "@/pages/stats/StatsBehaviorsPage";
import { StatsActivitiesPage } from "@/pages/stats/StatsActivitiesPage";
import { StatsCategoryPage } from "@/pages/stats/StatsCategoryPage";
import { MyPage } from "@/pages/mypage/MyPage";
import { UserDetailPage, UserNewPage, UsersPage } from "@/pages/manage/UsersPages";
import { StaffNewPage, StaffPage } from "@/pages/manage/StaffPages";
import { StaffDetailPage } from "@/pages/manage/StaffDetailPage";
import { ExportPage } from "@/pages/export/ExportPage";
import { ParticipationPage } from "@/pages/manage/ParticipationPage";
import { PasswordPage, ProfilePage } from "@/pages/mypage/SettingsPages";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * 완료된 일지의 개별 활동 수정 진입점 (FR-63).
 * 해당 일지를 작성 중 데이터로 불러온 뒤 활동 수정 화면으로 보낸다.
 * 저장/취소 시의 이동 방식은 미확정 사항이다.
 */
function DiaryActivityEditEntry() {
  const { continueDraft, setPendingActivity } = useDraft();
  const navigate = useNavigate();
  const { diaryId, activityId } = useParams();
  const diaryQuery = useDiary(diaryId);

  useEffect(() => {
    if (diaryQuery.isPending) return;
    const diary = diaryQuery.data;
    if (!diary) {
      toast.error("일지를 불러오지 못했어요.", { description: errorMessage(diaryQuery.error) });
      navigate("/calendar", { replace: true });
      return;
    }
    continueDraft(diary);
    const activity = diary.activities.find((a) => a.id === activityId);
    setPendingActivity(activity ? { ...activity } : null);
    navigate("/diaries/new/activities/" + activityId, { replace: true });
  }, [diaryQuery.isPending, diaryQuery.data, diaryQuery.error, activityId, continueDraft, setPendingActivity, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label="일지를 불러오는 중…" />
    </div>
  );
}

export function AppRoutes() {
  useRememberLastPage();
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />

        <Route path="/diaries/new" element={<DiaryEditPage />} />
        <Route path="/diaries/new/activities/:activityId" element={<ActivityEditPage />} />
        <Route
          path="/diaries/new/activities/:activityId/behaviors/:type"
          element={<BehaviorDetailPage />}
        />
        <Route path="/diaries/:diaryId" element={<DiaryDetailPage />} />
        <Route
          path="/diaries/:diaryId/activities/:activityId"
          element={<DiaryActivityEditEntry />}
        />

        <Route path="/calendar" element={<CalendarPage />} />

        {/* 통계 메인에서 고른 이용자·기간·단위를 상세 화면에서도 유지한다 */}
        <Route
          element={
            <StatsProvider>
              <Outlet />
            </StatsProvider>
          }
        >
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/stats/behaviors" element={<StatsBehaviorsPage />} />
          <Route path="/stats/activities" element={<StatsActivitiesPage />} />
          <Route path="/stats/:category" element={<StatsCategoryPage />} />
        </Route>

        <Route path="/mypage" element={<MyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<UserNewPage />} />
        <Route path="/users/:userId" element={<UserDetailPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/staff/new" element={<StaffNewPage />} />
        <Route path="/staff/:staffId" element={<StaffDetailPage />} />
        <Route path="/exports/:kind" element={<ExportPage />} />
        <Route path="/settings/password" element={<PasswordPage />} />
        <Route path="/settings/participation" element={<ParticipationPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
