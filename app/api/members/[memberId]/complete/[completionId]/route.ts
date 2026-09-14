import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainerId, serverError } from "@/lib/api";

type Params = { params: Promise<{ memberId: string; completionId: string }> };

/**
 * 수업 완료 취소 — 잘못 눌렀을 때 되돌린다.
 * 완료 내역을 지우고 차감했던 수업 1회를 돌려준다.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, completionId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 회원과 트레이너까지 조건에 넣어 남의 내역을 지우지 못하게 한다.
      const { count } = await tx.sessionCompletion.deleteMany({
        where: { id: completionId, memberId, member: { trainerId } },
      });

      if (count === 0) return null;

      // 지운 만큼 수업을 되돌린다.
      return tx.member.update({
        where: { id: memberId },
        data: { remainingSessions: { increment: 1 } },
      });
    });

    if (!result) {
      return NextResponse.json(
        { error: "수업 완료 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, member: result });
  } catch (e) {
    return serverError("completion.DELETE", e);
  }
}
