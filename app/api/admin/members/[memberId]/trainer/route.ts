/*
  API — 계정 관리 화면: 회원의 담당 트레이너 배정 (관리자 전용)

  @date : 2026-09-15
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, isRecordNotFound, requireAdminId, serverError, toTrimmed } from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

/** 담당 트레이너를 바꾼다. 트레이너·관리자 계정만 맡을 수 있다. */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { error } = await requireAdminId();
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const trainerId = toTrimmed(body?.trainerId);
    if (!trainerId) return badRequest("담당 트레이너를 골라 주세요.");

    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: { role: true },
    });
    if (!trainer || trainer.role === "client") {
      return badRequest("트레이너나 관리자 계정만 담당으로 정할 수 있습니다.");
    }

    await prisma.member.update({ where: { id: memberId }, data: { trainerId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isRecordNotFound(e)) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }
    return serverError("admin.trainer.PATCH", e);
  }
}
