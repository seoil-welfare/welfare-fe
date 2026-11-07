# welfare-fe — 케어로그

복지관 돌봄 일지 작성·인수인계 앱입니다. React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query를 사용합니다.

화면은 실제 백엔드 `welfare-be`를 호출합니다. 브라우저 mock 서버는 없으며 백엔드와 PostgreSQL이 실행되어 있어야 합니다.

## 실행

Node.js 20 이상과 npm이 필요합니다. 특정 PC의 포터블 Node 경로를 전제로 하지 않습니다.

```powershell
cd welfare-fe
npm ci
npm run dev
```

개발 서버는 `http://localhost:5173`입니다. 같은 와이파이의 휴대폰은 Vite가 출력하는 Network 주소로 접속합니다.
`/api` 요청은 기본적으로 `http://localhost:8080`으로 전달합니다. 주소 변경은 [.env.example](.env.example)을 참고해 `.env`의 `VITE_API_PROXY_TARGET`을 설정하세요.

Git이 없는 ZIP 폴더에서도 설치할 수 있습니다. [prepare.mjs](scripts/prepare.mjs)는 저장소일 때 Git hook을 설정하며, Git 설정 실패가 의존성 설치를 중단시키지 않습니다. 검증 스크립트가 직접 사용하는 esbuild는 개발 의존성으로 선언되어 있습니다.

## 검증

```powershell
npm run build       # 타입 검사 + 배포 빌드
npm run check:data  # 통계·날짜·소식·달력·실제 docx 생성 검증
npm run verify      # build + check:data
npx playwright install chromium  # 브라우저 검증 최초 1회 준비
npm run test:qa     # 문제 번호별 회귀 검증
npx playwright test tests/report-forms.spec.ts --config playwright.preview.config.ts  # build 후 배포 자산으로 출력 검증
```

[tests](tests/)는 실제 Chromium에서 화면을 실행하고 네트워크 경계의 API 응답을 제어합니다. 계산 및 문서 검증도 포함하며, 브라우저 런타임 오류가 발생하면 실패합니다. 화면 크기, 역할, 오류 응답, 날짜·시간 경계, 기존 데이터 등 서로 다른 케이스를 검증합니다. 운영 서버에 데이터를 쓰지 않습니다.

결과는 `test-results/results.json`, 실패 시 trace와 화면 상태는 `test-results/`에 남습니다. 실제 서버·DB 검증은 백엔드의 `PostgresRoundTripTest`를 함께 실행하세요. 브라우저 가상 API 검증을 서버 연동 성공으로 간주하지 않습니다.

배포 출력 검증은 4174 포트의 `vite preview`를 사용하며 `test-results/preview-results.json`에 결과를 남깁니다. 실행 전에 `npm run build` 또는 `npm run verify`로 최신 배포 파일을 만들어야 합니다.

## 현재 동작

