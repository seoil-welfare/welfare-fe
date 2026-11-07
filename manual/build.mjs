import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const output = path.join(root, "사용자매뉴얼/제작자료");
const screenshot = (name) => {
  const file = path.join(output, "screens", name + ".jpg");
  if (!fs.existsSync(file)) throw new Error("캡처 파일이 없습니다: " + name);
  return "data:image/jpeg;base64," + fs.readFileSync(file).toString("base64");
};
const pages = [
  {
    id: "login", chapter: "시작하기", title: "로그인하고 홈 화면 보기",
    intro: "팀장·국장이 발급한 담당자 계정으로 로그인합니다. 홈에서 일지를 시작하거나 쓰던 기록을 이어갑니다.",
    images: [["01-login", "로그인 · 자동 로그인 선택"], ["02-home", "홈 · 바로가기와 오늘의 소식"]],
    steps: ["발급받은 <b>아이디와 비밀번호</b>를 입력하고 <b>로그인</b>을 누릅니다.", "필요한 경우 <b>자동 로그인</b>을 선택합니다. 공용 기기는 사용 후 로그아웃합니다.", "홈의 <b>일지 작성하기</b>를 누릅니다. 작성 중인 기록은 <b>이어서 작성하기</b>로 엽니다.", "오늘의 소식을 누르면 해당 일지를 확인할 수 있습니다. 비밀번호를 잊었다면 팀장·국장에게 문의합니다."],
    note: "자동 로그인 선택 시 쿠키를 30일 보관합니다. 서버 재시작·계정 사용 중지·로그아웃 등에 따라 다시 로그인할 수 있습니다.",
  },
  {
    id: "basic", chapter: "일지 작성 1 / 4", title: "이용자와 기본 정보 확인",
    intro: "이용자와 날짜를 먼저 확인한 뒤 날씨·컨디션을 고릅니다. 아래로 스크롤하면 활동과 특이사항이 있습니다.",
    images: [["03-diary-basic", "위쪽 · 이용자, 날짜, 날씨, 컨디션"], ["08-diary-notes", "아래쪽 · 활동 목록과 특이사항"]],
    steps: ["홈의 <b>일지 작성하기</b> 또는 달력의 미작성 이용자를 누릅니다.", "<b>대상 이용자</b>와 <b>일지 날짜</b>를 확인하고 날씨·컨디션을 선택합니다.", "<b>활동 내용 추가</b>를 눌러 시간과 활동을 입력합니다. 활동은 여러 개 추가할 수 있습니다.", "<b>특이사항</b>에 보호자 전달 내용이나 관찰한 사실을 적습니다. ‘기타’를 고르면 필요한 내용을 직접 적습니다."],
    note: "이용자 1명당 하루 1건입니다. 오늘 이후 날짜는 작성할 수 없습니다. 서버에 저장된 일지는 이용자·날짜 변경이 제한됩니다.",
  },
  {
    id: "activity", chapter: "일지 작성 2 / 4", title: "활동 시간·내용·반응 입력",
    intro: "한 활동에 대해 실제로 진행한 시간과 내용을 적습니다. 화면을 아래로 내려 지원 방법과 이용자 반응을 고릅니다.",
    images: [["04-activity-time", "활동 시간 · 참여 활동 · 상세 내용"], ["05-activity-reaction", "사전 지원 · 반응 · 긍정행동지원"]],
    steps: ["<b>시작 시각</b>과 <b>종료 시각</b>의 시·분을 각각 고릅니다.", "<b>참여 활동</b>을 고르고 <b>활동 상세 내용</b>에 실제 진행한 내용과 관찰 사실을 적습니다.", "실제로 제공한 <b>사전 지원</b>과 <b>긍정행동지원</b>을 고릅니다.", "<b>이용자 반응</b>은 참여 정도 하나를 고릅니다. <b>기타</b>는 별도로 함께 고르고 내용을 적을 수 있습니다."],
    note: "시간 범위는 00:00~24:00입니다. 24:00은 종료에만 사용합니다. 종료가 시작보다 늦어야 하고 다른 활동과 겹칠 수 없습니다.",
  },
  {
    id: "behavior", chapter: "일지 작성 3 / 4", title: "도전적 행동과 세부 항목 기록",
    intro: "행동이 기록된 활동에서는 ‘있음’을 선택하고 실제 관찰한 세부 항목까지 고릅니다.",
    images: [["06-behavior-detail", "유형 선택 후 세부 행동 고르기"], ["07-behavior-selected", "활동 화면에서 선택 결과 확인"]],
    steps: ["도전적 행동 항목의 <b>있음</b>을 선택합니다. 해당하지 않으면 선택하지 않습니다.", "<b>자해·타해·파괴행동</b> 등 해당 유형을 선택해 세부 화면을 엽니다.", "관찰한 세부 행동을 고르고 아래의 <b>○개 선택 완료</b>를 누릅니다. 이미 고른 유형은 <b>상세 선택</b>으로 다시 확인합니다.", "활동 화면에서 결과를 확인하고 <b>저장하고 다음 활동</b>을 누릅니다. 활동이 일지 목록에 추가됩니다."],
    note: "유형만 고르고 세부 항목을 비워 두면 작성 완료 전에 확인을 요구합니다. 통계의 ‘건’은 행동 항목 선택 기록 수이며 실제 발생 횟수와 다릅니다.",
  },
  {
    id: "save", chapter: "일지 작성 4 / 4", title: "임시저장·이어서 작성·작성 완료",
    intro: "쓰던 기록을 남길 때는 저장 상태를 확인합니다. 내용을 모두 확인한 뒤에만 작성 완료로 바꿉니다.",
    images: [["09-draft-saved", "작성 중 · 위쪽의 저장 상태 확인"], ["10-completed", "완료 후 · 작성 완료 표시 확인"]],
    steps: ["입력이 잠시 멈추면 작성 중인 일지를 자동 저장합니다. 위쪽의 <b>저장됨</b> 표시를 확인합니다.", "바로 저장하려면 <b>임시저장</b>을 누릅니다. 잠시 멈추려면 <b>나중에 이어서</b>를 사용합니다.", "계속 쓸 때는 홈의 <b>이어서 작성하기</b> 또는 달력의 <b>작성 중</b> 일지를 엽니다.", "활동·세부 행동·특이사항을 확인한 뒤 <b>작성 완료</b>를 누릅니다. 완료된 일지는 통계와 보고서의 대상이 됩니다."],
    note: "저장 실패 안내가 보이면 저장된 것으로 생각하고 화면을 닫지 마세요. 활동 없이 완료할 때는 별도 확인창이 나옵니다.",
  },
  {
    id: "calendar", chapter: "기록 확인", title: "달력에서 지난 일지 찾기",
    intro: "날짜를 선택한 뒤 이용자별 작성 상태를 확인합니다. 작은 화면에서는 이용자 목록이 달력 아래에 있습니다.",
    images: [["11-calendar", "달력 · 날짜와 작성 상태"], ["12-diary-detail", "일지 상세 · 활동 펼쳐 보기"]],
    steps: ["하단 메뉴의 <b>달력</b>을 누르고 원하는 월·날짜를 고릅니다.", "달력 아래로 내려 이용자별 <b>미작성·작성 중·등록</b> 상태를 확인합니다.", "일지가 있는 이용자를 누르면 저장된 기록이 열립니다. 미작성 이용자를 누르면 해당 날짜의 새 일지를 씁니다.", "일지 상세에서 <b>활동 시간 줄</b>을 눌러 내용을 펼칩니다. 작성자·수정 시각·특이사항도 확인합니다."],
    note: "달력 숫자는 완료 일지 수와 대상 이용자 수를 보여줍니다. 도전적 행동 표시가 있는 날도 확인할 수 있습니다.",
  },
  {
    id: "edit", chapter: "기록 수정", title: "완료 일지 수정과 충돌 안내",
    intro: "완료된 일지는 ‘수정하기’로 고칩니다. 다른 사람이 먼저 저장했다면 최신 기록과 내 입력을 확인해야 합니다.",
    images: [["13-diary-edit", "완료된 일지 수정"], ["14-conflict", "다른 사람이 먼저 수정한 경우"]],
    steps: ["완료 일지 상세 아래의 <b>수정하기</b>를 누릅니다.", "활동이나 특이사항을 고치고 <b>수정 완료</b>를 눌러 저장합니다.", "충돌 안내가 나오면 입력을 따로 보관할 필요가 있는지 먼저 확인합니다. <b>나중에</b>를 누르면 현재 입력을 유지하며 확인할 수 있습니다.", "<b>최신 내용 불러오기</b>를 누르면 현재 입력 대신 서버의 최신 기록을 엽니다. 비교 후 필요한 내용을 다시 반영합니다."],
    note: "완료 일지 수정은 자동 저장 대상이 아닙니다. ‘수정 완료’를 누르기 전에 나가면 경고가 표시될 수 있습니다.",
  },
  {
    id: "delete", chapter: "기록 정리", title: "활동·작성 중인 일지 삭제",
    intro: "잘못 입력한 활동과 잘못 시작한 작성 중 일지를 구분해 정리합니다. 삭제 대상을 먼저 확인합니다.",
    images: [["39-activity-delete", "한 활동을 삭제하는 확인창"], ["40-draft-delete", "작성 중인 일지 전체 삭제 확인창"]],
    steps: ["<b>활동 삭제</b>: 일지 작성·수정 화면에서 해당 활동 오른쪽의 <b>×</b>를 누릅니다.", "시간과 활동을 확인한 뒤 <b>삭제</b>합니다. 완료 일지를 고치는 중이라면 마지막에 <b>수정 완료</b>로 반영합니다.", "<b>일지 전체 삭제</b>: 작성 중인 일지를 이어서 열고 맨 아래 <b>작성 중인 일지 삭제</b>를 누릅니다.", "이용자와 날짜를 확인하고 <b>삭제</b>를 확정합니다. 이용자를 잘못 고른 경우 올바른 이용자로 새 일지를 작성합니다."],
    note: "작성 중 일지 전체 삭제는 작성자 또는 팀장·국장만 가능합니다. 완료 일지 전체 삭제는 제공하지 않습니다. 삭제 확인은 신중하게 진행하세요.",
  },
  {
    id: "stats", chapter: "통계 1 / 2", title: "이용자·기간을 정해 통계 보기",
    intro: "하단 ‘통계’에서 이용자와 기간을 먼저 고릅니다. 통계에는 작성 완료된 일지만 포함됩니다.",
    images: [["15-stats", "이용자 · 기간 · 조회 단위"], ["16-period", "조회 기간 선택창"]],
    steps: ["하단 <b>통계</b>를 누르고 조회할 이용자를 고릅니다.", "<b>주·월·분기·연간</b> 중 원하는 단위를 고릅니다.", "기간 버튼을 눌러 연도·월·분기·주차를 고른 뒤 <b>기간 적용</b>을 누릅니다.", "종결된 이용자의 기록은 <b>종결 이용자 포함</b>을 선택한 뒤 이용자 목록에서 고릅니다."],
    note: "주간은 일요일~토요일 7일 기준입니다. 진행 중인 기간은 이전 기간 전체와 비교하므로 화면 안내와 실제 기간을 함께 확인합니다.",
  },
  {
    id: "stats-detail", chapter: "통계 2 / 2", title: "행동 상세와 활동별 반응 읽기",
    intro: "요약 화면의 ‘자세히’로 항목별 기록을 확인합니다. 통계 숫자와 실제 기록 내용을 함께 읽습니다.",
    images: [["17-stats-behavior", "도전적 행동 상세"], ["18-stats-activity", "참여 활동 상세"]],
    steps: ["도전적 행동의 <b>자세히</b>를 눌러 유형·세부 행동·기록 목록을 봅니다.", "자해·타해 등 <b>유형 필터</b>로 범위를 좁힙니다. 발생 기록에서는 해당 일지를 찾아 확인합니다.", "참여 활동의 <b>자세히</b>를 누르면 활동별 건수와 도전적 행동을 볼 수 있습니다.", "아래로 내려 <b>활동별 이용자 반응</b>에서 활동을 바꿔 반응 분포를 확인합니다."],
    note: "‘1건’은 선택한 항목 기록의 수입니다. 실제 행동이 한 번 발생했다거나 특정 지원이 효과적이었다는 뜻으로 해석하지 않습니다.",
  },
  {
    id: "users", chapter: "이용자 관리", title: "이용자 등록과 정보 수정",
    intro: "마이페이지의 이용자 목록에서 등록 정보를 확인합니다. 새 이용자는 이름·생년월일·담당 직원을 지정합니다.",
    images: [["19-user-list", "이용자 목록 · 이용 종결 목록"], ["20-user-new", "이용자 등록"]],
    steps: ["<b>마이페이지 → 이용자 목록</b>을 엽니다. 새로 등록할 때는 <b>이용자 등록</b>을 누릅니다.", "<b>이름·생년월일</b>을 입력하고 <b>담당 직원</b>을 고릅니다.", "아래의 <b>등록</b>을 누르고 목록에 추가됐는지 확인합니다.", "등록 정보를 고칠 때는 목록에서 이용자를 누르고 정보를 바꾼 뒤 <b>저장</b>합니다."],
    note: "생년월일은 화면의 형식 안내에 맞게 입력합니다. 이용자를 잘못 고른 저장 일지는 이용자를 바꿔 옮기지 않습니다.",
  },
  {
    id: "close", chapter: "팀장·국장", title: "이용 종결과 이용 재개",
    intro: "종결은 기록 삭제가 아닙니다. 이용 중인 목록에서 제외하되 과거 일지와 통계는 남깁니다.",
    images: [["22-user-close", "종결 전 확인창"], ["23-user-closed", "종결 상태 · 지난 통계와 이용 재개"]],
    steps: ["팀장·국장 계정으로 <b>이용자 목록 → 해당 이용자</b>를 엽니다.", "<b>종결</b>을 누르고 이용자 이름과 안내를 확인한 뒤 확정합니다.", "다시 이용할 때는 목록 아래 <b>이용 종결</b>에서 해당 이용자를 엽니다.", "<b>이용 재개 → 재개</b>를 누릅니다. 같은 이용자 정보와 과거 기록을 유지합니다."],
    note: "일반 담당 직원에게는 종결·재개 버튼이 나오지 않습니다. 종결 이용자의 과거 통계는 ‘지난 통계 보기’로 확인할 수 있습니다.",
  },
  {
    id: "mypage", chapter: "메뉴 찾기", title: "내 메뉴와 관리자 메뉴 구분",
    intro: "하단 ‘마이페이지’에서 이용자 관리·출력·설정을 찾습니다. 계정의 역할에 따라 관리 메뉴가 다릅니다.",
    images: [["24-mypage-staff", "담당 직원의 마이페이지"], ["26-mypage-manager", "팀장·국장의 추가 관리 메뉴"]],
    steps: ["<b>이용자 목록·등록</b>에서 이용자 정보를 관리합니다.", "<b>파일 출력</b>에서 일별활동일지와 월별활동일지를 만듭니다.", "팀장·국장은 아래의 <b>담당자 목록·계정 추가</b>와 <b>참여 활동 관리</b>를 사용합니다.", "화면 아래로 내려 <b>알림·비밀번호 변경·로그아웃</b>을 찾습니다. 메뉴가 안 보이면 내 계정 역할을 확인합니다."],
    note: "일반 담당 직원에게 담당자 관리 메뉴가 없는 것은 정상입니다. 권한 변경이나 계정 발급은 팀장·국장에게 요청합니다.",
  },
  {
    id: "accounts", chapter: "팀장·국장", title: "담당자 계정 추가와 비밀번호 전달",
    intro: "계정은 담당자 역할로 만들어집니다. 추가 직후 보이는 임시 비밀번호는 창을 닫기 전에 본인에게 전달합니다.",
    images: [["28-staff-new", "계정 추가 · 이름, 아이디, 소속 팀"], ["29-temp-password", "발급 결과 · 예시 비밀번호"]],
    steps: ["<b>마이페이지 → 계정 추가</b>를 누릅니다.", "이름·아이디·소속 팀을 입력합니다. 아이디는 <b>4~50자</b>의 영문·숫자·점·밑줄·붙임표를 사용하며 소문자로 맞춥니다.", "<b>추가</b>를 누르고 발급된 아이디·임시 비밀번호를 본인에게 전달합니다. 창을 닫으면 다시 볼 수 없습니다.", "처음 로그인한 직원에게 <b>마이페이지 → 비밀번호 변경</b>에서 본인 비밀번호로 바꾸도록 안내합니다."],
    note: "캡처의 guide.new와 비밀번호는 제작용 가상 값입니다. 실제 서비스에서 사용할 수 있는 계정 정보가 아닙니다.",
  },
  {
    id: "staff", chapter: "팀장·국장", title: "역할 변경·사용 중지·비밀번호 재발급",
    intro: "마이페이지의 ‘담당자 목록’에서 사람을 고르면 계정 상태와 가능한 관리 작업을 확인할 수 있습니다.",
    images: [["30-staff-detail", "담당자 상세"], ["31-staff-role", "담당자 ↔ 팀장 역할 변경"]],
    steps: ["<b>담당자 목록 → 해당 직원</b>을 누릅니다. 이름·소속·아이디를 먼저 확인합니다.", "<b>역할 변경</b>에서 담당자·팀장 역할을 고르고 <b>변경하기</b>를 누릅니다. 제한된 대상에는 버튼이 나오지 않습니다.", "<b>임시 비밀번호 발급 → 발급</b>으로 새 비밀번호를 만듭니다. 기존 비밀번호는 사용할 수 없으며 새 값을 전달해야 합니다.", "<b>계정 사용 중지</b>하면 로그인할 수 없습니다. 기록은 남으므로 담당 이용자를 확인합니다. 복귀 시에는 <b>계정 다시 사용</b>을 선택합니다."],
    note: "버튼은 내 역할과 대상 계정에 따라 다릅니다. 국장 권한을 넘기는 ‘관리 권한 이양’은 국장만 사용합니다.",
  },
  {
    id: "participation", chapter: "팀장·국장", title: "참여 활동 추가·이름 변경·숨기기",
    intro: "활동 목록을 기관의 운영 내용에 맞게 관리합니다. 이름을 바꿔도 같은 활동의 과거 일지와 통계는 이어집니다.",
    images: [["32-participation", "참여 활동 관리 · 활동 추가"], ["33-participation-edit", "활동 수정 · 이름 저장과 숨기기"]],
    steps: ["<b>마이페이지 → 참여 활동 관리</b>를 엽니다.", "새 활동은 이름을 입력하고 <b>추가</b>를 누릅니다.", "기존 활동을 눌러 이름을 바꾸고 <b>이름 저장</b>을 누릅니다.", "더 이상 쓰지 않는 활동은 <b>숨기기</b>를 누릅니다. 필요하면 <b>다시 보이기</b>로 되돌립니다."],
    note: "숨긴 활동은 새 일지에서 고를 수 없고 지난 일지·통계에는 남습니다. 직접 입력용 ‘기타’는 숨길 수 없습니다.",
  },
  {
    id: "exports", chapter: "보고서 출력", title: "일별·월별 활동일지 내려받기",
    intro: "마이페이지의 ‘파일 출력’에서 양식을 고릅니다. 저장된 작성 완료 일지로 DOCX 파일을 만듭니다.",
    images: [["34-export-daily", "일별활동일지 · 한 명과 조회 기간"], ["35-export-monthly", "월별활동일지 · 이용자와 연월"]],
    steps: ["<b>일별활동일지 출력</b>: 이용자 한 명과 시작·종료일을 고르고 <b>출력 시작</b>을 누릅니다.", "일별은 최대 <b>92일</b>이며 오늘까지 고를 수 있습니다. 기록이 있는 날을 날짜순으로 한 파일에 모읍니다.", "<b>월별활동일지 출력</b>: 이용자를 선택하고 연도·월을 정한 뒤 <b>출력 시작</b>을 누릅니다. 이용자마다 파일을 만듭니다.", "내려받은 <b>.docx</b>를 Word 등에서 엽니다. 인쇄 미리보기에서 내용을 확인한 뒤 <b>A4 가로</b>로 인쇄합니다."],
    note: "작성 중인 일지는 출력에 포함되지 않습니다. 현재 출력 목록은 이용 중인 이용자 대상이며 월별 연도 선택은 최근 5개 연도입니다.",
  },
  {
    id: "export-result", chapter: "보고서 확인", title: "출력 결과와 파일 확인",
    intro: "다운로드 결과에 나온 이용자를 확인합니다. 기록이 없거나 만들지 못한 대상은 구분해서 안내합니다.",
    images: [["36-export-result", "월별 출력 결과"], ["12-diary-detail", "일지 상세의 출력 아이콘"]],
    steps: ["월별 결과에서 <b>내려받음·일지가 없어 건너뜀·만들지 못함</b>을 확인합니다.", "휴대폰의 <b>다운로드 목록/파일 앱</b>에서 이용자 이름과 날짜가 맞는 문서를 엽니다.", "여러 명을 출력했는데 파일이 덜 보이면 브라우저의 여러 파일 다운로드 허용 여부를 확인하고 다시 시도합니다.", "한 건만 필요하면 완료 일지 상세의 위쪽 <b>프린터 아이콘</b>으로 같은 일별 양식을 내려받습니다."],
    note: "일별은 보통 하루 두 부분, 월별은 기본 사례에서 4쪽입니다. 기록 길이에 따라 쪽수가 늘어납니다. 앱에서 받는 파일은 PDF가 아닌 DOCX입니다.",
  },
  {
    id: "settings", chapter: "내 계정", title: "알림·비밀번호 변경·로그아웃",
    intro: "마이페이지 아래의 설정을 사용합니다. 비밀번호를 바꾸거나 업무를 마칠 때는 저장 상태부터 확인합니다.",
    images: [["25-mypage-settings", "알림 설정과 로그아웃 메뉴"], ["37-password", "비밀번호 변경"]],
    steps: ["<b>새 일지 알림 받기</b> 행이나 스위치를 눌러 켜고 끕니다.", "<b>비밀번호 변경</b>에서 현재 비밀번호·새 비밀번호·새 비밀번호 확인을 입력합니다.", "새 비밀번호는 <b>8자 이상, 영문·숫자 포함, 공백 없음</b>으로 정합니다. 긴 한글·특수문자는 화면의 길이 제한 안내도 확인합니다.", "<b>변경</b> 후 새 비밀번호로 다시 로그인합니다. 업무가 끝나면 저장을 확인하고 <b>로그아웃</b>합니다."],
    note: "로그아웃 확인창은 미저장 내용이 사라질 수 있음을 알려줍니다. 앱을 닫기 전에 작성 중인 일지가 저장됐는지 확인하세요.",
  },
];

