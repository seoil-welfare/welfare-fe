import { ApiError, NETWORK_ERROR_STATUS } from "@/api/errors";
import { readDb, writeDb, type MockNotificationState } from "@/api/mock/mockDb";
import type { Api, CategoryItem, NewsEntry, SaveDiaryInput } from "@/api/types";
import { getFlags } from "@/demo/flagStore";
import { addDays, dateOf, uid } from "@/lib/utils";
import { calendarClientStatuses, calendarDayCounts, isStaffActive } from "@/services/diaryService";
import { defaultCategories } from "@/services/categoryService";
import { statsSummary } from "@/services/statsService";
import { ROLE_POSITION } from "@/types";
import type { Diary, DiaryEvent, ServiceUser, Staff } from "@/types";

/**
 * 가상 서버 API.
 * 실제 백엔드가 맡을 규칙(id 발급, 작성자 기록, 소식 생성)을 여기서 처리한다.
 * '이용자 1명당 하루 1건'은 개발계획서에 없는 목업 시연용 가정이다 (docs/backend-integration.md B-1).
 * 화면 코드는 이 구현과 http 구현을 구분하지 않는다.
 */

export const MOCK_PASSWORD = "demo1234";

const SLOW_DELAY_MS = 3000;

/** 참여 활동 이름 길이. 백엔드 activity_type.name VARCHAR(30)과 같다 */
const PARTICIPATION_MAX_LABEL = 30;

/** 달력 6주. 백엔드 CalendarService.MAX_DAYS와 같다 */
const CALENDAR_MAX_DAYS = 42;

let latencyEnabled = true;

/** 검증 스크립트용 — 응답 지연을 끈다 */
export function setMockLatency(enabled: boolean): void {
  latencyEnabled = enabled;
}

