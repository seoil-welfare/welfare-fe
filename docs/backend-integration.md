# 백엔드 연동 명세 (프론트엔드 기준 초안)

프론트엔드가 백엔드에 기대하는 동작을 정리한 문서입니다. 각 항목은 아래 네 가지 중 하나로 표시합니다.

| 표시 | 뜻 |
|---|---|
| **[확정]** | 개발계획서(FR)에 근거가 있는 요구사항 |
| **[프론트 가정]** | 프론트가 지금 이렇게 구현해 두었지만, 백엔드가 다르게 정하면 프론트가 맞춰 고칠 수 있는 것 |
| **[협의 필요]** | 업무 규칙이나 API 동작을 백엔드·기획과 결정해야 하는 것 (6장) |
| **[제안]** | 아직 없는 API에 대한 프론트의 제안. 확정 API가 아님 (7장) |

확정되면 이 문서와 [`src/api/types.ts`](../src/api/types.ts)를 함께 고칩니다(NFR-21, NFR-23).

---

## 1. 프론트 구조

```
화면(pages) ──► 훅(src/api/queries.ts, TanStack Query) ──► api 객체(src/api/index.ts)
                                                            ├─ mock: src/api/mock  (브라우저 안 가상 서버, 기본값)
                                                            └─ http: src/api/http  (실제 백엔드)
```

- 모드는 환경변수 `VITE_API_MODE=mock | http`로 바꿉니다(`.env.example`).
- 화면은 api를 직접 부르지 않습니다. 경로나 필드가 바뀌면 [`httpApi.ts`](../src/api/http/httpApi.ts)와 [`types.ts`](../src/api/types.ts)만 고치면 됩니다.
- mock과 http는 같은 TypeScript 인터페이스(`Api`)를 구현하므로, 컴파일 단계에서 계약이 어긋나지 않습니다.
- 개발 서버는 `VITE_API_PROXY_TARGET`이 있으면 `/api`를 그 주소로 넘깁니다. 같은 출처가 되어 CORS 없이 쿠키를 쓸 수 있습니다.
- mock 구현([`mockApi.ts`](../src/api/mock/mockApi.ts))의 동작은 `npm run check:api`로 검증합니다. 이 동작은 **목업의 가정**이지 운영 규칙이 아닙니다(6장).

## 2. 공통 약속 [프론트 가정]

| 항목 | 현재 가정 |
|---|---|
| 기본 경로 | `/api` (`VITE_API_BASE_URL`로 변경) |
| 형식 | JSON, UTF-8 |
| 날짜 | `YYYY-MM-DD`, 한국 시간(KST) 기준 업무일 |
| 시각 | 오프셋이 붙은 ISO 8601 (`...+09:00` 또는 `...Z`) |
| 활동 시간 | `HH:mm` 24시간제 |
| 오류 본문 | `{ "message": "사용자에게 보여 줄 한국어 문장", "code": "선택" }` |

### 상태 코드별 프론트 동작 (구현됨)

| 상태 | 조회(GET) | 저장(POST·PUT) |
|---|---|---|
| 401 | 로그인 상태를 비우고 로그인 화면으로 이동 | 같음 |
| 403 | 서버 `message`와 "다시 시도"를 표시, 재시도 안 함 | 서버 `message`를 알림으로 표시 |
| 404 | 일지·이용자 상세는 "찾을 수 없음" 화면 | 서버 `message` 표시 |
| 409 | – | 직원 추가는 아이디 입력란 오류, 일지 `DIARY_UPDATED_BY_OTHER`는 최신 내용 불러오기 확인 창, 그 밖에는 알림 |
| 그 밖의 4xx | 재시도 안 함 | 재시도 안 함 |
| 5xx·네트워크 | **최대 2회 자동 재시도** 후 "다시 시도" | **자동 재시도 안 함** |

### 저장 실패와 응답 유실 (구현됨)

