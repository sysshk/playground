import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberList } from "@/lib/queries";
import { badRequest, requireTrainerId, serverError, toNumber, toTrimmed } from "@/lib/api";

/** 로그인한 트레이너의 회원 목록 + 대시보드 집계 */
export async function GET() {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    return NextResponse.json(await getMemberList(trainerId));
  } catch (e) {
    return serverError("members.GET", e);
  }
}

/** 회원 등록 */
export async function POST(request: Request) {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

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

    const member = await prisma.member.create({
      data: {
        trainerId,
        name,
        phone,
        goal: toTrimmed(body.goal),
        memo: toTrimmed(body.memo),
        remainingSessions,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    return serverError("members.POST", e);
  }
}

/** 회원 여러 명 삭제 — 연결된 기록도 함께 지워진다 (onDelete: Cascade). */
export async function DELETE(request: Request) {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await request.json().catch(() => null);
    const ids = body?.ids;
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      !ids.every((id) => typeof id === "string")
    ) {
      return badRequest("삭제할 회원을 선택해 주세요.");
    }

    // trainerId를 조건에 넣어 남의 회원은 지워지지 않게 한다.
    const { count } = await prisma.member.deleteMany({
      where: { id: { in: ids }, trainerId },
    });

    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return serverError("members.DELETE", e);
  }
}
