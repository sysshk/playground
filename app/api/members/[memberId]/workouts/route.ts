import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isValidDate,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toNumber,
  toTrimmed,
} from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

interface ExerciseInput {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  unit: "kg" | "bodyweight";
  order: number;
}

/** 하루치 운동 기록 추가 (종목 여러 개) */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
      return badRequest("종목을 하나 이상 추가해 주세요.");
    }

    const exercises: ExerciseInput[] = [];

    for (const [index, raw] of body.exercises.entries()) {
      const name = toTrimmed(raw?.name);
      if (!name) return badRequest(`종목 ${index + 1}: 종목명을 입력해 주세요.`);

      const sets = toNumber(raw?.sets);
      if (sets === undefined || sets < 1 || !Number.isInteger(sets)) {
        return badRequest(`${name}: 세트 수는 1 이상 입력해 주세요.`);
      }

      const reps = toNumber(raw?.reps);
      if (reps === undefined || reps < 1 || !Number.isInteger(reps)) {
        return badRequest(`${name}: 횟수는 1 이상 입력해 주세요.`);
      }

      const unit: "kg" | "bodyweight" =
        raw?.unit === "bodyweight" ? "bodyweight" : "kg";

      let weight: number | null = null;
      if (unit === "kg") {
        const parsed = toNumber(raw?.weight);
        if (parsed === undefined || parsed < 0) {
          return badRequest(`${name}: 무게는 0 이상 입력해 주세요.`);
        }
        weight = parsed;
      }

      exercises.push({ name, sets, reps, weight, unit, order: index });
    }

    const workout = await prisma.workout.create({
      data: {
        memberId,
        date: body.date,
        memo: toTrimmed(body.memo),
        exercises: { create: exercises },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ workout }, { status: 201 });
  } catch (e) {
    return serverError("workouts.POST", e);
  }
}

/** 해당 회원의 운동 기록 전체 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const { count } = await prisma.workout.deleteMany({ where: { memberId } });
    return NextResponse.json({ ok: true, deleted: count });
  } catch (e) {
    return serverError("workouts.DELETE_ALL", e);
  }
}
