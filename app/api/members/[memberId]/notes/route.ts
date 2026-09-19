/*
  API — 코칭 메모 작성

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNote } from "./parse";
import {
  badRequest,
  readBody,
  requireOwnedMember,
  requireTrainerId,
  serverError,
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

    const body = await readBody(request);
    const parsed = parseNote(body);
    if ("error" in parsed) return badRequest(parsed.error);

    const note = await prisma.coachingNote.create({
      data: { memberId, ...parsed.note },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (e) {
    return serverError("notes.POST", e);
  }
}