- **인증**: 쿠키 세션입니다. 자동 로그인 해제 시 1시간의 서버 세션과 세션 쿠키, 선택 시 30일의 서버 세션과 영속 쿠키를 사용합니다. 서버 재시작 후 세션 복원은 별도 기능입니다. 브라우저 자체의 이전 세션 복원 설정에도 영향을 받을 수 있습니다.
- **계정**: 회원가입은 없습니다. 팀장·국장이 담당자 계정을 만들고 임시 비밀번호 팝업으로 전달합니다. 아이디는 소문자로 정규화하며 4~50자의 영문·숫자·점·밑줄·붙임표를 허용합니다.
- **비밀번호**: 8자 이상, 영문자·숫자 포함, 공백 금지, UTF-8 72바이트 이하입니다. 변경하면 세션과 작성 중 입력을 비우고 다시 로그인합니다.
- **일지**: 이용자 한 명당 하루 한 건입니다. 미래 날짜는 작성할 수 없습니다. 작성 중 → 작성 완료로만 전환하고 완료 일지는 완료 상태로 수정합니다.
- **임시저장**: 상단 버튼은 실제 서버에 작성 중 상태로 저장합니다. 입력이 2초 멈추거나 화면이 가려질 때 자동 저장합니다. 저장 여부에 맞게 안내하며 내용이 없거나 실패한 경우 성공 메시지를 띄우지 않습니다.
- **입력 보호**: 새로고침·탭 닫기 전 미저장 경고, pagehide keepalive 저장, 저장된 작성 중 일지 ID를 통한 복원을 사용합니다. 일지 내용은 localStorage에 보관하지 않습니다. 완료 일지 수정은 자동 저장 대신 이탈 경고로 보호합니다.
- **작성 중 일지 삭제**: 작성자 또는 팀장·국장이 삭제할 수 있습니다. 완료 일지는 삭제할 수 없습니다.
- **활동 시간**: 00:00~24:00에서 시작·종료를 각각 분 단위로 선택합니다. 24:00은 종료에만 허용합니다. 종료는 시작보다 늦어야 하며 같은 일지 안에서 시간이 겹칠 수 없습니다. 자정을 넘는 활동은 날짜별로 나눠 기록합니다.
- **이용자 반응**: 참여 정도는 1개만, 기타는 별도로 함께 선택할 수 있습니다. 과거 복수 참여 정도는 하나를 다시 선택해야 저장할 수 있습니다. 긍정행동지원은 복수 선택을 유지합니다.
- **동시 수정**: 마지막으로 읽은 updatedAt을 보내고, 다른 사람이 먼저 저장했으면 서버가 409로 거절합니다. 입력을 유지하거나 확인 후 최신 내용을 불러옵니다.
- **관리 화면**: `/staff`, `/staff/new`, `/staff/:id`, `/settings/participation`은 팀장·국장만 진입합니다. 서버도 관리 작업의 권한을 검사합니다. 일반 직원의 일지 작성자·담당 직원 표시를 위해 직원 목록 조회 API는 유지합니다.
- **이용자 종결·재개**: 팀장·국장만 할 수 있습니다. 종결은 삭제가 아니며 같은 이용자 ID로 이용을 재개합니다. 일반 직원도 과거 기록을 조회할 수 있습니다.

## 통계

통계 화면은 서버의 `GET /api/stats/summary` 응답을 사용합니다. [useStatsSummary](src/app/useStatsSummary.ts)가 조회를 연결하며 [statsService](src/services/statsService.ts)는 기간 계산, 빈 초기값, 출력 계산과 검증에 사용합니다.

- 완료 일지만 집계합니다. 임시저장은 제외합니다.
- 도전적 행동은 활동 안의 동일 유형·세부 행동을 1건으로 셉니다. 빈 상위 기타는 제외합니다. 일일·월간 기록과 통계가 같은 [behaviorEntries](src/services/diaryService.ts)를 사용합니다.
- 이전 기간 완료 일지가 없을 때만 기록 없음으로 표시합니다. 행동만 0건이면 증감을 계산합니다. 진행 중인 기간은 이전 기간 전체와 비교한다는 안내를 보여 줍니다.
- 주간은 월 경계와 관계없이 일요일~토요일 7일입니다. 이전 기간은 실제 시작일에서 7일 전이므로 월 경계의 같은 주를 중복 비교하지 않습니다.
- 추이는 주·월 6구간, 분기 4구간, 연 5구간입니다.
- 참여 활동 선택지는 서버 목록을 사용하며 기본 활동은 기록이 가장 많은 항목입니다. 같은 조회 범위에서 사용자가 명시적으로 선택한 활동은 유지합니다.
- 종결 이용자 포함을 선택하면 과거 통계를 조회할 수 있습니다. 종결 이용자 상세의 지난 통계 보기로 바로 진입할 수도 있습니다.
- 존재하지 않는 통계 분류 주소는 찾을 수 없는 화면으로 표시합니다. 조회 실패·로딩 중에는 0건 기준 안내를 보여 주지 않습니다.

## 출력

