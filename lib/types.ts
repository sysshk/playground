/*
  공통 — 화면과 서버가 함께 쓰는 PT 도메인 타입 (API 응답 모양, Date → ISO 문자열)

  @date : 2026-09-12
*/

import type {
  ActivityLevel,
  Gender,
  LeanBodyMassSource,
  NutritionGoal,
} from "./nutrition";

/** 계정 역할 — 관리자는 모든 회원, 트레이너는 자기 회원, 회원(client)은 자기 기록만 읽음 */
export type Role = "admin" | "trainer" | "client";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "관리자",
  trainer: "트레이너",
  client: "회원",
};

/** 로그인하고 처음 가는 화면. 회원 목록(/members)은 트레이너·관리자 화면임 */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/members",
  trainer: "/members",
  client: "/me",
};

/** 모르는 값은 가장 권한이 적은 회원으로 봄 */
export function toRole(value: unknown): Role {
  return value === "admin" || value === "trainer" ? value : "client";
}

export type WeightUnit = "kg" | "bodyweight";

/** 한 세트 — 드롭세트·피라미드처럼 세트마다 수치가 달라질 수 있음 */
export interface ExerciseSet {
  id: string;
  order: number;
  reps: number;
  weight: number | null;
  unit: WeightUnit;
}

export interface Exercise {
  id: string;
  name: string;
  order: number;
  sets: ExerciseSet[];
}

export interface Workout {
  id: string;
  memberId: string;
  date: string;
  memo: string | null;
  createdAt: string;
  exercises: Exercise[];
}

export interface WeightRecord {
  id: string;
  memberId: string;
  date: string;
  weight: number;
  memo: string | null;
  createdAt: string;
}

export interface CoachingNote {
  id: string;
  memberId: string;
  date: string;
  pain: string | null;
  posture: string | null;
  movement: string | null;
  homework: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionCompletion {
  id: string;
  memberId: string;
  /** 운동 기록을 저장하면서 차감했으면 그 기록의 id */
  workoutId: string | null;
  completedAt: string;
  /** 직접 차감할 때 적어 둔 사유. 운동 기록으로 차감했으면 null */
  reason: string | null;
}

export interface NutritionProfile {
  id: string;
  memberId: string;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  bodyFatPercentage: number | null;
  skeletalMuscleMass: number | null;
  leanBodyMass: number | null;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  calculatedLeanBodyMass: number | null;
  leanBodyMassSource: LeanBodyMassSource;
  bmr: number;
  maintenanceCalories: number;
  targetCalories: number;
  protein: number;
  proteinMin: number;
  proteinMax: number;
  carbs: number;
  fat: number;
  calculationBasis: string[];
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  goal: string | null;
  remainingSessions: number;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 회원 목록 카드에 필요한 요약 정보 */
export interface MemberSummary extends Member {
  latestWeight: number | null;
  workoutCount: number;
  /** 지금까지 차감한 수업 수. 등록 전체 횟수는 이 값 + remainingSessions */
  completedSessions: number;
}

/** 달력에 찍는 수업 한 건 */
export interface CalendarSession {
  id: string;
  completedAt: string;
  memberId: string;
  memberName: string;
}

/** 달력에 찍는 수업 예약. 기록한 예약은 완료 내역으로 보이므로 여기에 없음 */
export interface CalendarAppointment {
  id: string;
  startsAt: string;
  memberId: string;
  memberName: string;
  memo: string | null;
}

/** 한 달 달력 — 완료한 수업과 아직 기록하지 않은 예약 */
export interface MonthCalendar {
  sessions: CalendarSession[];
  appointments: CalendarAppointment[];
}

/** 대시보드 상단 지표 */
export interface MemberStats {
  total: number;
  /** 최근 7일 수업 완료 수 */
  recentCompletions: number;
  /** 최근 7일 운동 기록 수 */
  recentWorkouts: number;
  /** 남은 수업이 3회 이하인 회원 수 */
  runningLow: number;
}

/** 회원 상세 화면이 한 번에 받아오는 전체 데이터 */
export interface MemberDetail extends Member {
  /** 목표 체중 kg. 정하지 않았으면 null */
  targetWeight: number | null;
  /** 받아 온 수업 기록의 운동 기록 (최근 lessonLimit건 안) */
  workouts: Workout[];
  weights: WeightRecord[];
  notes: CoachingNote[];
  /** 받아 온 완료 내역 (최근 lessonLimit건) */
  completions: SessionCompletion[];
  /** 지금까지 차감한 수업 수 */
  completionTotal: number;
  /** 수업 기록 전체 수 (완료 내역 + 완료 내역 없는 운동 기록) */
  lessonTotal: number;
  /** 이번에 받아 온 수업 기록 수 */
  lessonLimit: number;
  nutrition: NutritionProfile | null;
}
