/*
  API — 계정 관리 화면: 회원 초대 링크 만들기·취소 (관리자 전용)

  @date : 2026-09-15
*/

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireAdminId, serverError } from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

/** 링크 유효 기간 */
const INVITE_DAYS = 7;

/** 초대 링크 만들기. 이미 있으면 새로 만들어 이전 링크를 무효로 함 */
export async function POST(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { error } = await requireAdminId();
  if (error) return error;

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });
    if (!member) {
      return notFound("회원을 찾을 수 없습니다.");
    }
    if (member.userId) {
      return NextResponse.json(
        { error: "이미 앱 계정이 연결된 회원입니다. 연결을 해제한 뒤 다시 초대해 주세요." },
        { status: 409 },
      );
    }

    // 추측할 수 없는 난수. URL에 그대로 넣을 수 있게 base64url로 만듦
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.member.update({
      where: { id: memberId },
      data: { inviteToken: token, inviteExpiresAt: expiresAt },
    });

    return NextResponse.json({ token, expiresAt: expiresAt.toISOString() }, { status: 201 });
  } catch (e) {
    return serverError("admin.invite.POST", e);
  }
}

/** 초대 링크 취소 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId } = await params;
  const { error } = await requireAdminId();
  if (error) return error;

  try {
    await prisma.member.updateMany({
      where: { id: memberId },
      data: { inviteToken: null, inviteExpiresAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("admin.invite.DELETE", e);
  }
}