일별활동일지와 월별활동일지를 브라우저에서 docx로 생성합니다. 제공된 양식에서 앱에 입력 항목이 없는 목표·결과/변화·선행사건·인수인계·평가 항목을 제거했습니다. 템플릿은 [src/assets/forms](src/assets/forms/)에 있습니다.

- 일지 모음은 이용자 한 명의 완료 일지를 날짜순으로 묶고, 최대 92일·오늘까지의 범위를 허용합니다.
- 월간 문장과 차트의 숫자 단위는 건입니다. 행동 이름에는 자해·타해·파괴행동 등 영역을 표시합니다.
- 파일 이름은 `이용자이름_날짜_일별활동일지.docx`, `이용자이름_시작일~종료일_일별활동일지.docx`, `이용자이름_연월_월별활동일지.docx`입니다.
- 마이페이지의 ‘일별활동일지 출력’은 기간 내 작성 완료 일지를 날짜순으로 모읍니다. ‘월별활동일지 출력’은 이용자별 월간 파일을 만듭니다. 작성자 이름은 실제 작성자 정보에서 찾으며, 특이사항은 입력 원문을 보존합니다. 행동 건수는 선택 기록 수이며, 지원 효과나 실제 발생 횟수를 추정하지 않습니다.
- 원본 양식 변경 후 `node scripts/build-report-templates.cjs`로 출력용 템플릿을 다시 생성합니다.
- 엑셀 내보내기는 현재 메뉴에서 제거되어 있습니다. 별도 보고서 신규 기능은 포함하지 않습니다.

## 코드 구조

```text
src/
  api/          서버 계약, HTTP 클라이언트, 조회·저장 훅과 캐시 갱신
  app/          라우팅·인증·권한, DraftContext, StatsContext, useStatsSummary
  components/   공용 UI, 레이아웃, 선택 칩, 활동 시간, 달력·통계
  pages/        auth, home, diary, calendar, stats, manage, mypage, export
  services/     일지·통계·출력 계산, 계정 검증, 시간·출력 범위 검사
  data/         기본 선택 항목(서버 응답 전 fallback)
  lib/export/   docx 생성·다운로드·월간 차트
  assets/forms/ 원본·출력 템플릿
scripts/        계산 검증, fixture, prepare와 템플릿 생성
 tests/         항목별 계산·브라우저 회귀 검증
```

RadioGroup은 담당자 역할 변경에서 사용 중입니다. 공용 컴포넌트 정리 시 사용처를 확인하세요.
API 경로·필드 변경 시 [api/types.ts](src/api/types.ts), [httpApi.ts](src/api/http/httpApi.ts), [queries.ts](src/api/queries.ts)와 [연동 문서](docs/backend-integration.md)를 함께 갱신합니다.

## 개발 계정

백엔드 local 프로필의 개발용 가상 데이터 계정입니다. 비밀번호는 `demo1234`입니다. 운영 서버에는 없습니다.

| 아이디 | 역할 |
|---|---|
| demo.staff1 / demo.staff2 / demo.staff3 | 담당자 |
| demo.lead | 팀장 |
| demo.director | 국장 |

## PWA와 배포

[vite.config.ts](vite.config.ts)의 vite-plugin-pwa 설정과 [public/icons](public/icons/)를 사용합니다. 개발 서버에서는 서비스 워커를 켜지 않으므로 빌드 후 `npm run preview`로 확인합니다. HTTPS 또는 localhost가 필요합니다.
API 응답은 서비스 워커에 캐시하지 않습니다. 새 버전은 사용자가 새로고침을 선택할 때 적용합니다. 아이폰은 Safari 공유 메뉴에서 홈 화면에 추가합니다.

[vercel.json](vercel.json)은 정적 빌드 `dist`를 제공하고 `/api/*`를 백엔드로 전달합니다. 테스트 백엔드 주소를 바꾸면 이 파일을 함께 수정하세요. 브라우저가 같은 사이트의 API를 호출하도록 유지해야 Safari 쿠키가 정상 동작합니다.
이번 점검 수정은 로컬 작업이며 자동 배포·Git push는 실행하지 않습니다.
