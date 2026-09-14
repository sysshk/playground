/*
  API — 수업 기록 추가 (기록 1건 = 수업 1회 차감)

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isValidDate,
  linkSameDayAppointment,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";
import { kstDay } from "@/lib/kst";
import { parseCompletedAt, parseExercises } from "./parse";

type Params = { params: Promise<{ memberId: string }> };

/** 하루치 운동 기록 추가 (종목 여러 개) */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const parsed = parseExercises(body.exercises);
    if ("error" in parsed) return badRequest(parsed.error);

    // 수업 시각은 폼에서 받는다. 없으면 오늘은 지금, 지난 날짜는 그날 정오(한국 시각).

    const picked = parseCompletedAt(body.completedAt);
    if ("error" in picked) return badRequest(picked.error);

    const completedAt =
      picked.value ??
      (body.date === kstDay()
        ? new Date()
        : new Date(`${body.date}T12:00:00+09:00`));

    const result = await prisma.$transaction(async (tx) => {
      // 기록 한 건이 곧 수업 한 번이다. 차감부터 해서, 못 하면 기록을 만들지 않는다.
      // 트랜잭션 콜백은 값을 돌려주면 커밋되므로 만든 뒤에 빠져나가면 기록만 남는다.
      // scope도 조건에 넣어 소유권 확인을 겸한다.
      const { count } = await tx.member.updateMany({
        where: { id: memberId, ...scope, remainingSessions: { gt: 0 } },
        data: { remainingSessions: { decrement: 1 } },
      });
      if (count === 0) return null;

      const workout = await tx.workout.create({
        data: {
          memberId,
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

      const completion = await tx.sessionCompletion.create({
        data: { memberId, workoutId: workout.id, completedAt },
      });
      await linkSameDayAppointment(tx, memberId, completion.id, completedAt);
      return { workout, completed: true };
    });

    if (!result) {
      // 실패 경로에서만 남의 회원인지, 수업이 없는지 가린다.
      const owned = await requireOwnedMember(memberId, scope);
      if (owned.error) return owned.error;

      return NextResponse.json(
        {
          error:
            "남은 수업이 없습니다. 회원 정보에서 수업 횟수를 늘린 뒤 기록해 주세요.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return serverError("workouts.POST", e);
  }
}
