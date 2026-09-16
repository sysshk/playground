/*
  API — 회원 정보 수정·삭제

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

/** 회원 정보 수정 */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
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

    // scope를 조건에 넣어 소유권 확인과 수정을 한 번에 함
    const member = await prisma.member.update({
      where: { id: memberId, ...scope },
      data: {
        name,
        phone,
        goal: toTrimmed(body.goal),
        memo: toTrimmed(body.memo),
        remainingSessions,
      },
      select: { id: true, name: true },
    });

    return NextResponse.json({ member });
  } catch (e) {
    if (isRecordNotFound(e)) return NextResponse.json(NOT_FOUND, { status: 404 });
    return serverError("member.PATCH", e);
  }
}

/** 회원 삭제 — 연결된 기록도 함께 지워짐 (onDelete: Cascade). */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    // 연결된 앱 계정은 지우지 않는다(연결만 풀림).
    const { count } = await prisma.member.deleteMany({
      where: { id: memberId, ...scope },
    });
    if (count === 0) return NextResponse.json(NOT_FOUND, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("member.DELETE", e);
  }
}
