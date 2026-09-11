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

    // 저장하면서 수업 1회를 차감할지. 회원 혼자 한 개인 운동을 기록할 때는 끈다.
    const completeSession = body.completeSession === true;

    // 오늘 기록이면 지금 시각, 지난 날짜를 나중에 입력하는 거면 그날 정오(한국 시각)로 남긴다.
    const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const completedAt =
      body.date === kstToday ? new Date() : new Date(`${body.date}T12:00:00+09:00`);

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

      if (!completeSession) return { workout, completed: false };

      // 남은 수업이 없으면 기록만 남기고 차감은 건너뛴다. 기록까지 막을 이유는 없다.
      const { count } = await tx.member.updateMany({
        where: { id: memberId, remainingSessions: { gt: 0 } },
        data: { remainingSessions: { decrement: 1 } },
      });
      if (count === 0) return { workout, completed: false };

      await tx.sessionCompletion.create({
        data: { memberId, workoutId: workout.id, completedAt },
      });
      return { workout, completed: true };
    });

    return NextResponse.json(result, { status: 201 });
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
