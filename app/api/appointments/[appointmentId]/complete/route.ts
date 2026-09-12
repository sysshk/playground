import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, requireTrainerId, serverError, toTrimmed } from "@/lib/api";

type Params = { params: Promise<{ appointmentId: string }> };

const REASON_MAX = 40;

/**
 * 일정에서 바로 수업을 끝낸다 — 남은 수업 1회를 차감하고 이력을 남긴다.
 *
 * 남길 운동 기록이 없는 날에 쓴다. 운동을 했다면 이 일정에서 운동 기록 화면으로
 * 들어가 저장하면 되고, 그러면 저장하면서 차감과 연결까지 한 번에 끝난다.
 *
 * 차감 시각은 지금이 아니라 일정 시각을 쓴다. 끝나고 한참 뒤에 누르는 일이
 * 흔한데, 그때 시각으로 남기면 이력이 실제와 어긋난다.
 */
export async function POST(request: Request, { params }: Params) {
  const { appointmentId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  let reason: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    reason = toTrimmed(body?.reason);
    if (reason && reason.length > REASON_MAX) {
      return badRequest(`사유는 ${REASON_MAX}자 이내로 입력해 주세요.`);
    }
  } catch {
    return badRequest("요청을 읽지 못했습니다.");
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, member: { trainerId } },
      select: { id: true, memberId: true, startsAt: true, completionId: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }
    if (appointment.completionId) {
      return NextResponse.json(
        { error: "이미 끝난 수업입니다." },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 동시에 두 번 눌러도 음수로 내려가지 않도록 조건부로 차감한다.
      const { count } = await tx.member.updateMany({
        where: { id: appointment.memberId, remainingSessions: { gt: 0 } },
        data: { remainingSessions: { decrement: 1 } },
      });
      if (count === 0) return null;

      const completion = await tx.sessionCompletion.create({
        data: {
          memberId: appointment.memberId,
          completedAt: appointment.startsAt,
          reason,
        },
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { completionId: completion.id },
      });

      return completion;
    });

    if (!result) {
      return NextResponse.json(
        { error: "남은 수업이 없어 더 이상 차감할 수 없습니다." },
        { status: 409 },
      );
    }

    return NextResponse.json({ completion: result }, { status: 201 });
  } catch (e) {
    return serverError("appointment.complete", e);
  }
}
