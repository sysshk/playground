/*
  API — 회원 본인의 개인 운동 추가 (수업이 아니라 남은 수업을 차감하지 않음)

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  readBody,
  requireClientMember,
  serverError,
} from "@/lib/api";
import { parseExercises } from "@/app/api/members/[memberId]/workouts/parse";
import { isPastOrToday, toTrimmed } from "@/lib/validation";

/** 개인 운동 추가 */
export async function POST(request: Request) {
  const { memberId, error } = await requireClientMember();
  if (error) return error;

  try {
    const body = await readBody(request);
    const date = body.date;

    if (!isPastOrToday(date)) {
      return badRequest("날짜를 선택해 주세요. 미래 날짜는 기록할 수 없습니다.");
    }

    const parsed = parseExercises(body.exercises);
    if ("error" in parsed) return badRequest(parsed.error);

    const workout = await prisma.workout.create({
      data: {
        memberId,
        date,
        memo: toTrimmed(body.memo),
        byMember: true,
        exercises: { create: parsed.exercises },
      },
    });

    return NextResponse.json({ workout }, { status: 201 });
  } catch (e) {
    return serverError("me.workouts.POST", e);
  }
}