function wait(ms: number): Promise<void> {
  if (!latencyEnabled) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 조회 지연과 관찰용 실패를 흉내 낸다 */
async function readLatency(): Promise<void> {
  const flags = getFlags();
  await wait(flags.slowLoading ? SLOW_DELAY_MS : 120 + Math.random() * 180);
  if (flags.forceLoadFailure) {
    throw new ApiError(NETWORK_ERROR_STATUS, "기록을 불러오지 못했어요. 네트워크 상태를 확인해 주세요.");
  }
}

async function writeLatency(): Promise<void> {
  await wait(300 + Math.random() * 200);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function requireSession(): Staff {
  const db = readDb();
  const staff = db.staff.find((s) => s.id === db.session.currentStaffId);
  if (!staff) throw new ApiError(401, "로그인이 필요해요.");
  return staff;
}

function findStaff(staffId: string): Staff {
  const staff = readDb().staff.find((s) => s.id === staffId);
  if (!staff) throw notFound("직원");
  return staff;
}

/** 직원 한 명의 값을 바꾸고 바뀐 정보를 돌려준다 */
function updateStaff(staffId: string, patch: Partial<Staff>): Staff {
  writeDb((db) => ({
    ...db,
    staff: db.staff.map((s) => (s.id === staffId ? { ...s, ...patch } : s)),
  }));
  return clone(findStaff(staffId));
}

function notFound(what: string): ApiError {
  return new ApiError(404, "찾을 수 없는 " + what + "예요.");
}

/** 소식 목록. 작성 중인 일지는 등록·수정 내역으로 올리지 않으므로 이벤트가 없다 */
export function toNewsEntries(
  events: readonly DiaryEvent[],
  diaries: readonly Diary[],
  since: string,
): NewsEntry[] {
  const byId = new Map(diaries.map((d) => [d.id, d]));
  return events
    .filter((event) => dateOf(event.occurredAt) >= since)
    .flatMap((event) => {
      const diary = byId.get(event.diaryId);
      return diary ? [{ event, diary: { id: diary.id, userId: diary.userId, date: diary.date } }] : [];
    })
    .sort((a, b) => b.event.occurredAt.localeCompare(a.event.occurredAt));
}

function saveDiary(input: SaveDiaryInput, author: Staff): Diary {
  const now = new Date().toISOString();
  let saved: Diary | null = null;

  writeDb((db) => {
    // 목업 가정(미확정): 이용자 1명당 하루 1건. id 없이 저장하면 그 날짜의 기존 일지를 갱신한다.
    // 이 경우 기존 내용이 덮어써진다. 운영 규칙(갱신 vs 409 거절)은 백엔드와 협의한다.
    const index = input.diaryId
      ? db.diaries.findIndex((d) => d.id === input.diaryId)
      : db.diaries.findIndex((d) => d.userId === input.userId && d.date === input.date);
    if (input.diaryId && index < 0) throw notFound("일지");

    const previous = index >= 0 ? db.diaries[index] : null;
    // 불러온 뒤 다른 사람이 먼저 저장했으면 덮어쓰지 않는다 (명세 4.6, 백엔드와 같은 규칙)
    if (input.diaryId && previous) {
      if (!input.updatedAt) {
        throw new ApiError(400, "일지를 다시 불러온 뒤 저장해 주세요.", "VALIDATION_ERROR");
      }
      if (input.updatedAt !== previous.updatedAt) {
        throw new ApiError(
          409,
          "다른 분이 먼저 수정했어요. 최신 내용을 다시 불러와 주세요.",
          "DIARY_UPDATED_BY_OTHER",
        );
      }
    }
    // 작성 완료된 일지를 다시 저장하면 수정 이력이 된다 (일지 상세 공통 규칙 3)
    const kind: DiaryEvent["kind"] = previous?.status === "completed" ? "updated" : "created";

    const next: Diary = {
      id: previous?.id ?? uid("dry"),
      userId: input.userId,
      date: input.date,
      authorId: previous?.authorId ?? author.id,
      lastEditorId: kind === "updated" ? author.id : previous?.lastEditorId,
      status: input.status,
      weather: input.weather,
      condition: input.condition,
      conditionOther: input.conditionOther,
      activities: clone(input.activities),
      notes: input.notes,
      createdAt: previous?.createdAt ?? now,
      updatedAt: nextUpdatedAt(previous?.updatedAt, now),
    };
    saved = next;

    const diaries =
      index >= 0 ? db.diaries.map((d, i) => (i === index ? next : d)) : [...db.diaries, next];

    // 작성 중인 일지는 소식에 등록·수정 내역으로 올리지 않는다 (작성 중 공통 규칙 1)
    const events =
      input.status === "completed"
        ? [
            { id: uid("evt"), diaryId: next.id, kind, actorId: author.id, occurredAt: now },
            ...db.events,
          ]
        : db.events;

    return { ...db, diaries, events };
  });

  return clone(saved!);
}

/**
 * 저장할 때마다 updatedAt이 반드시 바뀌게 한다. 동시 수정 비교(409)에 쓰므로
 * 같은 밀리초에 연달아 저장해도 이전 값과 겹치면 안 된다 (서버는 마이크로초까지 저장한다)
 */
function nextUpdatedAt(previous: string | undefined, now: string): string {
  if (!previous || now > previous) return now;
  return new Date(Date.parse(previous) + 1).toISOString();
}

function updateServiceUser(userId: string, patch: Partial<ServiceUser>): ServiceUser {
  const db = writeDb((current) => {
    if (!current.serviceUsers.some((u) => u.id === userId)) throw notFound("이용자");
    return {
      ...current,
      // 이용자 고유 식별자는 이름·담당자 변경과 관계없이 유지된다 (이용자 공통 규칙 3)
      serviceUsers: current.serviceUsers.map((u) =>
        u.id === userId ? { ...u, ...patch, id: userId } : u,
      ),
    };
  });
  return clone(db.serviceUsers.find((u) => u.id === userId)!);
}

/** 백엔드 AuthService.temporaryPassword와 같은 글자(헷갈리는 0 O 1 l I 제외)로 12자 */
function mockTemporaryPassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const mockApi: Api = {
  auth: {
    async login({ loginId, password }) {
      await writeLatency();
      const db = readDb();
      const member = db.staff.find((s) => s.loginId === loginId.trim().toLowerCase());
      if (!member || password !== (db.passwords?.[member.id] ?? MOCK_PASSWORD)) {
        throw new ApiError(
          401,
          "아이디 또는 비밀번호가 일치하지 않아요. 데모 계정을 확인해 주세요.",
          "INVALID_CREDENTIALS",
        );
      }
      if (!isStaffActive(member)) {
        throw new ApiError(403, "사용이 중지된 계정이에요. 관리자에게 문의해 주세요.", "ACCOUNT_DISABLED");
      }
      writeDb((db) => ({ ...db, session: { currentStaffId: member.id } }));
      return clone(member);
    },
    async logout() {
      writeDb((db) => ({ ...db, session: { currentStaffId: null } }));
    },
    async me() {
      const db = readDb();
      const member = db.staff.find((s) => s.id === db.session.currentStaffId);
      return member ? clone(member) : null;
    },
    async changePassword() {
      await writeLatency();
      requireSession();
      // 시연에서는 실제로 바꾸지 않는다 (지시서 4.5)
    },
  },

  diaries: {
    async list(query) {
      await readLatency();
      return clone(
        readDb()
          .diaries.filter(
            (d) =>
              (!query.userId || d.userId === query.userId) &&
              (!query.status || d.status === query.status) &&
              (!query.from || d.date >= query.from) &&
              (!query.to || d.date <= query.to),
          )
          .sort((a, b) => a.date.localeCompare(b.date) || a.userId.localeCompare(b.userId)),
      );
    },
    async get(diaryId) {
      await readLatency();
      const diary = readDb().diaries.find((d) => d.id === diaryId);
      if (!diary) throw notFound("일지");
      return clone(diary);
    },
    async save(input) {
      await writeLatency();
      return saveDiary(input, requireSession());
    },
  },

  calendar: {
    async days({ from, to }) {
      await readLatency();
      if (!from || !to) throw new ApiError(400, "from과 to 날짜가 필요해요.", "VALIDATION_ERROR");
      if (from > to) throw new ApiError(400, "from이 to보다 늦을 수 없어요.", "VALIDATION_ERROR");
      if (addDays(from, CALENDAR_MAX_DAYS) <= to) {
        throw new ApiError(400, "한 번에 " + CALENDAR_MAX_DAYS + "일까지만 조회할 수 있어요.", "VALIDATION_ERROR");
      }
      const db = readDb();
      return calendarDayCounts(db.diaries, db.serviceUsers, from, to);
    },
    async clientStatuses(date) {
      await readLatency();
      const db = readDb();
      return calendarClientStatuses(db.diaries, db.serviceUsers, date);
    },
  },


  stats: {
    async summary({ userId, ...period }) {
      await readLatency();
      if (!userId) throw new ApiError(400, "userId가 필요해요.", "VALIDATION_ERROR");
      return statsSummary(readDb().diaries, userId, period);
    },
  },

  news: {
    async list({ since }) {
      await readLatency();
      if (getFlags().forceEmptyNews) return [];
      const db = readDb();
      return clone(toNewsEntries(db.events, db.diaries, since));
    },
  },

  serviceUsers: {
    async list() {
      await readLatency();
      return clone(readDb().serviceUsers);
    },
    async create(input) {
      await writeLatency();
      requireSession();
      const created: ServiceUser = { ...input, id: uid("usr"), status: "active" };
      writeDb((db) => ({ ...db, serviceUsers: [...db.serviceUsers, created] }));
      return clone(created);
    },
    async update(userId, input) {
      await writeLatency();
      requireSession();
      return updateServiceUser(userId, input);
    },
    async close(userId) {
      await writeLatency();
      requireSession();
      // 종결은 삭제가 아니다. 과거 일지는 그대로 남는다 (FR-91)
      return updateServiceUser(userId, { status: "closed" });
    },
  },

  staff: {
    async list() {
      await readLatency();
      return clone(readDb().staff);
    },
    // 규칙은 백엔드 AuthService.createStaff와 같다. 계정 추가는 담당자로만
    async create(input) {
      await writeLatency();
      const me = requireSession();
      if (me.role !== "teamLead" && me.role !== "director") {
        throw new ApiError(403, "계정 추가는 팀장·국장만 할 수 있어요.", "FORBIDDEN");
      }
      if ((input.role as string) !== "staff") {
        throw new ApiError(400, "계정 추가는 담당자로만 할 수 있어요. 팀장은 역할 변경으로 바꿔 주세요.", "VALIDATION_ERROR");
      }
      if (readDb().staff.some((s) => s.loginId === input.loginId)) {
        throw new ApiError(409, "이미 사용 중인 아이디예요.", "DUPLICATE_LOGIN_ID");
      }
      const created: Staff = { ...input, position: ROLE_POSITION.staff, id: uid("stf") };
      const temporaryPassword = mockTemporaryPassword();
      writeDb((db) => ({
        ...db,
        staff: [...db.staff, created],
        passwords: { ...db.passwords, [created.id]: temporaryPassword },
      }));
      return { ...clone(created), temporaryPassword };
    },
    // 규칙은 백엔드 AuthService.setStaffActive와 같다
    async setActive(staffId, active) {
      await writeLatency();
      const me = requireSession();
      if (me.role !== "teamLead" && me.role !== "director") {
        throw new ApiError(403, "계정 사용 중지는 팀장·국장만 할 수 있어요.", "FORBIDDEN");
      }
      const target = readDb().staff.find((s) => s.id === staffId);
      if (!target) throw notFound("직원");
      if (target.role === "director" && me.role !== "director") {
        throw new ApiError(403, "국장 계정은 국장만 바꿀 수 있어요.", "FORBIDDEN");
      }
      if (!active && staffId === me.id) {
        throw new ApiError(400, "내 계정은 사용 중지할 수 없어요.", "VALIDATION_ERROR");
      }
      writeDb((db) => ({
        ...db,
        staff: db.staff.map((s) => (s.id === staffId ? { ...s, active } : s)),
      }));
      return clone(readDb().staff.find((s) => s.id === staffId)!);
    },
    // 규칙은 백엔드 AuthService.changeRole과 같다 (be-지시-직원권한관리.md 2.1)
    async changeRole(staffId, role) {
      await writeLatency();
      const me = requireSession();
      if (me.role !== "teamLead" && me.role !== "director") {
        throw new ApiError(403, "역할 변경은 팀장·국장만 할 수 있어요.", "FORBIDDEN");
      }
      if ((role as string) !== "staff" && (role as string) !== "teamLead") {
        throw new ApiError(400, "역할은 담당자 또는 팀장만 고를 수 있어요.", "VALIDATION_ERROR");
      }
      const target = findStaff(staffId);
      if (target.role === "director") {
        throw new ApiError(403, "국장 계정의 역할은 바꿀 수 없어요.", "FORBIDDEN");
      }
      if (target.id === me.id) {
        throw new ApiError(400, "내 계정의 역할은 바꿀 수 없어요.", "VALIDATION_ERROR");
      }
      if (target.active === false) {
        throw new ApiError(400, "사용 중지된 계정의 역할은 바꿀 수 없어요.", "VALIDATION_ERROR");
      }
      return updateStaff(staffId, { role, position: ROLE_POSITION[role] });
    },
    // 규칙은 백엔드 AuthService.transferDirector와 같다 (be-지시-직원권한관리.md 2.2)
    async transferDirector(staffId, previousRole) {
      await writeLatency();
      const me = requireSession();
      if (me.role !== "director") {
        throw new ApiError(403, "관리 권한 이양은 국장만 할 수 있어요.", "FORBIDDEN");
      }
      if (previousRole !== "teamLead" && previousRole !== "deactivate") {
        throw new ApiError(400, "이양 뒤 내 계정을 어떻게 할지 골라 주세요.", "VALIDATION_ERROR");
      }
      const target = findStaff(staffId);
      if (target.id === me.id) {
        throw new ApiError(400, "내 계정에는 넘길 수 없어요.", "VALIDATION_ERROR");
      }
      if (target.active === false) {
        throw new ApiError(400, "사용 중지된 계정에는 넘길 수 없어요.", "VALIDATION_ERROR");
      }
      // 원래 국장을 먼저 내리고 받는 사람을 올린다 (국장은 늘 한 명)
      const previous = updateStaff(me.id, {
        role: "teamLead",
        position: ROLE_POSITION.teamLead,
        ...(previousRole === "deactivate" ? { active: false } : {}),
      });
      const director = updateStaff(staffId, { role: "director", position: ROLE_POSITION.director });
      if (previousRole === "deactivate") {
        writeDb((db) => ({ ...db, session: { currentStaffId: null } })); // 서버처럼 세션을 끊는다
      }
      return { director, previous };
    },
  },

  // 규칙은 백엔드 NotificationService와 같다. 내가 남긴 소식은 세지 않는다
  // mock 직원에는 가입 시각이 없어서, 한 번도 안 읽었으면 소식 전체를 센다
  notifications: {
    async summary() {
      await readLatency();
      const me = requireSession();
      const db = readDb();
      const { readAt } = notificationState(me.id);
      const unreadCount = db.events.filter(
        (e) => e.actorId !== me.id && (!readAt || e.occurredAt > readAt),
      ).length;
      return readAt ? { unreadCount, lastReadAt: readAt } : { unreadCount };
    },
    async markAllRead() {
      const me = requireSession();
      setNotificationState(me.id, { readAt: new Date().toISOString() });
    },
    async settings() {
      await readLatency();
      return { notifyNewLog: notificationState(requireSession().id).notifyNewLog };
    },
    async updateSettings({ notifyNewLog }) {
      await writeLatency();
      setNotificationState(requireSession().id, { notifyNewLog });
      return { notifyNewLog };
    },
  },

  // 참여 활동만 관리 화면에서 바뀐다. 규칙은 백엔드 CategoryService와 같다
  categories: {
    async list() {
      await readLatency();
      return { ...defaultCategories(), participation: clone(participationItems()) };
    },
    async addParticipation(rawLabel) {
      await writeLatency();
      requireManager();
      const label = checkParticipationLabel(rawLabel);
      const items = participationItems();
      const etcIndex = items.findIndex((item) => item.etc);
      const created: CategoryItem = { code: uid("custom"), label, order: 0, active: true, etc: false };
      // '기타'는 항상 맨 끝
      const next = etcIndex < 0 ? [...items, created] : [...items.slice(0, etcIndex), created, ...items.slice(etcIndex)];
      writeDb((db) => ({ ...db, participation: next.map((item, i) => ({ ...item, order: i + 1 })) }));
      return clone({ ...created, order: next.indexOf(created) + 1 });
    },
    async updateParticipation(code, input) {
      await writeLatency();
      requireManager();
      const current = participationItems().find((item) => item.code === code);
      if (!current) throw notFound("참여 활동");
      if (input.label === undefined && input.active === undefined) {
        throw new ApiError(400, "바꿀 이름이나 사용 여부를 보내 주세요.", "VALIDATION_ERROR");
      }
      const label = input.label === undefined ? current.label : checkParticipationLabel(input.label, code);
      if (input.active === false && current.etc) {
        throw new ApiError(400, "'기타'는 숨길 수 없어요.", "VALIDATION_ERROR");
      }
      const updated = { ...current, label, active: input.active ?? current.active };
      writeDb((db) => ({
        ...db,
        participation: participationItems().map((item) => (item.code === code ? updated : item)),
      }));
      return clone(updated);
    },
  },
};

function participationItems(): CategoryItem[] {
  return readDb().participation ?? defaultCategories().participation;
}

function requireManager(): Staff {
  const me = requireSession();
  if (me.role !== "teamLead" && me.role !== "director") {
    throw new ApiError(403, "참여 활동은 팀장·국장만 바꿀 수 있어요.", "FORBIDDEN");
  }
  return me;
}

/** 이름 검사. 띄어쓰기만 다른 이름도 같은 이름으로 본다 (selfCode는 수정할 때 자기 자신) */
function checkParticipationLabel(raw: string, selfCode?: string): string {
  const label = raw.trim();
  if (!label) throw new ApiError(400, "참여 활동 이름을 입력해 주세요.", "VALIDATION_ERROR");
  if (label.length > PARTICIPATION_MAX_LABEL) {
    throw new ApiError(400, "참여 활동 이름은 " + PARTICIPATION_MAX_LABEL + "자까지 쓸 수 있어요.", "VALIDATION_ERROR");
  }
  const key = label.replaceAll(" ", "");
  const duplicate = participationItems().find(
    (item) => item.code !== selfCode && item.label.replaceAll(" ", "") === key,
  );
  if (duplicate) {
    throw new ApiError(409, "이미 있는 참여 활동 이름이에요: " + duplicate.label, "DUPLICATE_CATEGORY");
  }
  return label;
}

function notificationState(staffId: string): MockNotificationState {
  return readDb().notifications?.[staffId] ?? { notifyNewLog: true };
}

function setNotificationState(staffId: string, patch: Partial<MockNotificationState>): void {
  writeDb((db) => ({
    ...db,
    notifications: { ...db.notifications, [staffId]: { ...notificationState(staffId), ...patch } },
  }));
}

/** DEMO_ONLY — 시연 패널의 가상 역할 전환. 실제 권한을 보장하는 코드가 아니다 */
export function mockSwitchStaff(staffId: string): void {
  writeDb((db) => ({ ...db, session: { currentStaffId: staffId } }));
}
