/*
  API — 수업 예약 등록

  @date : 2026-09-14
*/

import { NextResponse } from "next/server";
import { requireTrainerId, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkAppointment } from "./check";

/** 수업 예약 */
export async function POST(request: Request) {
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const checked = await checkAppointment(await request.json(), scope);
    if (checked.error) return checked.error;

    const appointment = await prisma.appointment.create({ data: checked.data });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (e) {
    return serverError("appointments.POST", e);
  }
}