- 저장 요청은 자동으로 재시도하지 않습니다. 서버에는 저장됐는데 응답만 잃어버린 경우, 재시도하면 중복이 생길 수 있기 때문입니다. 서버의 멱등성(Idempotency-Key 등) 지원은 정해지지 않았으므로 프론트는 이를 가정하지 않습니다.
- 저장이 실패하면 입력 내용은 그대로 남기고, 관련 목록(일지·소식 또는 이용자·직원)을 서버에서 다시 불러옵니다.
- 네트워크 오류(응답 없음)일 때는 "저장 여부를 확인하지 못했어요. 이미 저장됐는지 확인한 뒤 다시 시도해 주세요."라고 안내합니다.
- 서버 쪽 중복 방지 방법은 [협의 필요] B-2에서 정합니다.

## 3. 인증 [프론트 가정]

**현재 구현은 쿠키 세션 방식을 전제로 합니다.** JWT로 확정된 것이 아닙니다.

| 항목 | 현재 구현 |
|---|---|
| 요청 | 모든 요청에 `credentials: "include"` (쿠키 자동 전송) |
| 토큰 | 쓰지 않음. 토큰 방식으로 정해지면 `configureHttp({ getToken })`으로 `Authorization: Bearer` 헤더를 붙일 수 있게 만들어 둠([`client.ts`](../src/api/http/client.ts)) |
| 로그인 상태 확인 | 앱 시작 시 `GET /auth/me`. 200이면 로그인, 401이면 로그아웃 상태 |
| 확인 실패 | 네트워크·5xx면 로그인 화면으로 보내지 않고 "다시 시도"를 보여 줌(세션이 살아 있을 수 있으므로) |
| 401 | 어느 요청이든 401을 받으면 로그인 상태를 비우고 로그인 화면으로 이동 |
| 로그인 | 성공하면 이전 사용자의 캐시를 모두 지우고 새 사용자로 시작 |
| 로그아웃 | 서버 요청의 성공 여부와 관계없이 캐시와 작성 중 일지를 지우고 로그인 화면으로 이동 |
| 자동 로그인(FR-02) | `autoLogin` 값을 로그인 요청에 보내기만 함. 세션 유지 기간은 서버가 정해야 함 |

### 화면 접근과 서버 권한

프론트의 화면 제어는 **보여 주기 위한 처리일 뿐이며 보안이 아닙니다.** 서버가 모든 요청에서 같은 규칙을 검증해야 합니다.

| 화면 제어 (현재) | 서버가 검증해야 할 것 |
|---|---|
| 로그인하지 않으면 모든 화면 접근 불가 | 모든 API에 세션 확인 |
| 회원가입 직위는 `담당자` 하나만 보임 | 가입은 항상 `staff`. 팀장은 역할 변경, 국장은 관리 권한 이양으로만 된다 |
| 담당자 상세의 역할 변경은 팀장·국장에게, 관리 권한 이양은 국장에게만 보임. 국장·내 계정·중지된 계정에는 역할 변경이 안 보임 | `POST /staff/:id/role`, `POST /staff/:id/transfer-director` 권한 (아래 4장) |
| 담당자 관리 메뉴는 팀장·국장에게만 보임 (FR-80·81, 권한 미확정) | `GET/POST /staff` 권한. **현재 일반 직원도 주소를 직접 입력하면 `/staff` 화면에 들어갈 수 있음** — 화면 차단 여부는 B-6에서 결정 |
| 다른 직원이 작성 중인 일지는 "이어서 작성" 버튼 없음 | 작성 중 일지의 수정 권한(`PUT /diaries/:id`) |
| 완료 일지의 전체 수정(상세 하단 `수정하기`)·활동 수정 진입 제한 없음 (FR-63 수정 권한 미확정) | 완료 일지 수정 권한·기간 |
| 이용자 등록·수정·종결 메뉴 제한 없음 | 이용자 관리 권한 (FR-87~89 미확정) |
| – | `GET /staff` 응답의 `loginId` 노출 범위 |

## 4. 엔드포인트 [프론트 가정]

프론트가 지금 호출하도록 구현된 경로입니다. 경로와 필드는 백엔드와 협의해 바꿀 수 있습니다.

### 인증

