/*
  API — 회원 본인의 식단 한 끼 삭제

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireClientMember, serverError } from "@/lib/api";

type Params = { params: Promise<{ mealId: string }> };

/** 내 식단 한 끼 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { mealId } = await params;
  const { memberId, error } = await requireClientMember();
  if (error) return error;

  try {
    const { count } = await prisma.meal.deleteMany({ where: { id: mealId, memberId } });
    if (count === 0) {
      return notFound("식단 기록을 찾을 수 없습니다.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("me.meal.DELETE", e);
  }
}
