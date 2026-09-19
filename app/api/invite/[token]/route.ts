/*
  API — 초대 링크 화면: 회원이 링크로 들어와 자기 계정을 만듦 (로그인 없이 부름)
  지금은 초대 화면이 구글 버튼(준비 중)만 있어 부르는 곳이 없음. 구글 로그인을 붙일 때 계정 잇기·링크 지우기를 다시 씀

  @date : 2026-09-15
*/

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmail, PASSWORD_MIN } from "@/lib/account";
import { badRequest, readBody, serverError, toTrimmed } from "@/lib/api";

type Params = { params: Promise<{ token: string }> };

const EXPIRED = {
  error: "만료됐거나 이미 사용한 링크입니다. 트레이너에게 새 링크를 받아 주세요.",
};

/**
 * 계정 만들기 — 역할이 회원(client)인 계정을 만들고, 링크 주인 회원 기록에 잇고, 링크를 지움
 * 셋을 한 트랜잭션으로 묶어서 같은 링크로 두 번 가입되지 않게 함
 */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;

  try {
    const body = await readBody(request);
    const email = toTrimmed(body.email)?.toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !isEmail(email)) {
      return badRequest("이메일 주소를 정확히 입력해 주세요.");
    }
    if (password.length < PASSWORD_MIN) {
      return badRequest(`비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.`);
    }

    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) return badRequest("이미 가입된 이메일입니다. 관리자에게 계정 연결을 요청해 주세요.");

    const hashed = await bcrypt.hash(password, 10);
    const now = new Date();

    const linked = await prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: { inviteToken: token, inviteExpiresAt: { gt: now }, userId: null },
        select: { id: true, name: true },
      });
      if (!member) return false;

      const user = await tx.user.create({
        data: { email, password: hashed, name: member.name, role: "client" },
      });
      // 동시에 같은 링크로 들어온 요청이 있으면 여기서 한쪽만 통과함
      const { count } = await tx.member.updateMany({
        where: { id: member.id, inviteToken: token, userId: null },
        data: { userId: user.id, inviteToken: null, inviteExpiresAt: null },
      });
      if (count === 0) throw new Error("invite already used");
      return true;
    });

    if (!linked) return NextResponse.json(EXPIRED, { status: 410 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "invite already used") {
      return NextResponse.json(EXPIRED, { status: 410 });
    }
    return serverError("invite.POST", e);
  }
}
