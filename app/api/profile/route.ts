/*
  API — 내 정보 화면: 이름·비밀번호 바꾸기 (로그인한 누구나, 자기 계정만)

  @date : 2026-09-16
*/

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/auth-config";
import { PASSWORD_MIN } from "@/lib/account";
import { badRequest, serverError, toTrimmed } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const NAME_MAX = 30;

/** 이름은 항상, 비밀번호는 새 비밀번호가 있을 때만 바꿈. 비밀번호는 지금 비밀번호 확인이 먼저 */
export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const name = toTrimmed(body?.name);
    const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!name) return badRequest("이름을 입력해 주세요.");
    // 인코딩이 깨진 채 들어온 글자(U+FFFD)는 그대로 저장하지 않음
    if (name.includes("\uFFFD")) return badRequest("이름에 읽을 수 없는 글자가 있습니다.");
    if (name.length > NAME_MAX) return badRequest(`이름은 ${NAME_MAX}자 이하로 입력해 주세요.`);

    const data: { name: string; password?: string } = { name };

    if (next) {
      if (next.length < PASSWORD_MIN) {
        return badRequest(`새 비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.`);
      }
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
      if (!user) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
      if (!current || !(await bcrypt.compare(current, user.password))) {
        return badRequest("지금 비밀번호가 맞지 않습니다.");
      }
      data.password = await bcrypt.hash(next, 10);
    }

    await prisma.user.update({ where: { id: userId }, data, select: { id: true } });
    return NextResponse.json({ ok: true, passwordChanged: Boolean(data.password) });
  } catch (e) {
    return serverError("profile.PATCH", e);
  }
}
