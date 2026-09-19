/*
  API — 트레이너가 회원 식단 한 끼 지우기, 코멘트 달기·고치기

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  notFound,
  readBody,
  requireTrainerId,
  serverError,
} from "@/lib/api";
import { MEAL_COMMENT_MAX } from "@/types";
import { toTrimmed } from "@/lib/validation";

type Params = { params: Promise<{ memberId: string; mealId: string }> };

/** 식단 한 끼 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, mealId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const { count } = await prisma.meal.deleteMany({
      where: { id: mealId, memberId, member: scope },
    });
    if (count === 0) {
      return notFound("식단 기록을 찾을 수 없습니다.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("meal.DELETE", e);
  }
}

/** 코멘트 저장. 빈 값을 보내면 코멘트를 지움 */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId, mealId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await readBody(request);
    const comment = toTrimmed(body.comment);
    if (comment && comment.length > MEAL_COMMENT_MAX) {
      return badRequest(`코멘트는 ${MEAL_COMMENT_MAX}자 이내로 적어 주세요.`);
    }

    // 회원과 트레이너까지 조건에 넣어 소유권 확인과 저장을 한 번에 함
    const { count } = await prisma.meal.updateMany({
      where: { id: mealId, memberId, member: scope },
      data: { comment, commentedAt: comment ? new Date() : null },
    });
    if (count === 0) {
      return notFound("식단 기록을 찾을 수 없습니다.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("meal.PATCH", e);
  }
}
