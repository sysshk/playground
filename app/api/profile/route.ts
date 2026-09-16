/*
  API — 내 정보 화면: 이름·연락처 바꾸기 (로그인한 누구나, 자기 계정만)

  @date : 2026-09-16
*/

import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/auth-config";
import { badRequest, serverError, toTrimmed } from "@/lib/api";
import { formatPhone, validatePhone, PHONE_ERROR } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

const NAME_MAX = 30;

/**
 * 이름·연락처를 바꿈. 연락처는 회원 기록이 연결된 계정만 필수
 * 회원 계정은 트레이너가 보는 회원 기록의 이름·연락처도 같이 고침
 */
export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const name = toTrimmed(body?.name);
    const rawPhone = toTrimmed(body?.phone);

    if (!name) return badRequest("이름을 입력해 주세요.");
    // 인코딩이 깨진 채 들어온 글자(U+FFFD)는 그대로 저장하지 않음
    if (name.includes("�")) return badRequest("이름에 읽을 수 없는 글자가 있습니다.");
    if (name.length > NAME_MAX) return badRequest(`이름은 ${NAME_MAX}자 이하로 입력해 주세요.`);

    if (rawPhone && !validatePhone(rawPhone)) return badRequest(PHONE_ERROR);
    const phone = rawPhone ? formatPhone(rawPhone) : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { memberRecord: { select: { id: true } } },
    });
    if (!user) return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });

    const member = user.memberRecord;
    if (member && !phone) return badRequest("연락처를 입력해 주세요.");

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { name, phone }, select: { id: true } }),
      ...(member
        ? [
            prisma.member.update({
              where: { id: member.id },
              data: { name, phone: phone! },
              select: { id: true },
            }),
          ]
        : []),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("profile.PATCH", e);
  }
}
