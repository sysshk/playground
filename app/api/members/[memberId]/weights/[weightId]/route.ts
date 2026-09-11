import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnedMember, requireTrainerId, serverError } from "@/lib/api";

type Params = { params: Promise<{ memberId: string; weightId: string }> };

/** 체중 기록 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, weightId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const { count } = await prisma.weightRecord.deleteMany({
      where: { id: weightId, memberId },
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