const total = pages.length + 3;
const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const footer = (num) => `<footer><span>케어로그 사용자 매뉴얼 · 2026.11.07</span><span>${String(num).padStart(2, "0")} / ${total}</span></footer>`;
const renderPage = (item, index) => `<section class="sheet" id="${item.id}"><header><span class="chapter">${item.chapter}</span><span class="wordmark">CARELOG</span></header><h1>${item.title}</h1><p class="intro">${item.intro}</p><div class="shots">${item.images.map(([name, caption], i) => `<figure><img src="${screenshot(name)}" alt="${esc(caption)}"/><figcaption><b>${i + 1}</b> ${caption}</figcaption></figure>`).join("")}</div><ol class="steps">${item.steps.map((text) => `<li><div>${text}</div></li>`).join("")}</ol><aside>${item.note}</aside>${footer(index + 3)}</section>`;

const contents = `<section class="sheet" id="contents"><header><span class="chapter">사용 전 확인</span><span class="wordmark">CARELOG</span></header><h1>필요한 내용을 빠르게 찾으세요</h1><p class="intro">매일 쓰는 일지 작성부터 관리자 메뉴까지, 현재 화면의 버튼 이름으로 안내합니다.</p><div class="toc">${pages.map((p, i) => `<a href="#${p.id}"><span>${p.title}</span><b>${i + 3}</b></a>`).join("")}<a href="#help"><span>자주 묻는 질문 · 업무 마무리</span><b>${total}</b></a></div><h2>계정 역할에 따른 메뉴</h2><table><tr><th>작업</th><th>담당 직원</th><th>팀장·국장</th></tr><tr><td>일지 작성·조회 / 통계 / 보고서 출력</td><td>가능</td><td>가능</td></tr><tr><td>이용자 등록·정보 수정</td><td>가능</td><td>가능</td></tr><tr><td>이용자 종결·이용 재개</td><td>관리자 요청</td><td>가능</td></tr><tr><td>담당자 계정·참여 활동 관리</td><td>관리자 요청</td><td>가능</td></tr></table><aside>대상 계정에 따라 역할 변경·사용 중지 등의 버튼이 제한됩니다. 국장 권한 이양은 국장만 가능합니다. 캡처의 이름·계정·기록은 모두 설명용 가상 자료입니다.</aside>${footer(2)}</section>`;

