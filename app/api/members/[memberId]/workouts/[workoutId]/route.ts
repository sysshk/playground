import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnedMember, requireTrainerId, serverError } from "@/lib/api";

type Params = { params: Promise<{ memberId: string; workoutId: string }> };

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
