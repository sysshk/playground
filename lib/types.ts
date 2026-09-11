// 클라이언트/서버가 함께 쓰는 PT 도메인 타입
// API 응답은 Prisma 모델을 그대로 직렬화한 형태다 (Date → ISO 문자열).

import type {
  ActivityLevel,
  Gender,
  LeanBodyMassSource,
  NutritionGoal,
} from "./nutrition";

export type WeightUnit = "kg" | "bodyweight";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  unit: WeightUnit;
  order: number;
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
  completedAt: string;
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
}

/** 회원 상세 화면이 한 번에 받아오는 전체 데이터 */
export interface MemberDetail extends Member {
  workouts: Workout[];
  weights: WeightRecord[];
  notes: CoachingNote[];
  completions: SessionCompletion[];
  nutrition: NutritionProfile | null;
}