const cover = `<section class="sheet cover" id="cover"><div class="cover-top">CARELOG <span>사용자 안내서</span></div><div class="cover-title"><p class="edition">모바일 화면으로 따라 하는</p><h1>케어로그<br/>사용자 매뉴얼</h1><p class="cover-desc">일지 작성 · 통계 확인<br/>이용자 관리 · 보고서 출력</p><div class="cover-badge">담당 직원 / 팀장 / 국장</div><p class="cover-date">2026년 11월 7일 기준</p><a class="start" href="#contents">목차에서 시작하기 →</a></div><img class="cover-phone" src="${screenshot("02-home")}" alt="케어로그 실제 홈 화면"/><div class="cover-bottom"><b>실제 앱 화면 캡처 수록</b><p>설명용 가상 데이터로 촬영했습니다.<br/>기관 설정·계정 권한에 따라 보이는 메뉴가 다를 수 있습니다.</p></div>${footer(1)}</section>`;

const help = `<section class="sheet" id="help"><header><span class="chapter">도움말</span><span class="wordmark">CARELOG</span></header><h1>막혔을 때 확인할 것</h1><div class="qa"><h2>저장하지 못했다고 나와요</h2><p>네트워크 연결을 확인하고 임시저장을 다시 시도합니다. 성공 표시를 확인하기 전에는 입력 화면을 닫지 않습니다. 계속 실패하면 이용자·날짜·안내 문구를 관리자에게 알려주세요.</p><h2>다른 사람이 먼저 수정했다고 나와요</h2><p>‘나중에’로 내 입력을 먼저 확인합니다. 필요한 내용은 따로 옮겨 둔 뒤 ‘최신 내용 불러오기’를 선택합니다. 최신 내용을 불러오면 현재 입력이 바뀝니다.</p><h2>시간이나 행동 선택 때문에 완료되지 않아요</h2><p>시작·종료 순서와 다른 활동과의 겹침을 확인합니다. 행동 유형을 골랐다면 세부 항목도 선택하고, ‘기타’ 입력 안내가 있는지 확인합니다.</p><h2>통계나 보고서에 기록이 안 보여요</h2><p>이용자·기간이 맞는지, 일지가 ‘작성 완료’인지 확인합니다. 종결 이용자의 통계는 ‘종결 이용자 포함’으로 조회합니다. 현재 일괄 출력 메뉴는 이용 중인 이용자 대상입니다.</p><h2>담당자 관리 메뉴가 없어요</h2><p>일반 담당 직원에게는 표시되지 않습니다. 계정 발급·역할·사용 중지 등은 팀장·국장에게 요청합니다.</p><h2>공유 버튼에서 준비 중이라고 나와요</h2><p>현재 별도 공유 기능은 준비 중입니다. 보고서가 필요하면 일별·월별 출력이나 일지 상세의 출력 아이콘을 사용합니다.</p></div><div class="end-check"><h2>업무를 마칠 때</h2><p>① 이용자·날짜 확인　② 저장 상태 확인<br/>③ 필요한 일지는 작성 완료　④ 공용 기기는 로그아웃</p></div><p class="production">제작 기준: 현재 로컬 수정본의 실제 앱 화면. S22급 모바일 브라우저 화면 360×780을 재현했으며, Android OS 에뮬레이터·실제 갤럭시 단말 검증과는 구분합니다. 화면의 이름과 기록은 모두 가상 자료입니다.</p>${footer(total)}</section>`;

