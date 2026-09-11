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

type Params = { params: Promise<{ memberId: string }> };

/** 체중 기록 추가 */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const weight = toNumber(body.weight);
    if (weight === undefined || weight <= 0 || weight > 500) {
      return badRequest("0보다 크고 500kg 이하로 입력해 주세요.");
    }

    const record = await prisma.weightRecord.create({
      data: { memberId, date: body.date, weight, memo: toTrimmed(body.memo) },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    return serverError("weights.POST", e);
  }
}
