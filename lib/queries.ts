/*
  서버 공통 — 화면 데이터 읽기 (서버 화면과 달력 API가 부름)
  전부 prismaRead(HTTP)로 읽고 중첩 관계는 JOIN 한 번. 반환값은 Date → ISO 문자열로 맞춤

  @date : 2026-09-14
*/

import type { Prisma } from "@/app/generated/prisma";
import { prismaRead } from "@/lib/prisma";
import { kstDay, kstMonthRange, shiftDay } from "@/lib/kst";
import type {
  CoachingNote,
  Meal,
  MemberDetail,
  MemberStats,
  MemberSummary,
  MonthCalendar,
  NutritionProfile,
  Role,
  Workout,
} from "@/types";
import { INBODY_FIELDS, isInbody, LOW_SESSIONS, MEAL_DAYS, toRole } from "@/types";

function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const NEWEST_FIRST = [{ date: "desc" }, { createdAt: "desc" }] as const satisfies
  Prisma.WorkoutOrderByWithRelationInput[];

const WORKOUT_INCLUDE = {
  exercises: {
    orderBy: { order: "asc" },
    include: { sets: { orderBy: { order: "asc" } } },
  },
} satisfies Prisma.WorkoutInclude;

// ── 회원 목록 ────────────────────────────────

/** 볼 수 있는 회원(scope — lib/auth memberScope)의 목록 + 대시보드 집계 */
export async function getMemberList(
  scope: Prisma.MemberWhereInput,
): Promise<{ members: MemberSummary[]; stats: MemberStats }> {
  // "이번 주"는 타임존에 따라 경계가 흔들림. 최근 7일로 잡고 그대로 표기함
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sinceDate = kstDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

  const [recentCompletions, recentWorkouts, members] = await Promise.all([
    prismaRead.sessionCompletion.count({
      where: { member: scope, completedAt: { gte: since } },
    }),
    prismaRead.workout.count({
      where: { member: scope, byMember: false, date: { gte: sinceDate } },
    }),
    prismaRead.member.findMany({
      relationLoadStrategy: "join",
      where: scope,
      orderBy: { createdAt: "desc" },
      include: {
        weights: { orderBy: [...NEWEST_FIRST], take: 1, select: { weight: true } },
        completions: { orderBy: { completedAt: "desc" }, take: 1, select: { completedAt: true } },
        _count: { select: { workouts: { where: { byMember: false } }, completions: true } },
      },
    }),
  ]);

  const summaries = members.map(({ weights, completions, _count, ...member }) => ({
    ...member,
    latestWeight: weights[0]?.weight ?? null,
    lastCompletedAt: completions[0]?.completedAt ?? null,
    workoutCount: _count.workouts,
    completedSessions: _count.completions,
  }));

  return serialize({
    members: summaries,
    stats: {
      total: summaries.length,
      recentCompletions,
      recentWorkouts,
      // 3회 이하로 남은 회원은 재등록 안내가 필요함
      runningLow: summaries.filter(
        (m) => m.remainingSessions > 0 && m.remainingSessions <= LOW_SESSIONS,
      ).length,
    },
  });
}

// ── 수업 달력 ────────────────────────────────

