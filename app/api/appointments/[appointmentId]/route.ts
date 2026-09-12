import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, requireTrainerId, serverError, toTrimmed } from "@/lib/api";

type Params = { params: Promise<{ appointmentId: string }> };

const MEMO_MAX = 60;

/** 일정 수정 — 시각과 메모만 고친다. 회원을 바꿀 일은 새로 잡는 것과 같다. */
export async function PATCH(request: Request, { params }: Params) {
  const { appointmentId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));

    const startsAt = parseStart(body?.startsAt);
    if (!startsAt) return badRequest("시작 시각이 올바르지 않습니다.");

    const memo = toTrimmed(body?.memo);
    if (memo && memo.length > MEMO_MAX) {
      return badRequest(`메모는 ${MEMO_MAX}자 이내로 입력해 주세요.`);
    }

    // 남의 일정을 고치지 못하도록 트레이너까지 조건에 넣는다.
    const { count } = await prisma.appointment.updateMany({
      where: { id: appointmentId, member: { trainerId } },
      data: { startsAt, memo },
    });
    if (count === 0) return notFound();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        member: {
          select: { id: true, name: true, phone: true, remainingSessions: true },
        },
      },
    });

    return NextResponse.json({ appointment });
  } catch (e) {
    return serverError("appointment.PATCH", e);
  }
}

/**
 * 일정 삭제.
 *
 * 이미 끝난 수업이면 차감 이력은 건드리지 않는다. 일정은 "언제 만나기로 했나"
 * 이고 이력은 "실제로 했나"라서, 일정을 지운다고 수업이 없던 일이 되지는 않는다.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { appointmentId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const { count } = await prisma.appointment.deleteMany({
      where: { id: appointmentId, member: { trainerId } },
    });
    if (count === 0) return notFound();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("appointment.DELETE", e);
  }
}

function notFound() {
  return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
}

/** 분·초는 버리고 시 단위로 맞춘다. 화면에서도 시까지만 고르게 되어 있다. */
function parseStart(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setMinutes(0, 0, 0);
  return parsed;
}
