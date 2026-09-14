/*
  API — 체중 기록 추가

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isValidDate,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toNumber,
  toTrimmed,
} from "@/lib/api";
import { isValidWeight, WEIGHT_RANGE_MESSAGE } from "@/lib/weight";

type Params = { params: Promise<{ memberId: string }> };

/** 체중 기록 추가 */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const owned = await requireOwnedMember(memberId, scope);
    if (owned.error) return owned.error;

    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const weight = toNumber(body.weight);
    if (weight === undefined || !isValidWeight(weight)) {
      return badRequest(WEIGHT_RANGE_MESSAGE);
    }

    const record = await prisma.weightRecord.create({
      data: { memberId, date: body.date, weight, memo: toTrimmed(body.memo) },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    return serverError("weights.POST", e);
  }
}
