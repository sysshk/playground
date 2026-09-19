/*
  공통 — 화면과 서버가 함께 쓰는 PT 도메인 타입 (API 응답 모양, Date → ISO 문자열)

  @date : 2026-09-12
*/

import type {
  ActivityLevel,
  Gender,
  LeanBodyMassSource,
  NutritionGoal,
} from "@/lib/nutrition";

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

/** 회원 상세·내 기록의 탭 — 수업, 몸 상태, 식단, 개인 운동, Q&A */
export const MEMBER_TABS = ["lessons", "body", "diet", "personal", "qna"] as const;
export type MemberTab = (typeof MEMBER_TABS)[number];

/** 주소의 ?tab= 값. 모르는 값이면 수업 탭 */
export function toMemberTab(raw: string | string[] | undefined): MemberTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return MEMBER_TABS.find((tab) => tab === value) ?? "lessons";
}

/** 모르는 값은 가장 권한이 적은 회원으로 봄 */
export function toRole(value: unknown): Role {
  return value === "admin" || value === "trainer" ? value : "client";
}

/** 휴식 초를 "1분 30초"처럼 */
export function formatRest(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return [m && `${m}분`, s && `${s}초`].filter(Boolean).join(" ") || "0초";
}

/** 세트 입력 방식 — 무게 하나, 바디웨이트, 좌우 무게 따로 */
export type WeightUnit = "kg" | "bodyweight" | "sides";

/** 한 세트 — 드롭세트·피라미드처럼 세트마다 수치가 달라질 수 있음 */
export interface ExerciseSet {
  id: string;
  order: number;
  reps: number;
  weight: number | null; // 좌우면 왼쪽 무게
  weightRight: number | null; // 좌우일 때만 오른쪽 무게
  unit: WeightUnit;
}

/** 세트 한 줄 글 — "60kg × 12회", "바디웨이트 12회", "좌 10 · 우 12.5kg × 12회" */
export function formatSet(set: Pick<ExerciseSet, "reps" | "weight" | "weightRight" | "unit">) {
  if (set.unit === "bodyweight") return `바디웨이트 ${set.reps}회`;
  if (set.unit === "sides") return `좌 ${set.weight} · 우 ${set.weightRight}kg × ${set.reps}회`;
  return `${set.weight}kg × ${set.reps}회`;
}

export interface Exercise {
  id: string;
  name: string;
  order: number;
  restSeconds: number | null; // 세트 사이 휴식 초
  sets: ExerciseSet[];
}

export interface Workout {
  id: string;
  memberId: string;
  date: string;
  memo: string | null;
  byMember: boolean; // 회원이 쓴 개인 운동
  createdAt: string;
  exercises: Exercise[];
}

/** 인바디 신체균형 — 균형, 약간 불균형, 심한 불균형 */
export type Balance = "balanced" | "slight" | "severe";

export const BALANCE_LABEL: Record<Balance, string> = {
  balanced: "균형",
  slight: "약간 불균형",
  severe: "심한 불균형",
};

/** 체중 기록. 인바디 칸이 하나라도 차 있으면 인바디 측정임 */
export interface WeightRecord {
  id: string;
  memberId: string;
  date: string;
  weight: number;
  memo: string | null;
  createdAt: string;
  measuredHour: number | null; // 측정 시각 0~23
  gender: Gender | null;
  age: number | null;
  height: number | null; // cm
  skeletalMuscle: number | null; // 골격근량 kg
  bodyFatMass: number | null; // 체지방량 kg
  bodyFatPercent: number | null; // 체지방률 %
  waistHipRatio: number | null; // 복부지방률
  visceralFatLevel: number | null; // 내장지방 레벨 (예전 입력)
  visceralFatArea: number | null; // 내장지방 면적 cm²
  balanceUpper: Balance | null;
  balanceLower: Balance | null;
  balanceUpperLower: Balance | null;
  leanRightArm: number | null; // 오른팔 근육 kg
  leanRightArmPct: number | null; // 오른팔 표준 대비 %
  leanLeftArm: number | null; // 왼팔 근육 kg
  leanLeftArmPct: number | null; // 왼팔 표준 대비 %
  leanTrunk: number | null; // 몸통 근육 kg
  leanTrunkPct: number | null; // 몸통 표준 대비 %
  leanRightLeg: number | null; // 오른다리 근육 kg
  leanRightLegPct: number | null; // 오른다리 표준 대비 %
  leanLeftLeg: number | null; // 왼다리 근육 kg
  leanLeftLegPct: number | null; // 왼다리 표준 대비 %
}

