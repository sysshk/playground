// 클라이언트/서버가 함께 쓰는 PT 도메인 타입
// API 응답은 Prisma 모델을 그대로 직렬화한 형태다 (Date → ISO 문자열).

import type {
  ActivityLevel,
  Gender,
  LeanBodyMassSource,
  NutritionGoal,
} from "./nutrition";

export type WeightUnit = "kg" | "bodyweight";

/** 한 세트 — 드롭세트·피라미드처럼 세트마다 수치가 달라질 수 있다. */
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
  workouts: Workout[];
  weights: WeightRecord[];
  notes: CoachingNote[];
  completions: SessionCompletion[];
  nutrition: NutritionProfile | null;
}
