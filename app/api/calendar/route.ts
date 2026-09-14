/*
  API — 수업 달력 한 달치 (달력에서 다른 달로 넘길 때)

  @date : 2026-09-14
*/

import { NextResponse } from "next/server";
import { getMonthCalendar } from "@/lib/queries";
import { badRequest, isValidMonth, requireTrainerId, serverError } from "@/lib/api";

/** 한 달치 수업과 예약 — 달력에서 다른 달로 넘길 때 */
export async function GET(request: Request) {
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  const month = new URL(request.url).searchParams.get("month");
  if (!isValidMonth(month)) return badRequest("달을 YYYY-MM 형식으로 보내 주세요.");

  try {
    return NextResponse.json(await getMonthCalendar(scope, month));
  } catch (e) {
    return serverError("calendar.GET", e);
  }
}
