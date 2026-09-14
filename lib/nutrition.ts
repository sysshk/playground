/*
  영양 계산 공통 — 칼로리·영양 계산식
  제지방량이 있으면 Katch-McArdle, 없으면 Mifflin-St Jeor. 결과는 코칭 참고용 추정치다.

  @date : 2026-09-12
*/

export type Gender = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "veryActive"
  | "extraActive";
export type NutritionGoal = "loss" | "maintain" | "gain";
export type LeanBodyMassSource = "direct" | "bodyFat" | "unavailable";

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  veryActive: 1.725,
  extraActive: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "거의 운동하지 않음",
  light: "가벼운 운동",
  moderate: "중간 강도 운동",
  veryActive: "고강도 운동",
  extraActive: "매우 높은 활동량",
};

export const ACTIVITY_HINT: Record<ActivityLevel, string> = {
  sedentary: "거의 운동하지 않음",
  light: "가벼운 운동 주 1~3회",
  moderate: "중간 강도 운동 주 3~5회",
  veryActive: "고강도 운동 주 6~7회",
  extraActive: "매우 높은 활동량",
};

export const GOAL_LABEL: Record<NutritionGoal, string> = {
  loss: "감량",
  maintain: "유지",
  gain: "증량",
};

/** 목표별 유지칼로리 대비 가감 */
const GOAL_CALORIE_DELTA: Record<NutritionGoal, number> = {
  loss: -500,
  maintain: 0,
  gain: 300,
};

/** 단백질을 뺀 나머지 칼로리 중 탄수화물이 차지하는 비율 */
const CARB_RATIO: Record<NutritionGoal, number> = {
  loss: 0.6,
  maintain: 0.65,
  gain: 0.7,
};

/** 골격근량 1kg당 목표 칼로리에 더하는 보정치 */
const SMM_CALORIE_BONUS: Record<NutritionGoal, number> = {
  loss: 1,
  maintain: 2,
  gain: 3,
};

/** 목표별 단백질 권장 범위 (g/kg) */
const PROTEIN_RANGE: Record<NutritionGoal, [number, number]> = {
  loss: [2, 2.4],
  maintain: [1.6, 2],
  gain: [1.8, 2.2],
};

export interface NutritionInput {
  gender: Gender;
  age: number;
  height: number; // cm
  weight: number; // kg
  bodyFatPercentage?: number | null;
  skeletalMuscleMass?: number | null;
  leanBodyMass?: number | null;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
}

export interface NutritionResult {
  calculatedLeanBodyMass?: number;
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
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function calculateNutrition(input: NutritionInput): NutritionResult {
  const {
    gender,
    age,
    height,
    weight,
    bodyFatPercentage,
    skeletalMuscleMass,
    leanBodyMass,
    activityLevel,
    goal,
  } = input;

  // ── 제지방량: 직접 입력값 > 체지방률 환산 > 없음
  const directLbm = leanBodyMass && leanBodyMass > 0 ? leanBodyMass : undefined;
  const bodyFatLbm =
    bodyFatPercentage && bodyFatPercentage > 0
      ? weight * (1 - bodyFatPercentage / 100)
      : undefined;
  const lbm = directLbm ?? bodyFatLbm;
  const lbmSource: LeanBodyMassSource = directLbm
    ? "direct"
    : bodyFatLbm
      ? "bodyFat"
      : "unavailable";

  // ── 기초대사량
  const genderConstant = gender === "male" ? 5 : -161;
  const mifflin = Math.round(
    10 * weight + 6.25 * height - 5 * age + genderConstant,
  );
  const bmr = lbm ? Math.round(370 + 21.6 * lbm) : mifflin; // Katch-McArdle

  // ── 유지칼로리 / 목표 칼로리
  const maintenanceCalories = Math.round(bmr * ACTIVITY_MULTIPLIER[activityLevel]);
  const smmBonus = skeletalMuscleMass
    ? Math.min(150, Math.round(skeletalMuscleMass * SMM_CALORIE_BONUS[goal]))
    : 0;
  const targetCalories = Math.max(
    1000,
    maintenanceCalories + GOAL_CALORIE_DELTA[goal] + smmBonus,
  );

  // ── 단백질: 증량은 체중 기준, 그 외는 제지방량 기준(없으면 체중)
  const proteinBase = goal === "gain" ? weight : (lbm ?? weight);
  const [minPerKg, maxPerKg] = PROTEIN_RANGE[goal];

  // 골격근량 비율이 높을수록 권장 범위의 상단에 가깝게 잡는다.
  const smmRatio = skeletalMuscleMass ? skeletalMuscleMass / weight : undefined;
  const position =
    smmRatio === undefined ? 0.5 : clamp(0.5 + (smmRatio - 0.35) * 2, 0.35, 0.85);

  const proteinMin = Math.round(proteinBase * minPerKg);
  const proteinMax = Math.round(proteinBase * maxPerKg);
  const protein = Math.round(proteinMin + (proteinMax - proteinMin) * position);

  // ── 남은 칼로리를 탄수화물/지방으로 배분
  const remaining = Math.max(0, targetCalories - protein * 4);
  const carbKcal = remaining * CARB_RATIO[goal];
  const fatKcal = remaining - carbKcal;
  const carbs = Math.round(carbKcal / 4);
  const fat = Math.round(fatKcal / 9);

  const calculationBasis = [
    lbm
      ? `기초대사량: 제지방량 ${round1(lbm)}kg을 사용한 Katch-McArdle 방식`
      : "기초대사량: 체성분 정보가 없어 Mifflin-St Jeor 방식",
    directLbm
      ? "제지방량: 직접 입력값을 우선 적용"
      : bodyFatLbm
        ? "제지방량: 체중 × (1 - 체지방률)로 자동 계산"
        : "제지방량: 입력되지 않아 체중을 단백질 계산 기준으로 사용",
    goal === "gain"
      ? `단백질: 체중 기준 ${minPerKg}~${maxPerKg}g/kg`
      : lbm
        ? `단백질: 제지방량 기준 ${minPerKg}~${maxPerKg}g/kg`
        : `단백질: 제지방량이 없어 체중 기준 ${minPerKg}~${maxPerKg}g/kg`,
    skeletalMuscleMass
      ? `골격근량 ${skeletalMuscleMass}kg을 단백질 범위 내 권장 지점과 목표 칼로리 ${targetCalories}kcal 보정에 반영`
      : "골격근량: 입력되지 않아 단백질 권장 지점을 범위 중앙으로 설정",
    `활동량: ${ACTIVITY_LABEL[activityLevel]} (×${ACTIVITY_MULTIPLIER[activityLevel]})`,
    `탄수화물/지방: 단백질 칼로리를 제외한 나머지를 탄수화물 ${Math.round(
      CARB_RATIO[goal] * 100,
    )}% / 지방 ${Math.round((1 - CARB_RATIO[goal]) * 100)}%로 배분`,
  ];

  return {
    calculatedLeanBodyMass: lbm ? round1(lbm) : undefined,
    leanBodyMassSource: lbmSource,
    bmr,
    maintenanceCalories,
    targetCalories,
    protein,
    proteinMin,
    proteinMax,
    carbs,
    fat,
    calculationBasis,
  };
}
