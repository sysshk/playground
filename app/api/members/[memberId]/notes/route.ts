/*
  API — 코칭 메모 작성

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  isValidDate,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";

type Params = { params: Promise<{ memberId: string }> };

/** 코칭 메모 작성 */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const owned = await requireOwnedMember(memberId, scope);
    if (owned.error) return owned.error;

    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const pain = toTrimmed(body.pain);
    const posture = toTrimmed(body.posture);
    const movement = toTrimmed(body.movement);
    const homework = toTrimmed(body.homework);

    if (!pain && !posture && !movement && !homework) {
      return badRequest("코칭 항목을 하나 이상 입력해 주세요.");
    }

    const note = await prisma.coachingNote.create({
      data: { memberId, date: body.date, pain, posture, movement, homework },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (e) {
    return serverError("notes.POST", e);
  }
}
