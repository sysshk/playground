/*
  API — 체중 기록 삭제

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainerId, serverError } from "@/lib/api";

type Params = { params: Promise<{ memberId: string; weightId: string }> };

/** 체중 기록 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, weightId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    // 회원과 트레이너까지 조건에 넣어 소유권 확인과 삭제를 한 번에 한다.
    const { count } = await prisma.weightRecord.deleteMany({
      where: { id: weightId, memberId, member: scope },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "체중 기록을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("weight.DELETE", e);
  }
}
