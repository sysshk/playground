/*
  API — 수업 예약 수정·취소

  @date : 2026-09-14
*/

import { NextResponse } from "next/server";
import { notFound, readBody, requireTrainerId, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkAppointment } from "../check";

type Params = { params: Promise<{ appointmentId: string }> };

/** 예약 수정. 이미 기록한 예약은 완료 내역으로 남아 있으므로 고치지 않음 */
export async function PATCH(request: Request, { params }: Params) {
  const { appointmentId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const checked = await checkAppointment(await readBody(request), scope, appointmentId);
    if (checked.error) return checked.error;

    const { count } = await prisma.appointment.updateMany({
      where: { id: appointmentId, completionId: null, member: scope },
      data: checked.data,
    });
    if (count === 0) return notFound("예약을 찾을 수 없습니다.");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("appointment.PATCH", e);
  }
}

/** 예약 취소. 이미 기록한 예약은 지우지 않음 */
export async function DELETE(_request: Request, { params }: Params) {
  const { appointmentId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const { count } = await prisma.appointment.deleteMany({
      where: { id: appointmentId, completionId: null, member: scope },
    });
    if (count === 0) return notFound("예약을 찾을 수 없습니다.");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("appointment.DELETE", e);
  }
}
