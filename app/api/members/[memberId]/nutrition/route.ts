import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toNumber,
} from "@/lib/api";
import {
  ACTIVITY_MULTIPLIER,
  calculateNutrition,
  type ActivityLevel,
  type Gender,
  type NutritionGoal,
} from "@/lib/nutrition";

type Params = { params: Promise<{ memberId: string }> };

const GOALS: NutritionGoal[] = ["loss", "maintain", "gain"];

/** 칼로리·영양 계산 후 저장 (회원당 1건, 다시 계산하면 덮어쓴다) */
export async function PUT(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const body = await request.json();

    const gender: Gender = body.gender === "female" ? "female" : "male";

    const activityLevel = body.activityLevel as ActivityLevel;
    if (!(activityLevel in ACTIVITY_MULTIPLIER)) {
      return badRequest("활동량을 선택해 주세요.");
    }

    const goal = body.goal as NutritionGoal;
    if (!GOALS.includes(goal)) return badRequest("목표를 선택해 주세요.");

    const age = toNumber(body.age);
    if (age === undefined || age < 1 || age > 120) {
      return badRequest("1~120세 사이로 입력해 주세요.");
    }

    const height = toNumber(body.height);
    if (height === undefined || height < 50 || height > 250) {
      return badRequest("50~250cm 사이로 입력해 주세요.");
    }

    const weight = toNumber(body.weight);
    if (weight === undefined || weight <= 0 || weight > 500) {
      return badRequest("0보다 큰 체중을 입력해 주세요.");
    }

    const bodyFatPercentage = toNumber(body.bodyFatPercentage);
    if (
      bodyFatPercentage !== undefined &&
      (bodyFatPercentage <= 0 || bodyFatPercentage >= 75)
    ) {
      return badRequest("0%보다 크고 75% 미만으로 입력해 주세요.");
    }

    const skeletalMuscleMass = toNumber(body.skeletalMuscleMass);
    if (
      skeletalMuscleMass !== undefined &&
      (skeletalMuscleMass <= 0 || skeletalMuscleMass > weight)
    ) {
      return badRequest("골격근량은 0보다 크고 체중 이하로 입력해 주세요.");
    }

    const leanBodyMass = toNumber(body.leanBodyMass);
    if (leanBodyMass !== undefined && (leanBodyMass <= 0 || leanBodyMass > weight)) {
      return badRequest("제지방량은 0보다 크고 체중 이하로 입력해 주세요.");
    }

    const input = {
      gender,
      age,
      height,
      weight,
      bodyFatPercentage: bodyFatPercentage ?? null,
      skeletalMuscleMass: skeletalMuscleMass ?? null,
      leanBodyMass: leanBodyMass ?? null,
      activityLevel,
      goal,
    };

    const result = calculateNutrition(input);

    const data = {
      ...input,
      calculatedLeanBodyMass: result.calculatedLeanBodyMass ?? null,
      leanBodyMassSource: result.leanBodyMassSource,
      bmr: result.bmr,
      maintenanceCalories: result.maintenanceCalories,
      targetCalories: result.targetCalories,
      protein: result.protein,
      proteinMin: result.proteinMin,
      proteinMax: result.proteinMax,
      carbs: result.carbs,
      fat: result.fat,
      calculationBasis: result.calculationBasis,
    };

    const nutrition = await prisma.nutritionProfile.upsert({
      where: { memberId },
      create: { memberId, ...data },
      update: data,
    });

    return NextResponse.json({ nutrition });
  } catch (e) {
    return serverError("nutrition.PUT", e);
  }
}

/** 영양 계산 결과 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    // 트레이너까지 조건에 넣어 소유권 확인과 삭제를 한 번에 한다.
    await prisma.nutritionProfile.deleteMany({
      where: { memberId, member: { trainerId } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("nutrition.DELETE", e);
  }
}
