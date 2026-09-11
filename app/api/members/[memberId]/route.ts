import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toNumber,
  toTrimmed,
} from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

/** 회원 상세 — 운동/체중/코칭메모/수업완료/영양을 한 번에 내려준다. */
export async function GET(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const member = await prisma.member.findFirst({
      where: { id: memberId, trainerId },
      include: {
        workouts: {
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          include: {
            exercises: {
              orderBy: { order: "asc" },
              include: { sets: { orderBy: { order: "asc" } } },
            },
          },
        },
        weights: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
        notes: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
        completions: { orderBy: { completedAt: "desc" } },
        nutrition: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (e) {
    return serverError("member.GET", e);
  }
}

/** 회원 정보 수정 */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const body = await request.json();

    const name = toTrimmed(body.name);
    if (!name) return badRequest("이름을 입력해 주세요.");

    const phone = toTrimmed(body.phone);
    if (!phone) return badRequest("연락처를 입력해 주세요.");

    const remainingSessions = toNumber(body.remainingSessions) ?? 0;
    if (remainingSessions < 0 || !Number.isInteger(remainingSessions)) {
      return badRequest("남은 수업은 0 이상의 정수로 입력해 주세요.");
    }

    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        name,
        phone,
        goal: toTrimmed(body.goal),
        memo: toTrimmed(body.memo),
        remainingSessions,
      },
    });

    return NextResponse.json({ member });
  } catch (e) {
    return serverError("member.PATCH", e);
  }
}

/** 회원 삭제 — 연결된 기록도 함께 지워진다 (onDelete: Cascade). */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    await prisma.member.delete({ where: { id: memberId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("member.DELETE", e);
  }
}
