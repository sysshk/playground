/*
  API 공통 — 수업 예약 입력 검증과 겹침 확인 (등록·수정이 함께 쓴다)

  @date : 2026-09-15
*/

import { NextResponse } from "next/server";
import { badRequest, requireOwnedMember, toTrimmed } from "@/lib/api";
import type { MemberScope } from "@/lib/auth";
import { kstTimeLabel } from "@/lib/kst";
import { prisma } from "@/lib/prisma";

/** 메모는 달력 한 줄에 보이는 값이라 길게 받지 않는다. */
const MEMO_MAX = 40;

/** 트레이너는 한 번에 한 수업만 한다. 예약끼리 이만큼은 벌어져야 한다. */
const GAP = 60 * 60 * 1000;

type Checked =
  | { data: { memberId: string; startsAt: Date; memo: string | null }; error: null }
  | { data: null; error: NextResponse };

/**
 * 예약 요청을 검증한다. 회원은 다룰 수 있는 범위(scope) 안이어야 하고,
 * 그 회원 담당 트레이너의 다른 수업·예약과 1시간 안으로 겹치면 거절한다.
 * 관리자가 대신 잡아도 기준은 담당 트레이너의 일정이다. 수정할 때는 selfId로 자기 자신을 뺀다.
 */
export async function checkAppointment(
  body: unknown,
  scope: MemberScope,
  selfId?: string,
): Promise<Checked> {
  const input = (body ?? {}) as Record<string, unknown>;
  const fail = (error: NextResponse): Checked => ({ data: null, error });

  const memberId = toTrimmed(input.memberId);
  if (!memberId) return fail(badRequest("회원을 선택해 주세요."));

  const startsAt = new Date(input.startsAt as string);
  if (Number.isNaN(startsAt.getTime())) {
    return fail(badRequest("예약 시각이 올바르지 않습니다."));
  }
  // 창을 열어 둔 사이 시각이 지나도 받도록 1시간은 봐준다.
  if (startsAt.getTime() < Date.now() - GAP) {
    return fail(badRequest("지난 시각에는 예약할 수 없습니다."));
  }

  const memo = toTrimmed(input.memo);
  if (memo && memo.length > MEMO_MAX) {
    return fail(badRequest(`메모는 ${MEMO_MAX}자 이내로 입력해 주세요.`));
  }

  const owned = await requireOwnedMember(memberId, scope);
  if (owned.error) return fail(owned.error);

  const trainer = { trainerId: owned.member.trainerId };
  const near = {
    gt: new Date(startsAt.getTime() - GAP),
    lt: new Date(startsAt.getTime() + GAP),
  };
  const [nearAppointment, nearLesson] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        ...(selfId ? { id: { not: selfId } } : {}),
        member: trainer,
        completionId: null,
        startsAt: near,
      },
      select: { startsAt: true, member: { select: { name: true } } },
    }),
    prisma.sessionCompletion.findFirst({
      where: { member: trainer, completedAt: near },
      select: { completedAt: true, member: { select: { name: true } } },
    }),
  ]);

  const clash = nearAppointment
    ? { at: nearAppointment.startsAt, name: nearAppointment.member.name }
    : nearLesson
      ? { at: nearLesson.completedAt, name: nearLesson.member.name }
      : null;
  if (clash) {
    return fail(
      NextResponse.json(
        {
          error: `${kstTimeLabel(clash.at)}에 ${clash.name} 님 수업이 있습니다. 앞뒤 1시간은 비워 두고 예약해 주세요.`,
        },
        { status: 409 },
      ),
    );
  }

  return { data: { memberId, startsAt, memo }, error: null };
}
