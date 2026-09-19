/*
  API — 트레이너가 회원 질문에 답하기·답 고치기

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  notFound,
  readBody,
  requireTrainerId,
  serverError,
} from "@/lib/api";
import { ANSWER_MAX } from "@/types";
import { toTrimmed } from "@/lib/validation";

type Params = { params: Promise<{ memberId: string; questionId: string }> };

/** 답 달기. 빈 답을 보내면 답을 지우고 다시 답변 대기로 돌림 */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId, questionId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await readBody(request);
    const answer = toTrimmed(body.answer);
    if (answer && answer.length > ANSWER_MAX) {
      return badRequest(`답변은 ${ANSWER_MAX}자 이내로 입력해 주세요.`);
    }

    // 회원과 트레이너까지 조건에 넣어 소유권 확인과 저장을 한 번에 함
    const { count } = await prisma.question.updateMany({
      where: { id: questionId, memberId, member: scope },
      data: { answer, answeredAt: answer ? new Date() : null },
    });
    if (count === 0) {
      return notFound("질문을 찾을 수 없습니다.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("question.PATCH", e);
  }
}
