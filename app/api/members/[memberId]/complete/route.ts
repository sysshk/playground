import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnedMember, requireTrainerId, serverError } from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

/** 수업 완료 처리 — 남은 세션 1회 차감 후 완료 내역을 남긴다. */
export async function POST(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 동시에 두 번 눌러도 음수로 내려가지 않도록 조건부로 차감한다.
      const decremented = await tx.member.updateMany({
        where: { id: memberId, remainingSessions: { gt: 0 } },
        data: { remainingSessions: { decrement: 1 } },
      });

      if (decremented.count === 0) return null;

      const completion = await tx.sessionCompletion.create({
        data: { memberId },
      });
      const member = await tx.member.findUnique({ where: { id: memberId } });

      return { completion, member };
    });

    if (!result) {
      return NextResponse.json(
        { error: "남은 세션이 없어 더 이상 차감할 수 없습니다." },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return serverError("member.complete", e);
  }
}
