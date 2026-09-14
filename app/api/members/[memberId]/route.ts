import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberDetail } from "@/lib/queries";
import {
  badRequest,
  isRecordNotFound,
  requireTrainerId,
  serverError,
  toNumber,
  toTrimmed,
} from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

const NOT_FOUND = { error: "회원을 찾을 수 없습니다." };

/** 회원 상세 — 운동/체중/코칭메모/수업완료/영양을 한 번에 내려준다. */
export async function GET(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const member = await getMemberDetail(memberId, trainerId);
    if (!member) return NextResponse.json(NOT_FOUND, { status: 404 });

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

    // trainerId를 조건에 넣어 소유권 확인과 수정을 한 번에 한다.
    const member = await prisma.member.update({
      where: { id: memberId, trainerId },
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
    if (isRecordNotFound(e)) return NextResponse.json(NOT_FOUND, { status: 404 });
    return serverError("member.PATCH", e);
  }
}

/** 회원 삭제 — 연결된 기록도 함께 지워진다 (onDelete: Cascade). */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const { count } = await prisma.member.deleteMany({
      where: { id: memberId, trainerId },
    });
    if (count === 0) return NextResponse.json(NOT_FOUND, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("member.DELETE", e);
  }
}
