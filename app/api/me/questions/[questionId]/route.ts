/*
  API — 회원 본인의 질문 삭제 (답이 달리기 전까지만)

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientMember, serverError } from "@/lib/api";

type Params = { params: Promise<{ questionId: string }> };

/** 답이 없는 내 질문 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { questionId } = await params;
  const { memberId, error } = await requireClientMember();
  if (error) return error;

  try {
    const { count } = await prisma.question.deleteMany({
      where: { id: questionId, memberId, answer: null },
    });
    if (count === 0) {
      return NextResponse.json(
        { error: "질문을 찾을 수 없거나 이미 답이 달렸습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("me.question.DELETE", e);
  }
}
