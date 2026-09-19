/*
  API — 계정 관리 화면: 계정 권한(회원·트레이너·관리자) 바꾸기 (관리자 전용)

  @date : 2026-09-15
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, readBody, requireAdminId, serverError } from "@/lib/api";

type Params = { params: Promise<{ userId: string }> };

const ROLES = ["admin", "trainer", "client"] as const;

/** 권한 변경. 역할이 섞여 기록이 엉키는 경우는 먼저 정리하도록 막음 */
export async function PATCH(request: Request, { params }: Params) {
  const { userId } = await params;
  const { trainerId, error } = await requireAdminId();
  if (error) return error;

  try {
    const body = await readBody(request);
    const role = ROLES.find((r) => r === body.role);
    if (!role) {
      return badRequest("권한은 회원, 트레이너, 관리자 중에서 골라 주세요.");
    }
    // 내 권한을 스스로 내리면 관리자가 한 명도 없게 될 수 있음
    if (userId === trainerId) {
      return badRequest("내 권한은 바꿀 수 없습니다. 다른 관리자가 바꿔야 합니다.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        memberRecord: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });
    if (!user) {
      return notFound("계정을 찾을 수 없습니다.");
    }

    // 회원 기록에 연결된 계정이 트레이너가 되면 자기 기록을 고칠 수 있게 됨
    if (role !== "client" && user.memberRecord) {
      return badRequest(
        `${user.memberRecord.name} 회원 기록과 연결된 계정입니다. 회원 연결 탭에서 연결을 해제한 뒤 바꿔 주세요.`,
      );
    }
    // 담당 회원이 있는 트레이너를 회원으로 내리면 그 회원들을 아무도 못 봄
    if (role === "client" && user._count.members > 0) {
      return badRequest(
        `담당 회원이 ${user._count.members}명 있습니다. 회원 연결 탭에서 담당 트레이너를 옮긴 뒤 바꿔 주세요.`,
      );
    }

    await prisma.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("admin.user.PATCH", e);
  }
}