/** 한국 달(YYYY-MM)의 완료한 수업과 아직 기록하지 않은 예약. 이른 것부터. */
export async function getMonthCalendar(
  scope: Prisma.MemberWhereInput,
  month: string,
): Promise<MonthCalendar> {
  const { start, end } = kstMonthRange(month);

  const [sessions, appointments] = await Promise.all([
    prismaRead.sessionCompletion.findMany({
      relationLoadStrategy: "join",
      where: { member: scope, completedAt: { gte: start, lt: end } },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        completedAt: true,
        member: { select: { id: true, name: true } },
      },
    }),
    prismaRead.appointment.findMany({
      relationLoadStrategy: "join",
      where: {
        member: scope,
        startsAt: { gte: start, lt: end },
        completionId: null,
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        memo: true,
        member: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    sessions: sessions.map((row) => ({
      id: row.id,
      completedAt: row.completedAt.toISOString(),
      memberId: row.member.id,
      memberName: row.member.name,
    })),
    appointments: appointments.map((row) => ({
      id: row.id,
      startsAt: row.startsAt.toISOString(),
      memberId: row.member.id,
      memberName: row.member.name,
      memo: row.memo,
    })),
  };
}

// ── 회원 상세 ────────────────────────────────

/** 수업 기록·코칭 메모는 최근 것부터 이만큼씩 받음. 기록이 쌓여도 화면 데이터가 커지지 않게 */
export const LESSON_PAGE = 20;
export const NOTE_PAGE = 20;

/** 주소의 ?lessons=·?notes= 값을 받을 개수로. page 단위로 맞춤 */
export function pageLimit(raw: string | string[] | undefined, page: number) {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n <= page) return page;
  return Math.min(Math.ceil(n / page) * page, 2000);
}

/** 그래프·기록 목록에 쓰는 체중 칸 + 인바디인지 가릴 칸 */
const WEIGHT_POINT_SELECT = {
  id: true,
  date: true,
  weight: true,
  ...Object.fromEntries(INBODY_FIELDS.map((field) => [field, true])),
} as { id: true; date: true; weight: true } & Record<(typeof INBODY_FIELDS)[number], true>;

/** 회원 상세에서 받을 개수 */
export interface DetailLimits {
  lessons: number;
  notes: number;
  mealDate: string; // 식단 탭이 여는 날
}

function detailInclude({ lessons, notes, mealDate }: DetailLimits) {
  return {
    completions: {
      orderBy: { completedAt: "desc" },
      take: lessons,
      include: { workout: { include: WORKOUT_INCLUDE } },
    },
    // 남은 수업이 없을 때 저장해 완료 내역 없이 홀로 남은 기록
    workouts: {
      where: { completion: null, byMember: false },
      orderBy: [...NEWEST_FIRST],
      take: lessons,
      include: WORKOUT_INCLUDE,
    },
    weights: { orderBy: [...NEWEST_FIRST], select: WEIGHT_POINT_SELECT },
    notes: { orderBy: [...NEWEST_FIRST], take: notes },
    nutrition: true,
    questions: { orderBy: { createdAt: "desc" } },
    meals: {
      where: { date: { gte: shiftDay(mealDate, -(MEAL_DAYS - 1)), lte: mealDate } },
      orderBy: [{ date: "desc" }, { createdAt: "asc" }],
    },
    _count: {
      select: {
        completions: true,
        workouts: { where: { completion: null, byMember: false } },
        notes: true,
      },
    },
  } satisfies Prisma.MemberInclude;
}

/** 개인 운동은 최근 것만 보여 줌 */
const PERSONAL_LIMIT = 30;

/** 초대 링크는 관리자만 봄. 화면으로 내려보내는 회원 데이터에서 뺌 */
const DETAIL_OMIT = { inviteToken: true, inviteExpiresAt: true } satisfies Prisma.MemberOmit;

async function readDetail(
  where: Prisma.MemberWhereInput,
  limits: DetailLimits,
): Promise<MemberDetail | null> {
  // 개인 운동·최근 인바디도 workouts·weights 관계라 include에 두 번 못 넣음. 따로 읽음
  const [member, personalWorkouts, inbody] = await Promise.all([
    prismaRead.member.findFirst({
      relationLoadStrategy: "join",
      where,
      omit: DETAIL_OMIT,
      include: detailInclude(limits),
    }),
    prismaRead.workout.findMany({
      relationLoadStrategy: "join",
      where: { member: where, byMember: true },
      orderBy: [...NEWEST_FIRST],
      take: PERSONAL_LIMIT,
      include: WORKOUT_INCLUDE,
    }),
    // 결과지 카드는 최근 인바디와 그 앞 기록만 씀
    prismaRead.weightRecord.findMany({
      where: { member: where, OR: INBODY_FIELDS.map((field) => ({ [field]: { not: null } })) },
      orderBy: [...NEWEST_FIRST],
      take: 2,
    }),
  ]);
  if (!member) return null;

  const { completions, workouts, weights, _count, ...rest } = member;
  return serialize<MemberDetail>({
    ...rest,
    personalWorkouts,
    completions: completions.map(({ workout: _workout, ...completion }) => completion),
    workouts: [...completions.flatMap((c) => (c.workout ? [c.workout] : [])), ...workouts],
    weights: weights.map((w) => ({
      id: w.id,
      date: w.date,
      weight: w.weight,
      skeletalMuscle: w.skeletalMuscle,
      bodyFatMass: w.bodyFatMass,
      inbody: isInbody(w),
    })),
    inbody,
    completionTotal: _count.completions,
    lessonTotal: _count.completions + _count.workouts,
    lessonLimit: limits.lessons,
    noteTotal: _count.notes,
    noteLimit: limits.notes,
  });
}

/** 회원 상세 — 운동/체중/코칭메모/수업완료/영양. 볼 수 없는 회원이면 null. */
export async function getMemberDetail(
  memberId: string,
  scope: Prisma.MemberWhereInput,
  limits: DetailLimits,
): Promise<MemberDetail | null> {
  return readDetail({ id: memberId, ...scope }, limits);
}

/** 회원 본인 화면 — 이 계정에 연결된 회원 기록. 연결이 없으면 null. */
export async function getMyRecord(userId: string, limits: DetailLimits): Promise<MemberDetail | null> {
  return readDetail({ userId }, limits);
}

// ── 계정 관리 ────────────────────────────────

/** 회원 연결 탭 한 줄 — 회원 기록과 담당 트레이너, 연결된 앱 계정 */
export interface AccountMemberRow {
  id: string;
  name: string;
  phone: string;
  trainerId: string;
  account: { id: string; email: string } | null;
  invite: { token: string; expiresAt: string } | null;
}

/** 계정·권한 탭 한 줄 — 로그인 계정 하나 */
export interface AccountUserRow {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  /** 회원 계정이 연결된 회원 기록 */
  linkedMember: { id: string; name: string } | null;
  /** 트레이너·관리자가 담당하는 회원 수 */
  memberCount: number;
  createdAt: string;
}

/** 관리자 계정 관리 화면 — 모든 회원 기록과 모든 로그인 계정 */
export async function getAccounts(): Promise<{
  members: AccountMemberRow[];
  users: AccountUserRow[];
}> {
  const now = new Date();
  const [members, users] = await Promise.all([
    prismaRead.member.findMany({
      relationLoadStrategy: "join",
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        trainerId: true,
        inviteToken: true,
        inviteExpiresAt: true,
        user: { select: { id: true, email: true } },
      },
    }),
    prismaRead.user.findMany({
      relationLoadStrategy: "join",
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        memberRecord: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    }),
  ]);

  return {
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      trainerId: m.trainerId,
      account: m.user,
      // 만료된 링크는 없는 것으로 보여 줌
      invite:
        m.inviteToken && m.inviteExpiresAt && m.inviteExpiresAt > now
          ? { token: m.inviteToken, expiresAt: m.inviteExpiresAt.toISOString() }
          : null,
    })),
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: toRole(u.role),
      linkedMember: u.memberRecord,
      memberCount: u._count.members,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

