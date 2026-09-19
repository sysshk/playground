/*
  API — 회원 본인의 개인 운동 수정·삭제

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  notFound,
  readBody,
  requireClientMember,
  serverError,
} from "@/lib/api";
import { parseExercises } from "@/app/api/members/[memberId]/workouts/parse";
import { isPastOrToday, toTrimmed } from "@/lib/validation";

type Params = { params: Promise<{ workoutId: string }> };

const NOT_FOUND = "개인 운동 기록을 찾을 수 없습니다.";

/** 개인 운동 수정 */
export async function PATCH(request: Request, { params }: Params) {
  const { workoutId } = await params;
  const { memberId, error } = await requireClientMember();
  if (error) return error;

  try {
    const body = await readBody(request);
    const date = body.date;

    if (!isPastOrToday(date)) {
      return badRequest("날짜를 선택해 주세요. 미래 날짜는 기록할 수 없습니다.");
    }

    const parsed = parseExercises(body.exercises);
    if ("error" in parsed) return badRequest(parsed.error);

    // 내 개인 운동인지 조건에 넣어 남의 기록이나 수업 기록은 못 고치게 함
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, memberId, byMember: true },
      select: { id: true },
    });
    if (!existing) return notFound(NOT_FOUND);

    const workout = await prisma.$transaction(async (tx) => {
      await tx.exercise.deleteMany({ where: { workoutId } });
      return tx.workout.update({
        where: { id: workoutId },
        data: {
          date,
          memo: toTrimmed(body.memo),
          exercises: { create: parsed.exercises },
        },
      });
    });

    return NextResponse.json({ workout });
  } catch (e) {
    return serverError("me.workout.PATCH", e);
  }
}

/** 개인 운동 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { workoutId } = await params;
  const { memberId, error } = await requireClientMember();
  if (error) return error;

  try {
    const { count } = await prisma.workout.deleteMany({
      where: { id: workoutId, memberId, byMember: true },
    });
    if (count === 0) return notFound(NOT_FOUND);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("me.workout.DELETE", e);
  }
}