const css = `
@page{size:A4;margin:0}*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;color:#203249;background:#fff;font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:13px;line-height:1.65;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{width:210mm;height:297mm;position:relative;padding:13mm 13mm 17mm;break-after:page;break-inside:avoid}.sheet:last-child{break-after:auto}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.chapter{color:#087f8c;font-size:11px;font-weight:700;letter-spacing:1px}.wordmark{font-size:11px;letter-spacing:2px;color:#8b9bad}h1{font-size:26px;line-height:1.4;letter-spacing:-1px;color:#14396c;margin:0 0 10px}h2{font-size:15px;line-height:1.5;color:#14396c;margin:16px 0 8px}.intro{color:#58697c;margin:0 0 17px;line-height:1.7;font-size:12px}.shots{display:flex;gap:20px;align-items:flex-start;justify-content:space-around}figure{flex:1;text-align:center;margin:0;min-width:0}figure img{display:block;width:244px;height:auto;margin:auto;border:1px solid #d4dfe9;border-radius:12px;box-shadow:0 3px 10px #142e4c0c}figcaption{font-size:11px;color:#52677c;line-height:1.5;margin:9px -5px 0;min-height:20px}figcaption b{display:inline-block;background:#e6f1f4;color:#087f8c;border-radius:50%;width:18px;height:18px;margin-right:3px;font-size:10px;line-height:18px}.steps{display:grid;grid-template-columns:1fr 1fr;gap:11px 23px;counter-reset:step;margin:17px 0 14px;padding:0;list-style:none}.steps li{display:flex;gap:8px;font-size:12px;line-height:1.7}.steps li:before{counter-increment:step;content:counter(step);flex:0 0 21px;width:21px;height:21px;border-radius:5px;line-height:21px;text-align:center;background:#173f72;color:white;font-size:11px;font-weight:bold;margin-top:1px}b{font-weight:700}aside{border-left:3px solid #0c8b96;background:#edf7f8;padding:9px 12px;font-size:11px;line-height:1.7;color:#375966}footer{position:absolute;bottom:8mm;left:13mm;right:13mm;display:flex;justify-content:space-between;padding-top:9px;border-top:1px solid #e2e9ef;font-size:9px;color:#8290a0}.toc{display:grid;grid-template-columns:1fr 1fr;column-gap:25px;row-gap:0;margin:20px 0 27px}.toc a{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #e3eaf0;text-decoration:none;color:#2c475f;font-size:11px}.toc a b{color:#0c8b96;min-width:17px}table{border-collapse:collapse;width:100%;margin:10px 0 20px;font-size:11px}th,td{border-bottom:1px solid #dce6ec;padding:10px 12px;text-align:left}th{background:#ecf2f8;color:#14396c}td:not(:first-child){text-align:center}.cover{background:linear-gradient(155deg,#f8fbfe 0%,#f8fbfe 67%,#e5f1f5 67%,#edf7f8 100%)}.cover-top{font-weight:bold;color:#173f72;font-size:22px;letter-spacing:2px}.cover-top span{font-weight:400;font-size:12px;letter-spacing:0;color:#617489;margin-left:13px}.cover-title{position:absolute;top:53mm;left:14mm;z-index:2}.edition{font-size:13px;color:#0a8790;margin-bottom:17px}.cover h1{font-size:43px;line-height:1.35;letter-spacing:-2px}.cover-desc{font-size:15px;color:#5d7185;line-height:1.9;margin-top:24px}.cover-badge{display:inline-block;background:#153f73;color:white;border-radius:7px;padding:8px 12px;font-size:11px;margin-top:14px}.cover-date{margin-top:20px;font-size:11px;color:#738499}.start{color:#087f8c;text-decoration:none;font-size:12px;font-weight:bold}.cover-phone{position:absolute;right:13mm;top:47mm;width:254px;border:1px solid #d1dfeb;border-radius:20px;box-shadow:0 18px 45px #163a691a}.cover-bottom{position:absolute;left:14mm;bottom:34mm;font-size:12px;color:#14396c}.cover-bottom p{font-size:11px;line-height:1.8;color:#60768c}.qa h2{margin-top:17px;font-size:15px}.qa p{margin:0;color:#52667b;font-size:12px;line-height:1.9}.end-check{background:#173f72;color:white;border-radius:9px;padding:15px 19px;margin-top:23px}.end-check h2{margin:0 0 6px;color:white}.end-check p{margin:0;font-size:13px;line-height:1.9}.production{font-size:10px;color:#7a8998;line-height:1.8;margin-top:19px}
`;

