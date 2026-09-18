/*
  서버 공통 — 화면 데이터 읽기 (서버 화면과 달력 API가 부름)
  전부 prismaRead(HTTP)로 읽고 중첩 관계는 JOIN 한 번. 반환값은 Date → ISO 문자열로 맞춤

  @date : 2026-09-14
*/

import type { Prisma } from "@/app/generated/prisma";
import { prismaRead } from "@/lib/prisma";
import { kstDay, kstMonthRange } from "@/lib/kst";
import type {
  CoachingNote,
  ExerciseSet,
  MemberDetail,
  MemberStats,
  MemberSummary,
  MonthCalendar,
  NutritionProfile,
  Role,
  Workout,
} from "@/lib/types";
import { formatSet, toRole } from "@/lib/types";

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
      where: { member: scope, date: { gte: sinceDate } },
    }),
    prismaRead.member.findMany({
      relationLoadStrategy: "join",
      where: scope,
      orderBy: { createdAt: "desc" },
      include: {
        weights: { orderBy: [...NEWEST_FIRST], take: 1, select: { weight: true } },
        _count: { select: { workouts: true, completions: true } },
      },
    }),
  ]);

  const summaries = members.map(({ weights, _count, ...member }) => ({
    ...member,
    latestWeight: weights[0]?.weight ?? null,
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
        (m) => m.remainingSessions > 0 && m.remainingSessions <= 3,
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

/** 수업 기록은 최근 것부터 이만큼씩 받음. 기록이 쌓여도 화면 데이터가 커지지 않게 */
export const LESSON_PAGE = 20;

/** 주소의 ?lessons= 값을 받을 수업 기록 수로. LESSON_PAGE 단위로 맞춤 */
export function lessonLimit(raw: string | string[] | undefined) {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n <= LESSON_PAGE) return LESSON_PAGE;
  return Math.min(Math.ceil(n / LESSON_PAGE) * LESSON_PAGE, 2000);
}

function detailInclude(lessons: number) {
  return {
    completions: {
      orderBy: { completedAt: "desc" },
      take: lessons,
      include: { workout: { include: WORKOUT_INCLUDE } },
    },
    // 남은 수업이 없을 때 저장해 완료 내역 없이 홀로 남은 기록
    workouts: {
      where: { completion: null },
      orderBy: [...NEWEST_FIRST],
      take: lessons,
      include: WORKOUT_INCLUDE,
    },
    weights: { orderBy: [...NEWEST_FIRST] },
    notes: { orderBy: [...NEWEST_FIRST] },
    nutrition: true,
    _count: { select: { completions: true, workouts: { where: { completion: null } } } },
  } satisfies Prisma.MemberInclude;
}

/** 초대 링크는 관리자만 봄. 화면으로 내려보내는 회원 데이터에서 뺌 */
const DETAIL_OMIT = { inviteToken: true, inviteExpiresAt: true } satisfies Prisma.MemberOmit;

async function readDetail(
  where: Prisma.MemberWhereInput,
  lessons: number,
): Promise<MemberDetail | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where,
    omit: DETAIL_OMIT,
    include: detailInclude(lessons),
  });
  if (!member) return null;

  const { completions, workouts, _count, ...rest } = member;
  return serialize<MemberDetail>({
    ...rest,
    completions: completions.map(({ workout: _workout, ...completion }) => completion),
    workouts: [...completions.flatMap((c) => (c.workout ? [c.workout] : [])), ...workouts],
    completionTotal: _count.completions,
    lessonTotal: _count.completions + _count.workouts,
    lessonLimit: lessons,
  });
}

/** 회원 상세 — 운동/체중/코칭메모/수업완료/영양. 볼 수 없는 회원이면 null. */
export async function getMemberDetail(
  memberId: string,
  scope: Prisma.MemberWhereInput,
  lessons = LESSON_PAGE,
): Promise<MemberDetail | null> {
  return readDetail({ id: memberId, ...scope }, lessons);
}

/** 회원 본인 화면 — 이 계정에 연결된 회원 기록. 연결이 없으면 null. */
export async function getMyRecord(
  userId: string,
  lessons = LESSON_PAGE,
): Promise<MemberDetail | null> {
  return readDetail({ userId }, lessons);
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
  /** 종목 이름 → 직전 기록 문구 */
  lastSets: Record<string, string>;
}

/** 직전 기록을 찾아볼 최근 수업 기록 수 */
const LAST_SETS_LOOKBACK = 30;

/** 운동 기록 작성·수정 화면. */
export async function getWorkoutEditor(
  memberId: string,
  scope: Prisma.MemberWhereInput,
  workoutId?: string,
): Promise<WorkoutEditorData | null> {
  // 직전 기록은 최근 기록에서만 찾음. 전부 읽으면 기록이 쌓일수록 느려짐
  const [member, target] = await Promise.all([
    prismaRead.member.findFirst({
      relationLoadStrategy: "join",
      where: { id: memberId, ...scope },
      select: {
        id: true,
        name: true,
        remainingSessions: true,
        workouts: {
          orderBy: [...NEWEST_FIRST],
          take: LAST_SETS_LOOKBACK,
          include: WORKOUT_INCLUDE,
        },
      },
    }),
    workoutId
      ? prismaRead.workout.findFirst({
          relationLoadStrategy: "join",
          where: { id: workoutId, memberId, member: scope },
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
    lastSets: lastSetsOf(serialize<Workout[]>(member.workouts), workoutId),
  };
}

/**
 * 종목별 직전 기록. 무게를 정할 때 지난번 수치를 보러 나갔다 오지 않게
 * 종목 이름 옆에 띄움. workouts는 최신순이라 처음 만난 것이 가장 최근임
 */
function lastSetsOf(workouts: Workout[], skipId?: string) {
  const map: Record<string, string> = {};
  for (const w of workouts) {
    if (w.id === skipId) continue;
    for (const e of w.exercises) {
      if (e.name in map) continue;
      const heaviest = (s: ExerciseSet) => Math.max(s.weight ?? 0, s.weightRight ?? 0);
      const top = e.sets.reduce((best, s) => (heaviest(s) > heaviest(best) ? s : best), e.sets[0]);
      if (!top) continue;
      map[e.name] = formatSet(top);
    }
  }
  return map;
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
