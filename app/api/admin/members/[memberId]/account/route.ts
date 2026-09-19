/*
  API — 계정 관리 화면: 회원 기록과 로그인 계정 연결·해제 (관리자 전용)
  초대 링크 없이 먼저 가입한 계정도 "이 계정이 이 회원"이라고 관리자가 직접 이음

  @date : 2026-09-15
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, readBody, requireAdminId, serverError, toTrimmed } from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

/** 기존 회원 계정을 이 회원 기록에 연결함 */
export async function PUT(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { error } = await requireAdminId();
  if (error) return error;

  try {
    const body = await readBody(request);
    const userId = toTrimmed(body.userId);
    if (!userId) return badRequest("연결할 계정을 골라 주세요.");

    const [member, user] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId }, select: { userId: true } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, memberRecord: { select: { name: true } } },
      }),
    ]);
    if (!member) return notFound("회원을 찾을 수 없습니다.");
    if (!user) return notFound("계정을 찾을 수 없습니다.");
    if (member.userId) return badRequest("이미 다른 계정이 연결된 회원입니다. 먼저 해제해 주세요.");
    if (user.role !== "client") return badRequest("회원 권한인 계정만 연결할 수 있습니다.");
    if (user.memberRecord) {
      return badRequest(`이미 ${user.memberRecord.name} 회원에 연결된 계정입니다.`);
    }

    // 연결하면 남아 있던 초대 링크는 필요 없어짐
    await prisma.member.update({
      where: { id: memberId },
      data: { userId, inviteToken: null, inviteExpiresAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("admin.account.PUT", e);
  }
}

/** 연결 해제 — 계정은 남기고 연결만 끊음. 다른 회원에 다시 이을 수 있음 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { error } = await requireAdminId();
  if (error) return error;

  try {
    const { count } = await prisma.member.updateMany({
      where: { id: memberId, userId: { not: null } },
      data: { userId: null },
    });
    if (count === 0) {
      return notFound("연결된 계정이 없습니다.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("admin.account.DELETE", e);
  }
}