fs.mkdirSync(output, { recursive: true });
const html = `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><title>케어로그 사용자 매뉴얼</title><style>${css}</style></head><body>${cover}${contents}${pages.map(renderPage).join("")}${help}</body></html>`;
fs.writeFileSync(path.join(output, "manual.html"), html);
fs.writeFileSync(path.join(output, "manifest.json"), JSON.stringify({ expectedPages: total, pages: [{ title: "케어로그 사용자 매뉴얼", page: 1 }, { title: "목차와 권한", page: 2 }, ...pages.map((p, i) => ({ title: p.title, page: i + 3 })), { title: "자주 묻는 질문", page: total }], screenshotCount: fs.readdirSync(path.join(output, "screens")).filter((f) => f.endsWith(".jpg")).length, includedUniqueScreenshots: new Set(["02-home", ...pages.flatMap((p) => p.images.map(([name]) => name))]).size, screenshotPlacements: 1 + pages.reduce((n, p) => n + p.images.length, 0) }, null, 2));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.locator(".sheet").evaluateAll((nodes) => nodes.map((node, i) => ({ page: i + 1, height: node.clientHeight, content: node.scrollHeight })).filter((r) => r.content > r.height + 2));
  if (overflow.length) throw new Error("매뉴얼 내용이 페이지를 넘칩니다: " + JSON.stringify(overflow));
  await page.pdf({ path: path.join(output, "manual-unoptimized.pdf"), preferCSSPageSize: true, printBackground: true, tagged: true });
  // 제작용 HTML은 사진을 중복 저장하지 않고 같은 폴더의 JPEG를 참조한다.
  let compactHtml = html;
  for (const file of fs.readdirSync(path.join(output, "screens")).filter((f) => f.endsWith(".jpg"))) {
    compactHtml = compactHtml.replaceAll(screenshot(file.slice(0, -4)), "screens/" + file);
  }
  fs.writeFileSync(path.join(output, "manual.html"), compactHtml);
  console.log("Manual HTML and PDF generated:", total, "pages");
} finally { await browser.close(); }
