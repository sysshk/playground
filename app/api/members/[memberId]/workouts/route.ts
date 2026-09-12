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
import { parseExercises } from "./parse";

type Params = { params: Promise<{ memberId: string }> };

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

    const parsed = parseExercises(body.exercises);
    if ("error" in parsed) return badRequest(parsed.error);

    // 수업 시각은 폼에서 받는다. 없으면 오늘은 지금, 지난 날짜는 그날 정오(한국 시각).
    const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    let completedAt: Date;
    if (body.completedAt) {
      const picked = new Date(body.completedAt);
      if (Number.isNaN(picked.getTime())) {
        return badRequest("수업 시각이 올바르지 않습니다.");
      }
      if (picked.getTime() > Date.now() + 5 * 60 * 1000) {
        return badRequest("수업 시각은 미래로 지정할 수 없습니다.");
      }
      completedAt = picked;
    } else {
      completedAt =
        body.date === kstToday
          ? new Date()
          : new Date(`${body.date}T12:00:00+09:00`);
    }

    const result = await prisma.$transaction(async (tx) => {
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

      // 기록 한 건이 곧 수업 한 번이다. 차감하지 못하면 기록도 남기지 않는다 —
      // 기록만 남으면 목록에는 있는데 횟수는 그대로인 상태가 된다.
      const { count } = await tx.member.updateMany({
        where: { id: memberId, remainingSessions: { gt: 0 } },
        data: { remainingSessions: { decrement: 1 } },
      });
      if (count === 0) return null;

      await tx.sessionCompletion.create({
        data: { memberId, workoutId: workout.id, completedAt },
      });
      return { workout, completed: true };
    });

    if (!result) {
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