| 메서드 · 경로 | 요청 | 응답 |
|---|---|---|
| `POST /auth/login` | `{ loginId, password, autoLogin }` | `Staff` · 실패 시 401 |
| `POST /auth/signup` | `{ loginId, password, name, birthDate }` | `Staff` · 아이디 중복은 409 `DUPLICATE_LOGIN_ID`, 비밀번호 규칙 위반은 400 `PASSWORD_POLICY`. 직위는 보내지 않으며 서버가 항상 담당자(`staff`)로 만든다 |
| `POST /auth/logout` | – | 204 |
| `GET /auth/me` | – | `Staff` · 로그인 전이면 401 |
| `PUT /auth/password` | `{ currentPassword, newPassword }` | 204 · 불일치·규칙 위반은 400 + `message` |

### 일지

| 메서드 · 경로 | 요청 | 응답 |
|---|---|---|
| `GET /diaries?userId&from&to&status` | 모두 선택, `from`·`to`는 포함 범위 | `Diary[]` |
| `GET /diaries/:id` | – | `Diary` · 없으면 404 |
| `POST /diaries` | `SaveDiaryInput` (`diaryId` 없음) | `Diary` · 오늘(한국 날짜) 이후 날짜면 400 `VALIDATION_ERROR` |
| `PUT /diaries/:id` | `SaveDiaryInput` | `Diary` |

`SaveDiaryInput` = 일지 내용 전체 + `status: "draft" | "completed"` + `updatedAt`. 활동 목록을 통째로 보냅니다(활동 단위 API 없음).

**동시 수정 (B-3, 구현됨)**: PUT에는 불러오거나 마지막으로 저장할 때 받은 `updatedAt`을 그대로 보냅니다. 그사이 다른 사람이 저장했으면 서버가 409 `DIARY_UPDATED_BY_OTHER`로 거절합니다. 프론트는 자동 저장을 멈추고 "다른 분이 먼저 이 일지를 수정했어요" 확인 창을 띄운 뒤, '최신 내용 불러오기'를 누르면 입력을 버리고 서버 내용으로 바꿉니다('나중에'는 입력 유지). 처리는 [`DraftContext.tsx`](../src/app/DraftContext.tsx)에 있습니다.
완료 일지를 수정할 때도 `PUT /diaries/:id`에 `status: "completed"`를 보내며, 화면에서는 `userId`를 바꿀 수 없게 막습니다. mock은 완료 → 완료 저장을 `updated` 소식으로 남깁니다. 서버도 같은 규칙을 따르고, 완료 일지의 `userId` 변경은 거절하는 것을 권장합니다.

프론트의 조회 패턴은 다음과 같습니다. 서버 인덱스 설계에 참고하세요.

| 화면 | 조회 |
|---|---|
| 홈·일지 작성 | `from=to=오늘(또는 작성 날짜)` |
| 통계 | `userId` + `status=completed` + 추이 그래프 첫 구간부터 선택 기간 끝까지 |

달력은 일지 목록 대신 아래 달력 API를 쓴다.

### 달력

| 메서드 · 경로 | 요청 | 응답 |
|---|---|---|
| `GET /calendar?from&to` | 화면에 보이는 6주 (`from`=그리드 첫날, `to`=마지막 날, 최대 42일) | `CalendarDayCount[]` · 일지가 없는 날은 빠짐 · 형식 오류·42일 초과는 400 |
| `GET /calendar/days/:date` | – | `CalendarClientStatus[]` · 현재 이용 중인 이용자 전원 |

```ts
CalendarDayCount = { date, completed, draft, target, hasBehavior }
CalendarClientStatus = { clientId, clientName, status: "completed" | "draft" | "none",
                         diaryId?, authorId?, behaviorCount, canCreate }
```

- `target`(대상 이용자 수)은 현재 이용 중인 이용자 수다. 지난 날짜도 같은 값을 쓴다 (기준은 회의에서 확인)
- 종결된 이용자의 일지는 세지 않는다
- 도전적 행동 건수 규칙은 통계와 같다 (상위 '기타'는 내용이 있을 때만 1건, 작성 중 일지 포함)
- `canCreate`는 그날 일지가 없고, 오늘(한국 날짜) 이후 날짜가 아닐 때만 `true` (B-1). 화면은 이 값이 `false`인 미작성 줄을 누를 수 없게 하고 작성 버튼도 숨긴다

### 오늘의 소식

| 메서드 · 경로 | 요청 | 응답 |
|---|---|---|
| `GET /news?since=YYYY-MM-DD` | `since`(포함) 이후 발생분 | `NewsEntry[]`, 발생 시각 최신순 |

