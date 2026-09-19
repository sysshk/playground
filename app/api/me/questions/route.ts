/*
  API — 회원 본인이 트레이너에게 질문 올리기

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, readBody, requireClientMember, serverError, toTrimmed } from "@/lib/api";
import { QUESTION_MAX } from "@/lib/types";

/** 질문 올리기 */
export async function POST(request: Request) {
  const { memberId, error } = await requireClientMember();
  if (error) return error;

  try {
    const body = await readBody(request);
    const text = toTrimmed(body.body);

    if (!text) return badRequest("질문을 입력해 주세요.");
    if (text.length > QUESTION_MAX) {
      return badRequest(`질문은 ${QUESTION_MAX}자 이내로 입력해 주세요.`);
    }

    const question = await prisma.question.create({ data: { memberId, body: text } });
    return NextResponse.json({ question }, { status: 201 });
  } catch (e) {
    return serverError("me.questions.POST", e);
  }
}
