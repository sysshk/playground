/*
  서버 공통 — API 라우트의 인증 가드, 소유권 확인, 입력 검증

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/auth-config";
import type { Prisma } from "@/app/generated/prisma";
import { memberScope, type MemberScope } from "@/lib/auth";
import { kstDay, kstIso } from "@/lib/kst";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";

type Guard =
  | { trainerId: string; role: Role; scope: MemberScope; error: null }
  | { trainerId: null; role: null; scope: null; error: NextResponse };

function denied(message: string, status: number): Guard {
  return {
    trainerId: null,
    role: null,
    scope: null,
    error: NextResponse.json({ error: message }, { status }),
  };
}

/**
 * 트레이너·관리자만 통과시킴. 회원 계정은 읽기만 하므로 수정 API에서 403.
 * scope는 이 사람이 다룰 수 있는 회원 조건임 — where에 그대로 펼쳐 씀
 */
export async function requireTrainerId(): Promise<Guard> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return denied("로그인이 필요합니다.", 401);
  if (user.role === "client") return denied("회원 계정은 기록을 볼 수만 있습니다.", 403);

  return { trainerId: user.id, role: user.role, scope: memberScope(user), error: null };
}

/**
 * 회원 본인만 통과시키고 연결된 회원 기록 id를 돌려줌
 * 개인 운동·Q&A처럼 회원이 직접 쓰는 API가 씀
 */
export async function requireClientMember(): Promise<
  { memberId: string; error: null } | { memberId: null; error: NextResponse }
> {
  const session = await auth();
  const user = session?.user;
  const fail = (message: string, status: number) => ({
    memberId: null,
    error: NextResponse.json({ error: message }, { status }),
  });

  if (!user?.id) return fail("로그인이 필요합니다.", 401);
  if (user.role !== "client") return fail("회원 본인만 쓸 수 있습니다.", 403);

  const member = await prisma.member.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!member) return fail("연결된 회원 기록이 없습니다.", 404);

  return { memberId: member.id, error: null };
}

/** 관리자만 통과시킴 */
export async function requireAdminId(): Promise<Guard> {
  const guard = await requireTrainerId();
  if (guard.error) return guard;
  if (guard.role !== "admin") return denied("관리자만 할 수 있습니다.", 403);
  return guard;
}

/**
 * 회원이 이 사람이 다룰 수 있는 회원인지 확인함
 * 남의 회원이면 존재 여부를 흘리지 않도록 404로 돌려줌
 */
export async function requireOwnedMember(memberId: string, scope: MemberScope) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, ...scope },
    select: { id: true, trainerId: true, remainingSessions: true },
  });

  if (!member) {
    return {
      member: null,
      error: NextResponse.json(
        { error: "회원을 찾을 수 없습니다." },
        { status: 404 },
      ),
    };
  }

  return { member, error: null };
}

/** update·delete가 조건에 맞는 행을 못 찾았을 때 Prisma가 던지는 오류인지 */
export function isRecordNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}

/**
 * 남은 수업을 1회 뺌. 0이면 빼지 않고 false
 * 동시에 두 번 눌러도 음수로 내려가지 않게 조건부로 뺌. scope도 조건에 넣어 소유권 확인을 겸함
 */
export async function takeOneSession(
  tx: Prisma.TransactionClient,
  memberId: string,
  scope: MemberScope,
) {
  const { count } = await tx.member.updateMany({
    where: { id: memberId, ...scope, remainingSessions: { gt: 0 } },
    data: { remainingSessions: { decrement: 1 } },
  });
  return count > 0;
}

/** 지운 수업만큼 남은 수업을 1회 되돌림 */
export async function giveBackSession(tx: Prisma.TransactionClient, memberId: string) {
  await tx.member.update({
    where: { id: memberId },
    data: { remainingSessions: { increment: 1 } },
  });
}

/** 기록한 수업을 같은 날(한국 시각) 그 회원의 아직 기록 안 한 예약에 이음. 여럿이면 이른 것부터 */
export async function linkSameDayAppointment(
  tx: Prisma.TransactionClient,
  memberId: string,
  completionId: string,
  at: Date,
) {
  const start = new Date(kstIso(kstDay(at), 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const appointment = await tx.appointment.findFirst({
    where: { memberId, completionId: null, startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });
  if (appointment) {
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { completionId },
    });
  }
}

/**
 * 요청 본문을 객체로 읽음. JSON이 깨졌거나 객체가 아니면 빈 객체
 * 잘못된 본문이 500이 아니라 각 검증의 400으로 가게 함
 */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return body !== null && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
  return NextResponse.json(
    { error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 500 },
  );
}