/** 초대 링크 화면 — 아직 쓸 수 있는 링크면 회원 이름. 만료·사용됨이면 null. */
export async function getInvite(token: string): Promise<{ memberName: string } | null> {
  const member = await prismaRead.member.findFirst({
    where: { inviteToken: token, inviteExpiresAt: { gt: new Date() }, userId: null },
    select: { name: true },
  });
  return member ? { memberName: member.name } : null;
}

// ── 작성 화면 ────────────────────────────────

export interface NoteEditorData {
  member: { id: string; name: string };
  note: CoachingNote | null;
}

/** 코칭 메모 작성·수정 화면. noteId가 없으면 메모는 읽지 않음 */
export async function getNoteEditor(
  memberId: string,
  scope: Prisma.MemberWhereInput,
  noteId?: string,
): Promise<NoteEditorData | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where: { id: memberId, ...scope },
    select: {
      id: true,
      name: true,
      notes: { where: { id: noteId }, take: noteId ? 1 : 0 },
    },
  });
  if (!member) return null;

  return serialize({
    member: { id: member.id, name: member.name },
    note: member.notes[0] ?? null,
  });
}

export interface WorkoutEditorData {
  member: { id: string; name: string; remainingSessions: number };
  workout: Workout | null;
  /** 수정할 기록에 연결된 수업 시각. 새 기록이거나 연결된 수업이 없으면 null */
  completedAt: string | null;
}