```ts
NewsEntry = {
  event: { id, diaryId, kind: "created" | "updated", actorId, occurredAt },
  diary: { id, userId, date }
}
```

### 이용자 · 직원

| 메서드 · 경로 | 요청 | 응답 |
|---|---|---|
| `GET /service-users` | – | `ServiceUser[]` (**종결 포함**. 과거 일지에 이름을 표시해야 하므로) |
| `POST /service-users` | `{ name, birthDate, assignedStaffId }` | `ServiceUser` |
| `PUT /service-users/:id` | 같음 | `ServiceUser` |
| `POST /service-users/:id/close` | – | `ServiceUser` (`status: "closed"`) |
| `GET /staff` | – | `Staff[]` |
| `POST /staff` | `{ name, loginId, department, position, role: "staff" }` | `Staff` · 아이디 중복은 409. 팀장·국장만. **담당자로만 만든다**(`role`이 `staff`가 아니면 400) |
| `POST /staff/:id/deactivate` | – | `Staff` (`active: false`). 팀장·국장만, 국장 계정은 국장만, 내 계정은 400 (구현됨) |
| `POST /staff/:id/activate` | – | `Staff` (`active: true`) (구현됨) |
| `POST /staff/:id/role` | `{ role: "staff" \| "teamLead" }` | `Staff` (role·position 바뀜). 팀장·국장만(403). 국장 계정 403, 내 계정·중지된 계정·`director` 400. 이미 그 역할이면 200 |
| `POST /staff/:id/transfer-director` | `{ previousRole: "teamLead" \| "deactivate" }` (생략하면 `teamLead`) | `{ director: Staff, previous: Staff }`. 국장만(403). 내 계정·중지된 계정 400. `deactivate`면 원래 국장은 팀장 + `active: false`가 되고 서버가 그 요청의 세션을 끊는다 |

- `GET /staff`는 사용 중지된 직원도 `active: false`로 함께 줍니다. 담당자 목록에 '사용 중지' 배지로 보이고, 이용자의 담당 직원 선택지에서는 빠집니다.
- 사용 중지 계정으로 로그인하면 403 `ACCOUNT_DISABLED`이고, 로그인 화면은 서버 문구를 그대로 보여 줍니다.
- 역할: 국장(`director`) > 팀장(`teamLead`) > 담당자(`staff`). **국장은 한 명**이고 관리 권한 이양으로만 바뀝니다.
- 역할 변경·이양의 오류는 상태 코드와 `message`만 봅니다. `message`를 그대로 토스트에 띄웁니다.
- 이양에서 `deactivate`를 고르면 프론트는 응답의 `previous.active === false`를 보고 캐시를 비운 뒤 로그인 화면으로 보냅니다(세션 만료 팝업 없음).

### 알림 (구현됨)

| 메서드 · 경로 | 요청 | 응답 |
|---|---|---|
| `GET /notifications/summary` | – | `{ unreadCount, lastReadAt? }`. 마지막으로 읽은 뒤 **다른 직원**이 남긴 소식 수 |
| `POST /notifications/read` | – | 204. 오늘의 소식 화면을 열 때 부름 |
| `GET /notifications/settings` | – | `{ notifyNewLog }` |
| `PUT /notifications/settings` | `{ notifyNewLog }` | 같음. 마이페이지 '새 일지 알림 받기' 스위치 |

- 헤더 종 아이콘의 점은 `notifyNewLog`가 켜져 있고 `unreadCount > 0`일 때만 보입니다. 서버는 알림을 꺼도 수를 세어 줍니다.

## 5. 데이터 모델

타입: [`src/types/index.ts`](../src/types/index.ts), [`src/api/types.ts`](../src/api/types.ts)

### 확정된 것 [확정]

- 일지 항목과 선택지: 날씨·컨디션(FR-10·11), 참여 활동(FR-19), 사전 지원(FR-21), 이용자 반응(FR-22), 긍정행동지원(FR-23), 도전적 행동 유형(FR-24)
- 일지 상태: 작성 중 / 작성 완료 (FR-15·16). 통계는 작성 완료만 집계
- 이용자 종결은 삭제가 아니며 과거 일지·통계 보존 (FR-91)
- 통계 집계 규칙 (개발계획서 「통계 집계 공통 규칙」). 프론트 구현은 `npm run check:data`로 검증

