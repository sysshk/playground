// 화면 데이터 읽기 — 서버 컴포넌트와 GET 라우트가 함께 쓴다.
//
// 전부 prismaRead(HTTP)로 읽고, 중첩 관계는 JOIN 한 번으로 가져온다.
// 반환값은 JSON으로 한 번 거쳐 API 응답과 같은 모양(Date → ISO 문자열)으로 맞춘다.

import type { Prisma } from "@/app/generated/prisma";
import { prismaRead } from "@/lib/prisma";
import type {
  CoachingNote,
  MemberDetail,
  MemberStats,
  MemberSummary,
  NutritionProfile,
  Workout,
} from "@/lib/types";

function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 한국 시각 기준 오늘에서 days일 전의 YYYY-MM-DD */
function kstDateString(daysAgo: number) {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const t = Date.now() + KST_OFFSET - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
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

/** 로그인한 트레이너의 회원 목록 + 대시보드 집계 */
export async function getMemberList(
  trainerId: string,
): Promise<{ members: MemberSummary[]; stats: MemberStats }> {
  // "이번 주"는 타임존에 따라 경계가 흔들린다. 최근 7일로 잡고 그대로 표기한다.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sinceDate = kstDateString(6);

  const [recentCompletions, recentWorkouts, members] = await Promise.all([
    prismaRead.sessionCompletion.count({
      where: { member: { trainerId }, completedAt: { gte: since } },
    }),
    prismaRead.workout.count({
      where: { member: { trainerId }, date: { gte: sinceDate } },
    }),
    prismaRead.member.findMany({
      relationLoadStrategy: "join",
      where: { trainerId },
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
    // 진행 막대를 그리려면 쓴 횟수가 필요하다.
    completedSessions: _count.completions,
  }));

  return serialize({
    members: summaries,
    stats: {
      total: summaries.length,
      recentCompletions,
      recentWorkouts,
      // 3회 이하로 남은 회원은 재등록 안내가 필요하다.
      runningLow: summaries.filter(
        (m) => m.remainingSessions > 0 && m.remainingSessions <= 3,
      ).length,
    },
  });
}

// ── 회원 상세 ────────────────────────────────

/** 회원 상세 — 운동/체중/코칭메모/수업완료/영양. 남의 회원이면 null. */
export async function getMemberDetail(
  memberId: string,
  trainerId: string,
): Promise<MemberDetail | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where: { id: memberId, trainerId },
    include: {
      workouts: { orderBy: [...NEWEST_FIRST], include: WORKOUT_INCLUDE },
      weights: { orderBy: [...NEWEST_FIRST] },
      notes: { orderBy: [...NEWEST_FIRST] },
      completions: { orderBy: { completedAt: "desc" } },
      nutrition: true,
    },
  });

  return member ? serialize<MemberDetail>(member) : null;
}

// ── 작성 화면 ────────────────────────────────

export interface NoteEditorData {
  member: { id: string; name: string };
  note: CoachingNote | null;
}

/** 코칭 메모 작성·수정 화면. noteId가 없으면 메모는 읽지 않는다. */
export async function getNoteEditor(
  memberId: string,
  trainerId: string,
  noteId?: string,
): Promise<NoteEditorData | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where: { id: memberId, trainerId },
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
  /** 종목 이름 → 직전 기록 문구 */
  lastSets: Record<string, string>;
}

/** 운동 기록 작성·수정 화면. */
export async function getWorkoutEditor(
  memberId: string,
  trainerId: string,
  workoutId?: string,
): Promise<WorkoutEditorData | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where: { id: memberId, trainerId },
    select: {
      id: true,
      name: true,
      remainingSessions: true,
      workouts: { orderBy: [...NEWEST_FIRST], include: WORKOUT_INCLUDE },
    },
  });
  if (!member) return null;

  const workouts = serialize<Workout[]>(member.workouts);

  return {
    member: {
      id: member.id,
      name: member.name,
      remainingSessions: member.remainingSessions,
    },
    workout: workoutId ? (workouts.find((w) => w.id === workoutId) ?? null) : null,
    lastSets: lastSetsOf(workouts, workoutId),
  };
}

/**
 * 종목별 직전 기록. 무게를 정할 때 지난번 수치를 보러 나갔다 오지 않게
 * 종목 이름 옆에 띄운다. workouts는 최신순이라 처음 만난 것이 가장 최근이다.
 */
function lastSetsOf(workouts: Workout[], skipId?: string) {
  const map: Record<string, string> = {};
  for (const w of workouts) {
    if (w.id === skipId) continue;
    for (const e of w.exercises) {
      if (e.name in map) continue;
      const top = e.sets.reduce(
        (best, s) => ((s.weight ?? 0) > (best.weight ?? 0) ? s : best),
        e.sets[0],
      );
      if (!top) continue;
      map[e.name] =
        top.unit === "bodyweight"
          ? `${top.reps}회`
          : `${top.weight}kg × ${top.reps}회`;
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
  trainerId: string,
): Promise<NutritionEditorData | null> {
  const member = await prismaRead.member.findFirst({
    relationLoadStrategy: "join",
    where: { id: memberId, trainerId },
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
