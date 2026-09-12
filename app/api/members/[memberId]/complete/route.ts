import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

/** 사유는 이력 목록에 한 줄로 보이는 값이라 길게 받지 않는다. */
const REASON_MAX = 40;

/**
 * 수업 완료 처리 — 남은 수업 1회 차감 후 완료 내역을 남긴다.
 *
 * 수업 중에는 바빠서 끝난 뒤에 누르는 경우가 많다. 그래서 시각을 직접
 * 지정할 수 있게 열어두고, 없으면 지금 시각을 쓴다.
 *
 * 운동 기록 없이 부르는 경우에는 왜 차감했는지 사유를 함께 남긴다.
 */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  let completedAt: Date | undefined;
  let reason: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));

    reason = toTrimmed(body?.reason);
    if (reason && reason.length > REASON_MAX) {
      return badRequest(`사유는 ${REASON_MAX}자 이내로 입력해 주세요.`);
    }

    if (body?.completedAt) {
      const parsed = new Date(body.completedAt);
      if (Number.isNaN(parsed.getTime())) {
        return badRequest("완료 시각이 올바르지 않습니다.");
      }
      // 미래로 기록하면 이력이 뒤엉킨다. 약간의 시계 오차만 허용한다.
      if (parsed.getTime() > Date.now() + 5 * 60 * 1000) {
        return badRequest("완료 시각은 미래로 지정할 수 없습니다.");
      }
      completedAt = parsed;
    }
  } catch {
    return badRequest("요청을 읽지 못했습니다.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 동시에 두 번 눌러도 음수로 내려가지 않도록 조건부로 차감한다.
      const decremented = await tx.member.updateMany({
        where: { id: memberId, remainingSessions: { gt: 0 } },
        data: { remainingSessions: { decrement: 1 } },
      });

      if (decremented.count === 0) return null;

      const completion = await tx.sessionCompletion.create({
        data: { memberId, reason, ...(completedAt ? { completedAt } : {}) },
      });
      const member = await tx.member.findUnique({ where: { id: memberId } });

      return { completion, member };
    });

    if (!result) {
      return NextResponse.json(
        { error: "남은 수업이 없어 더 이상 차감할 수 없습니다." },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return serverError("member.complete", e);
  }
}
