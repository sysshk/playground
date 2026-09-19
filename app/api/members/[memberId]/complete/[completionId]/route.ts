/*
  API — 수업 완료 취소 (차감한 1회 되돌리기)

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { giveBackSession, notFound, requireTrainerId, serverError } from "@/lib/api";

type Params = { params: Promise<{ memberId: string; completionId: string }> };

/**
 * 수업 완료 취소 — 잘못 눌렀을 때 되돌림
 * 완료 내역을 지우고 차감했던 수업 1회를 돌려줌
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, completionId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const refunded = await prisma.$transaction(async (tx) => {
      // 회원과 트레이너까지 조건에 넣어 남의 내역을 지우지 못하게 함
      const { count } = await tx.sessionCompletion.deleteMany({
        where: { id: completionId, memberId, member: scope },
      });

      if (count === 0) return false;

      await giveBackSession(tx, memberId);
      return true;
    });

    if (!refunded) {
      return notFound("수업 완료 내역을 찾을 수 없습니다.");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("completion.DELETE", e);
  }
}
