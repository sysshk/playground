/*
  API — 수업 기록 수정·삭제

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isValidDate,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";
import { parseCompletedAt, parseExercises } from "../parse";

type Params = { params: Promise<{ memberId: string; workoutId: string }> };

/** 운동 기록 수정. */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId, workoutId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const parsed = parseExercises(body.exercises);
    if ("error" in parsed) return badRequest(parsed.error);

    const completedAt = parseCompletedAt(body.completedAt);
    if ("error" in completedAt) return badRequest(completedAt.error);

    // 회원과 트레이너까지 조건에 넣어 소유권 확인을 겸함
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, memberId, member: scope, byMember: false },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "운동 기록을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const workout = await prisma.$transaction(async (tx) => {
      // Exercise를 지우면 ExerciseSet도 Cascade로 같이 지워짐
      await tx.exercise.deleteMany({ where: { workoutId } });

      const workout = await tx.workout.update({
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

      // 날짜나 시각을 고치면 연결된 수업의 시각도 따라감
      if (completedAt.value) {
        await tx.sessionCompletion.updateMany({
          where: { workoutId },
          data: { completedAt: completedAt.value },
        });
      }

      return workout;
    });

    return NextResponse.json({ workout });
  } catch (e) {
    return serverError("workout.PATCH", e);
  }
}

/** 수업 기록 1건 삭제. 차감한 수업이 붙어 있으면 함께 지우고 1회를 돌려줌 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, workoutId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 회원과 트레이너까지 조건에 넣어 남의 기록을 지우지 못하게 함
      const workout = await tx.workout.findFirst({
        where: { id: workoutId, memberId, member: scope, byMember: false },
        select: { completion: { select: { id: true } } },
      });
      if (!workout) return null;

      if (workout.completion) {
        await tx.sessionCompletion.delete({ where: { id: workout.completion.id } });
        await tx.member.update({
          where: { id: memberId },
          data: { remainingSessions: { increment: 1 } },
        });
      }
      await tx.workout.delete({ where: { id: workoutId } });
      return { refunded: workout.completion !== null };
    });

    if (!result) {
      return NextResponse.json(
        { error: "운동 기록을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return serverError("workout.DELETE", e);
  }
}
