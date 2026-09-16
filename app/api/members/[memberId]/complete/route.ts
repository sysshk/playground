/*
  API — 운동 없이 수업 1회 차감

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  linkSameDayAppointment,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";
import { parseCompletedAt } from "../workouts/parse";

type Params = { params: Promise<{ memberId: string }> };

/** 사유는 이력 목록에 한 줄로 보이는 값이라 길게 받지 않음 */
const REASON_MAX = 40;

/** 수업 완료 처리 — 남은 수업 1회 차감 후 완료 내역을 남김 */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  let completedAt: Date | undefined;
  let reason: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));

    reason = toTrimmed(body?.reason);
    if (reason && reason.length > REASON_MAX) {
      return badRequest(`사유는 ${REASON_MAX}자 이내로 입력해 주세요.`);
    }

    const picked = parseCompletedAt(body?.completedAt);
    if ("error" in picked) return badRequest(picked.error);
    completedAt = picked.value;
  } catch {
    return badRequest("요청을 읽지 못했습니다.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 동시에 두 번 눌러도 음수로 내려가지 않도록 조건부로 차감함
      // scope도 조건에 넣어 소유권 확인을 겸함
      const decremented = await tx.member.updateMany({
        where: { id: memberId, ...scope, remainingSessions: { gt: 0 } },
        data: { remainingSessions: { decrement: 1 } },
      });

      if (decremented.count === 0) return null;

      const completion = await tx.sessionCompletion.create({
        data: { memberId, reason, ...(completedAt ? { completedAt } : {}) },
      });
      await linkSameDayAppointment(tx, memberId, completion.id, completion.completedAt);
      return { completion };
    });

    if (!result) {
      // 실패 경로에서만 남의 회원인지, 수업이 없는지 가림
      const owned = await requireOwnedMember(memberId, scope);
      if (owned.error) return owned.error;

      return NextResponse.json(
        { error: "남은 수업이 없습니다." },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return serverError("member.complete", e);
  }
}
