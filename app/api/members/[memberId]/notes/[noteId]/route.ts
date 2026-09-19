/*
  API — 코칭 메모 수정·삭제

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNote } from "../parse";
import {
  badRequest,
  isRecordNotFound,
  notFound,
  readBody,
  requireTrainerId,
  serverError,
} from "@/lib/api";

type Params = { params: Promise<{ memberId: string; noteId: string }> };

/** 코칭 메모 수정 */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId, noteId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await readBody(request);
    const parsed = parseNote(body);
    if ("error" in parsed) return badRequest(parsed.error);

    // 회원과 트레이너까지 조건에 넣어 소유권 확인과 수정을 한 번에 함
    const note = await prisma.coachingNote.update({
      where: { id: noteId, memberId, member: scope },
      data: parsed.note,
    });

    return NextResponse.json({ note });
  } catch (e) {
    if (isRecordNotFound(e)) return notFound("코칭 메모를 찾을 수 없습니다.");
    return serverError("note.PATCH", e);
  }
}

/** 코칭 메모 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, noteId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const { count } = await prisma.coachingNote.deleteMany({
      where: { id: noteId, memberId, member: scope },
    });
    if (count === 0) return notFound("코칭 메모를 찾을 수 없습니다.");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("note.DELETE", e);
  }
}
