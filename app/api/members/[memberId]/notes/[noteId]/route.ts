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

type Params = { params: Promise<{ memberId: string; noteId: string }> };

/** 코칭 메모 수정 */
export async function PATCH(request: Request, { params }: Params) {
  const { memberId, noteId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const body = await request.json();

    if (!isValidDate(body.date)) return badRequest("날짜를 선택해 주세요.");

    const pain = toTrimmed(body.pain);
    const posture = toTrimmed(body.posture);
    const movement = toTrimmed(body.movement);
    const homework = toTrimmed(body.homework);

    if (!pain && !posture && !movement && !homework) {
      return badRequest("코칭 항목을 하나 이상 입력해 주세요.");
    }

    const { count } = await prisma.coachingNote.updateMany({
      where: { id: noteId, memberId },
      data: { date: body.date, pain, posture, movement, homework },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "코칭 메모를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const note = await prisma.coachingNote.findUnique({ where: { id: noteId } });
    return NextResponse.json({ note });
  } catch (e) {
    return serverError("note.PATCH", e);
  }
}

/** 코칭 메모 삭제 */
export async function DELETE(_request: Request, { params }: Params) {
  const { memberId, noteId } = await params;
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const owned = await requireOwnedMember(memberId, trainerId);
  if (owned.error) return owned.error;

  try {
    const { count } = await prisma.coachingNote.deleteMany({
      where: { id: noteId, memberId },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "코칭 메모를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("note.DELETE", e);
  }
}
