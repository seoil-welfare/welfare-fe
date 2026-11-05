import type { Staff, UserRole } from "@/types";
import { isStaffActive } from "@/services/diaryService";

/**
 * 담당자 관리 화면의 권한 판단·정렬·검색 (순수 함수).
 * 화면은 버튼을 보일지만 여기서 정하고, 실제 허용 여부는 서버가 다시 검사한다.
 * 규칙: 백엔드 AuthService (changeRole, transferDirector, setStaffActive)와 같다.
 */

const ROLE_ORDER: Record<UserRole, number> = { director: 0, teamLead: 1, staff: 2 };

/** 팀장·국장인지. 담당자 관리 메뉴와 계정 추가·사용 중지에 쓴다 */
export function isStaffManager(viewer: Staff | null | undefined): boolean {
  return viewer?.role === "teamLead" || viewer?.role === "director";
}

/** 역할 변경(담당자 ↔ 팀장): 팀장·국장이, 내가 아닌 사용 중인 담당자·팀장에게 */
export function canChangeRole(viewer: Staff | null | undefined, target: Staff): boolean {
  return (
    isStaffManager(viewer) &&
    viewer!.id !== target.id &&
    target.role !== "director" &&
    isStaffActive(target)
  );
}

/** 관리 권한 이양: 국장이, 내가 아닌 사용 중인 계정에게 */
export function canTransferDirector(viewer: Staff | null | undefined, target: Staff): boolean {
  return viewer?.role === "director" && viewer.id !== target.id && isStaffActive(target);
}

/** 사용 중지·다시 사용: 팀장·국장이, 내 계정이 아닌 계정에. 국장 계정은 국장만 */
export function canToggleActive(viewer: Staff | null | undefined, target: Staff): boolean {
  if (!isStaffManager(viewer) || viewer!.id === target.id) return false;
  return target.role !== "director" || viewer!.role === "director";
}

/** 목록 순서: 사용 중 먼저, 그 안에서 국장 > 팀장 > 담당자, 같으면 이름순 */
export function sortStaff(staff: readonly Staff[]): Staff[] {
  return [...staff].sort(
    (a, b) =>
      Number(!isStaffActive(a)) - Number(!isStaffActive(b)) ||
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.name.localeCompare(b.name, "ko"),
  );
}

/** 이름 또는 아이디에 검색어가 들어 있는지 (대소문자·앞뒤 공백 무시) */
export function matchesStaffQuery(member: Staff, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return member.name.toLowerCase().includes(q) || member.loginId.toLowerCase().includes(q);
}