### 식별자 [프론트 가정]

| 데이터 | 저장 값 | 화면 표시 |
|---|---|---|
| 이용자·직원·일지 | 서버가 발급하는 `id` | 이름은 목록에서 `id`로 찾아 표시 |
| 일지의 작성자 | `authorId`, `lastEditorId` | 직원 목록에서 이름을 찾음 |
| 활동 | 프론트가 만든 임시 `id`(`act-...`)를 보냄 | 서버가 다시 발급해도 됨. 프론트는 저장 후 서버 응답의 `id`만 씀 |
| 도전적 행동 | 유형 코드(`selfHarm` 등) + 세부 항목 코드(`sh-1` 등) | 카탈로그에서 라벨을 찾음 |
| 그 밖의 선택 항목 | **한글 라벨 그대로** (`"맑음"`, `"예술활동"`) | 저장 값 = 표시 값 |

선택 항목을 라벨로 저장하고 있어서, 카테고리 이름이 바뀌면 과거 일지와 통계가 끊어집니다. B-4를 참고하세요.

## 6. 백엔드·기획과 협의해야 할 사항 [협의 필요]

| ID | 항목 | 현재 프론트 동작 | 결정할 것 |
|---|---|---|---|
| **B-1** | **이용자 1명당 하루 1건** | 개발계획서에 없는 목업 가정. 화면에서 새 작성을 막음: 홈 `오늘 일지 작성`은 담당 이용자에게 오늘 일지가 있으면 팝업 후 그 일지 상세로 이동, 달력은 일지가 있는 이용자에게 새 작성 버튼을 주지 않음, 작성 화면은 그런 이용자를 선택할 수 없고 저장도 막음. mock은 `diaryId` 없이 같은 이용자·날짜로 저장하면 **기존 일지를 덮어씀**(완료 일지 포함) | 규칙 자체를 확정할지. 확정한다면 덮어쓰기 대신 **409로 거절하고 기존 일지 id를 돌려주는 방식**을 권장(덮어쓰기는 다른 직원의 기록을 지울 수 있음) |
| **B-2** | 저장 중복 방지 | 자동 재시도 없음. 실패하면 목록을 다시 불러오고 안내 | 서버 멱등성(`Idempotency-Key` 헤더 등) 지원 여부. B-1이 409로 정해지면 일지 생성 중복은 서버가 막을 수 있음. 지금 mock은 응답을 잃은 뒤 다시 저장하면 `updated` 소식이 하나 더 생김 |
| **B-3** | 동시 수정 | **구현됨.** PUT에 `updatedAt`을 보내고, 409 `DIARY_UPDATED_BY_OTHER`면 확인 후 최신 내용을 불러옴 | – |
| **B-4** | 카테고리 값 형식 | 한글 라벨 저장 | 코드값 저장으로 바꿀지. 국장의 "카테고리 수정" 기능(1.3 대상 사용자)이 생기면 항목 목록을 서버에서 받아야 함 → 7-1 제안 |
| **B-5** | 작성 중 일지 보존 (U1) | 상단 `임시저장`은 서버에 저장하지 않음(알림만). `나중에 이어서`만 서버에 저장. 저장 전 입력은 **메모리에만** 있어 새로고침하면 사라짐(화면 이동 시에는 유지) | 상단 `임시저장`도 서버에 저장할지. 브라우저 저장소에 보관할지(개인정보가 담긴 기록이라 보안 검토 필요) |
| **B-6** | 화면 접근 제한 | 메뉴만 숨김(3장 표) | 권한별 화면 차단 여부와 역할 정의(팀장·국장 권한 미확정) |
| **B-7** | 다른 직원의 작성 중 일지 | 읽기만 가능하게 표시(FR-71) | 서버에서 수정을 막을지, 인계 기능이 필요한지 |
| **B-8** | 작성 중 일지의 이용자 변경 | 이어 쓰는 일지의 이용자를 바꾸면 그 일지의 `userId`가 바뀜. 같은 날짜에 대상 이용자의 일지가 이미 있으면 1일 2건이 될 수 있음 | 저장된 일지의 이용자 변경을 허용할지 |
| **B-9** | 자동 로그인 | 값만 전송 | 세션 유지 기간, 공용 기기 정책 |
| **B-10** | 소식 조회 단위 | `since` 날짜 범위(3일씩 추가) | 커서 기반 페이지네이션 여부 |
| **B-11** | 통계 집계 위치 | 프론트 집계 (8장) | 서버 집계 전환 시점 |
| **B-12** | 파일 출력 (U5) | 일일 기록지·일지 모아 출력·월간 기록은 프론트에서 docx 생성. 엑셀은 미연동 (9장) | 엑셀의 형식·생성 방식·엔드포인트 |
| **B-13** | 알림 설정 | **구현됨.** 서버에 저장(`/notifications/settings`). 앱 안 종 아이콘 점만 있고 푸시 알림은 없음 | 푸시 알림이 필요한지 |

