/*
  API — 목표 체중 저장 (체중 그래프에서)

  @date : 2026-09-14
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isRecordNotFound,
  notFound,
  readBody,
  requireTrainerId,
  serverError,
} from "@/lib/api";
import { isValidWeight, toNumber, WEIGHT_RANGE_MESSAGE } from "@/lib/validation";

type Params = { params: Promise<{ memberId: string }> };

/** 목표 체중 저장. null을 보내면 목표를 지움 */
export async function PUT(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await readBody(request);

    const targetWeight = toNumber(body.targetWeight) ?? null;
    if (targetWeight !== null && !isValidWeight(targetWeight)) {
      return badRequest(WEIGHT_RANGE_MESSAGE);
    }

    // scope를 조건에 넣어 소유권 확인과 수정을 한 번에 함
    const member = await prisma.member.update({
      where: { id: memberId, ...scope },
      data: { targetWeight },
      select: { id: true, targetWeight: true },
    });

    return NextResponse.json({ member });
  } catch (e) {
    if (isRecordNotFound(e)) {
      return notFound("회원을 찾을 수 없습니다.");
    }
    return serverError("weightTarget.PUT", e);
  }
}
