import { ApiError, NETWORK_ERROR_STATUS } from "@/api/errors";
import { readDb, writeDb } from "@/api/mock/mockDb";
import type { Api, NewsEntry, SaveDiaryInput } from "@/api/types";
import { getFlags } from "@/demo/flagStore";
import { addDays, dateOf, uid } from "@/lib/utils";
import { calendarClientStatuses, calendarDayCounts } from "@/services/diaryService";
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
      updatedAt: now,
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
      writeDb((db) => ({ ...db, session: { currentStaffId: member.id } }));
      return clone(member);
    },
    async signup({ loginId, password, name, birthDate, role }) {
      await writeLatency();
      const id = loginId.trim().toLowerCase();
      if (readDb().staff.some((s) => s.loginId === id)) {
        throw new ApiError(409, "이미 사용 중인 아이디예요.", "DUPLICATE_LOGIN_ID");
      }
      const created: Staff = {
        id: uid("stf"),
        name: name.trim(),
        department: "주간활동지원팀",
        position: ROLE_POSITION[role],
        role,
        loginId: id,
        birthDate,
      };
      writeDb((db) => ({
        ...db,
        staff: [...db.staff, created],
        passwords: { ...db.passwords, [created.id]: password },
      }));
      return clone(created);
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
    async create(input) {
      await writeLatency();
      requireSession();
      if (readDb().staff.some((s) => s.loginId === input.loginId)) {
        throw new ApiError(409, "이미 사용 중인 아이디예요.", "DUPLICATE_LOGIN_ID");
      }
      const created: Staff = { ...input, id: uid("stf") };
      writeDb((db) => ({ ...db, staff: [...db.staff, created] }));
      return clone(created);
    },
  },
};

/** DEMO_ONLY — 시연 패널의 가상 역할 전환. 실제 권한을 보장하는 코드가 아니다 */
export function mockSwitchStaff(staffId: string): void {
  writeDb((db) => ({ ...db, session: { currentStaffId: staffId } }));
}