## 7. 새 API 제안 [제안]

아래는 **확정 API가 아닙니다.** 프론트가 필요로 하는 모양을 제안한 것이며, 백엔드가 다른 형태로 정해도 됩니다.

### 7-1. 카테고리 조회 (B-4 관련)

**조회는 구현·연결됨.** 일지 작성(날씨·컨디션), 활동 입력(참여 활동·사전 지원·이용자 반응·긍정행동지원), 도전적 행동 세부 항목 화면이 이 목록을 씁니다([`useCategoryChoices`](../src/app/useCategoryChoices.ts)). 받기 전이나 실패하면 `catalog.ts` 기본 목록으로 그립니다. `active: false` 항목은 새로 고를 수 없고, 이미 고른 일지를 고칠 때만 보입니다. 저장 값은 아직 라벨이며(서버가 띄어쓰기를 무시하고 찾음), 코드 저장 전환은 남아 있습니다. 참여 활동 추가·이름 변경·숨기기(`POST /categories/participation`, `PUT /categories/participation/:code`)는 마이페이지 > 참여 활동 관리(`/settings/participation`, 팀장·국장 메뉴)에서 합니다. 아래는 처음 제안한 모양입니다.

```
GET /categories
→ {
    "participation": [ { "code": "daily-living", "label": "일상생활훈련", "order": 1, "active": true }, ... ],
    "preSupport":    [ ... ],
    "reaction":      [ ... ],
    "positiveSupport": [ ... ],
    "condition":     [ ... ],
    "weather":       [ ... ],
    "behaviorDetails": { "selfHarm": [ { "code": "sh-1", "label": "...", ... } ], ... }
  }
```

- 일지에는 `code`를 저장하고, 화면은 `label`로 표시합니다.
- 항목을 지울 때는 `active: false`로 숨겨야 과거 일지와 통계에서 이름을 계속 표시할 수 있습니다.
- 이름을 바꿔도 `code`가 같으면 과거 통계가 이어집니다.
- 프론트 영향: 현재 하드코딩된 [`catalog.ts`](../src/data/catalog.ts)를 조회 결과로 바꾸고, 통계 정렬 순서(`CATEGORY_ORDER`)를 `order`로 바꿔야 합니다.

### 7-2. 통계 집계 (B-11 관련)

**구현됨.** 통계 화면 4개가 아래 응답 하나를 함께 씁니다. 타입은 [`api/types.ts`](../src/api/types.ts)의 `StatsSummary`입니다.

```
GET /stats/summary?userId&unit=week|month|quarter|year&year&month&quarter&week
→ { period, completedDiaries,
    behavior: { count, days, delta, previousEmpty, byType, typeSummary, trend[], details[], records[] },
    participation: CountItem[], reaction: CountItem[], preSupport: CountItem[],
    positiveSupport: CountItem[], condition: CountItem[],
    activities: { totalCount, kindCount, otherCount, behaviorByParticipation[], reactionByParticipation[] } }
```

