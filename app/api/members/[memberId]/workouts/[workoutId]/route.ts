import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isValidDate,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";
import { parseExercises } from "../parse";

type Params = { params: Promise<{ memberId: string; workoutId: string }> };

/** 운동 기록 수정. */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId, workoutId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const parsed = parseExercises(body.exercises);
    if ("error" in parsed) return badRequest(parsed.error);

    // 회원과 트레이너까지 조건에 넣어 소유권 확인을 겸한다.
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, memberId, member: { trainerId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "운동 기록을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const workout = await prisma.$transaction(async (tx) => {
      // Exercise를 지우면 ExerciseSet도 Cascade로 같이 지워진다.
      await tx.exercise.deleteMany({ where: { workoutId } });

      return tx.workout.update({
        where: { id: workoutId },
        data: {
          date: body.date,
          memo: toTrimmed(body.memo),
          exercises: { create: parsed.exercises },
        },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: { sets: { orderBy: { order: "asc" } } },
          },
        },
      });
    });

    return NextResponse.json({ workout });
  } catch (e) {
    return serverError("workout.PATCH", e);
  }
}

/** 운동 기록 1건 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, workoutId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    // 회원과 트레이너까지 조건에 넣어 남의 기록을 지우지 못하게 한다.
    const { count } = await prisma.workout.deleteMany({
      where: { id: workoutId, memberId, member: { trainerId } },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "운동 기록을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("workout.DELETE", e);
  }
}
