import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isValidDate,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";
import { parseExercises } from "../parse";

type Params = { params: Promise<{ memberId: string; workoutId: string }> };

/**
 * 운동 기록 수정.
 *
 * 종목·세트는 개수 자체가 바뀌므로 하나씩 맞춰 고치지 않고 통째로 갈아끼운다.
 * 지우고 다시 넣는 사이에 다른 요청이 끼어들지 않도록 트랜잭션으로 묶는다.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId, workoutId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const parsed = parseExercises(body.exercises);
    if ("error" in parsed) return badRequest(parsed.error);

    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, memberId },
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

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    // memberId까지 조건에 넣어 다른 회원의 기록을 지우지 못하게 한다.
    const { count } = await prisma.workout.deleteMany({
      where: { id: workoutId, memberId },
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