- 항목 목록은 0건까지 들어 있고, 통계 메인은 0건을 빼고 보여 줍니다.
- 유형 필터(도전적 행동 상세)와 기준 참여 활동(참여 활동 상세)은 화면이 이 응답에서 골라 그립니다. 처음 제안한 `/stats/behaviors`·`/stats/activities`는 만들지 않았습니다.
- mock은 [`statsService.ts`](../src/services/statsService.ts)의 `statsSummary`로 같은 응답을 만듭니다. 백엔드 `StatsService`와 규칙이 같아야 하며, 같은 DB 일지로 비교해 값이 같음을 확인했습니다.

### 7-3. 파일 출력 (B-12 관련)

형식이 정해지지 않아 두 가지 방식을 모두 적어 둡니다.

| 방식 | 흐름 | 맞는 경우 |
|---|---|---|
| 동기 다운로드 | `POST /exports/{diaries\|monthly\|excel}` `{ userIds, from, to }` → 파일 바이너리(`Content-Disposition`) | 작은 파일, 엑셀 |
| 비동기 작업 | `POST /exports/...` → `{ jobId }`, `GET /exports/:jobId` → `{ status, downloadUrl }` | 여러 이용자·긴 기간의 PDF·HWPX처럼 생성에 시간이 걸리는 경우 |

## 8. 통계

- **집계 위치**: 서버(`GET /stats/summary`, 7-2). 화면은 [`useStatsSummary.ts`](../src/app/useStatsSummary.ts)로 숫자만 받습니다.
- **집계 범위**: 선택한 이용자의 작성 완료 일지. 추이 그래프는 아래 구간 수만큼, 이전 동기간 비교(FR-34)는 바로 앞 같은 단위 기간입니다. `previousEmpty`는 그 기간의 작성 완료 일지가 0건일 때만 `true`입니다(도전적 행동 0건과 구분).

| 조회 단위 | 추이 구간 (FR-35 제안값) | 추이 그래프가 덮는 기간 |
|---|---|---|
| 주 | 6주 | 약 6주 |
| 월 | 6개월 | 6개월 |
| 분기 | 4분기 | 1년 |
| 연 | 5년 | **5년** |

- 예전에는 일지 목록을 받아 프론트가 계산해서, 연 단위에서는 5년치 일지를 한 번에 받아야 했습니다. 서버 집계로 바꿔 숫자만 받습니다.

## 9. 파일 출력 현황

- 구현된 것
  - 출력 설정 화면 3종(대상 이용자·기간 선택, 진행 표시)
  - 일지 모아 출력: 출력 API 없이 `GET /diaries?userId&from&to&status=completed`로 받아 일일 기록지 docx 한 파일을 브라우저에서 만듭니다. 이용자 한 명, 날짜순 하루 한 페이지, 일지 없는 날은 건너뜁니다. 양식은 단건 출력과 같은 파일을 반복형으로 바꿔 씁니다.
  - 한 번에 92일까지: 하루를 꽉 채운 일지(활동 10개) 31건이 PC에서 약 0.6초 걸립니다. 휴대폰은 3~4배 느려서 3개월이면 몇 초 안에 끝나는 범위로 정했습니다.
  - 월간 기록: 출력 API 없이 이용자마다 `GET /diaries?userId&from&to&status=completed`(그 달 1일~말일)로 받아 월별활동일지 docx를 브라우저에서 만들고, 이용자마다 파일 하나씩 연달아 내려받습니다. 값 규칙은 [`monthlyRecordService.ts`](../src/services/monthlyRecordService.ts) 맨 위 주석에 있습니다. 양식 안 그림 2개(월간 발생 행동, 막대그래프)는 캔버스로 그려 바꿔 끼웁니다.
  - 템플릿은 원본 양식(`src/assets/forms/monthly-record.docx`)에서 `scripts/build-monthly-template.cjs`로 만듭니다. 양식이 바뀌면 다시 돌립니다.
- 구현되지 않은 것: 엑셀의 파일 생성. 버튼을 누르면 "출력 기능은 준비 중이에요"라고 안내하고, 파일이 만들어진 것처럼 표시하지 않습니다.
- 형식에 따라 달라지는 설계:
  - 엑셀: 서버가 바로 파일을 만들 수 있음
  - PDF·HWPX: 복지관 양식(FR-78)이 확정되어야 하고 생성 시간이 길 수 있음 → 7-3 비동기 방식 검토
  - 모바일 브라우저 다운로드 동작 확인 필요