/** 운동 기록 작성·수정 화면. */
export async function getWorkoutEditor(
  memberId: string,
  scope: Prisma.MemberWhereInput,
  workoutId?: string,
): Promise<WorkoutEditorData | null> {
  const [member, target] = await Promise.all([
    prismaRead.member.findFirst({
      relationLoadStrategy: "join",
      where: { id: memberId, ...scope },
      select: {
        id: true,
        name: true,
        remainingSessions: true,
      },
    }),
    workoutId
      ? prismaRead.workout.findFirst({
          relationLoadStrategy: "join",
          where: { id: workoutId, memberId, member: scope, byMember: false },
          include: { ...WORKOUT_INCLUDE, completion: { select: { completedAt: true } } },
        })
      : null,
  ]);
  if (!member) return null;

  const { completion, ...workout } = target ?? { completion: null };

  return {
    member: {
      id: member.id,
      name: member.name,
      remainingSessions: member.remainingSessions,
    },
    workout: target ? serialize<Workout>(workout) : null,
    completedAt: completion?.completedAt.toISOString() ?? null,
  };
}

/** 회원 본인의 개인 운동 작성·수정 화면. 연결된 회원 기록이 없으면 null */
export async function getMyWorkoutEditor(
  userId: string,
  workoutId?: string,
): Promise<WorkoutEditorData | null> {
  const [member, target] = await Promise.all([
    prismaRead.member.findFirst({
      relationLoadStrategy: "join",
      where: { userId },
      select: {
        id: true,
        name: true,
        remainingSessions: true,
      },
    }),
    workoutId
      ? prismaRead.workout.findFirst({
          relationLoadStrategy: "join",
          where: { id: workoutId, byMember: true, member: { userId } },
          include: WORKOUT_INCLUDE,
        })
      : null,
  ]);
  if (!member) return null;

  return {
    member: { id: member.id, name: member.name, remainingSessions: member.remainingSessions },
    workout: target ? serialize<Workout>(target) : null,
    completedAt: null,
  };
}

export interface NutritionEditorData {
  member: { id: string; name: string };
  nutrition: NutritionProfile | null;
  latestWeight: number | null;
}

/** 영양 계산 화면. */
export async function getNutritionEditor(
  memberId: string,
  scope: Prisma.MemberWhereInput,
): Promise<NutritionEditorData | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where: { id: memberId, ...scope },
    select: {
      id: true,
      name: true,
      nutrition: true,
      weights: { orderBy: [...NEWEST_FIRST], take: 1, select: { weight: true } },
    },
  });
  if (!member) return null;

  return serialize({
    member: { id: member.id, name: member.name },
    nutrition: member.nutrition,
    latestWeight: member.weights[0]?.weight ?? null,
  });
}

// ── 식단 ─────────────────────────────────

export interface MealEditorData {
  member: { id: string; name: string };
  meals: Meal[]; // 그날 그 끼니에 이미 적은 것
}

/** 식단 한 끼 작성 화면 — 그날 그 끼니 기록. where로 담당 회원이나 회원 본인을 가림 */
async function readMealEditor(
  where: Prisma.MemberWhereInput,
  date: string,
  slot: string,
): Promise<MealEditorData | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where,
    select: {
      id: true,
      name: true,
      meals: { where: { date, slot }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!member) return null;

  return serialize({ member: { id: member.id, name: member.name }, meals: member.meals });
}

/** 트레이너가 회원 식단을 적는 화면 */
export function getMealEditor(
  memberId: string,
  scope: Prisma.MemberWhereInput,
  date: string,
  slot: string,
) {
  return readMealEditor({ id: memberId, ...scope }, date, slot);
}

/** 회원 본인이 식단을 적는 화면 */
export function getMyMealEditor(userId: string, date: string, slot: string) {
  return readMealEditor({ userId }, date, slot);
}