/** 이 중 하나라도 차 있으면 인바디 기록. 비었으면 체중만 잰 날 */
export const INBODY_FIELDS = [
  "skeletalMuscle",
  "bodyFatMass",
  "bodyFatPercent",
  "waistHipRatio",
  "visceralFatLevel",
  "visceralFatArea",
  "balanceUpper",
  "balanceLower",
  "balanceUpperLower",
  "leanTrunk",
] as const satisfies readonly (keyof WeightRecord)[];

/** 인바디 칸이 하나라도 차 있는지 */
export const isInbody = (r: Partial<Record<(typeof INBODY_FIELDS)[number], unknown>>) =>
  INBODY_FIELDS.some((field) => r[field] != null);

/** 체중 그래프·기록 목록의 한 건. 인바디 전체 칸은 최근 인바디 2건(MemberDetail.inbody)에만 */
export interface WeightPoint {
  id: string;
  date: string;
  weight: number;
  skeletalMuscle: number | null; // 골격근량 kg
  bodyFatMass: number | null; // 체지방량 kg
  inbody: boolean; // 인바디 칸이 있는 기록
}

/** 끼니 — 아침, 점심, 저녁, 간식 */
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

/** 주소의 ?slot= 값. 모르는 값이면 null */
export function toMealSlot(raw: string | undefined): MealSlot | null {
  return MEAL_SLOTS.find((slot) => slot === raw) ?? null;
}

export const MEAL_MAX = 500;

/** 회원 상세가 한 번에 받는 식단 기간 — 고른 날까지 이만큼 */
export const MEAL_DAYS = 60;
export const MEAL_COMMENT_MAX = 300;

/** 회원이 적은 식단 한 끼 */
export interface Meal {
  id: string;
  memberId: string;
  date: string;
  slot: MealSlot;
  content: string;
  comment: string | null; // 트레이너 코멘트
  commentedAt: string | null;
  createdAt: string;
  calories: number | null; // kcal — AI 추정
  carbs: number | null; // g
  fat: number | null; // g
  protein: number | null; // g
}

export const QUESTION_MAX = 1000;
export const ANSWER_MAX = 2000;

/** 회원이 묻고 트레이너가 답함 */
export interface Question {
  id: string;
  memberId: string;
  body: string;
  answer: string | null;
  answeredAt: string | null;
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
  /** 마지막 수업 시각. 수업 전이면 null */
  lastCompletedAt: string | null;
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
  weights: WeightPoint[]; // 전체 기록, 가벼운 칸만
  inbody: WeightRecord[]; // 최근 인바디 2건, 전체 칸
  notes: CoachingNote[]; // 최근 noteLimit건
  noteTotal: number; // 코칭 메모 전체 수
  noteLimit: number; // 이번에 받아 온 코칭 메모 수
  /** 받아 온 완료 내역 (최근 lessonLimit건) */
  completions: SessionCompletion[];
  /** 지금까지 차감한 수업 수 */
  completionTotal: number;
  /** 수업 기록 전체 수 (완료 내역 + 완료 내역 없는 운동 기록) */
  lessonTotal: number;
  /** 이번에 받아 온 수업 기록 수 */
  lessonLimit: number;
  nutrition: NutritionProfile | null;
  /** 회원이 쓴 개인 운동, 최신순 */
  personalWorkouts: Workout[];
  /** Q&A, 최신순 */
  questions: Question[];
  /** 식단, 최근 것부터 */
  meals: Meal[];
}

/** 남은 수업이 이만큼 이하면 재등록 안내가 필요함 */
export const LOW_SESSIONS = 3;
