/*
  API — 회원 등록, 여러 명 삭제

  @date : 2026-09-12
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMember } from "./parse";
import {
  badRequest,
  readBody,
  requireTrainerId,
  serverError,
} from "@/lib/api";

/** 회원 등록 */
export async function POST(request: Request) {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await readBody(request);
    const parsed = parseMember(body);
    if ("error" in parsed) return badRequest(parsed.error);

    const member = await prisma.member.create({
      data: { trainerId, ...parsed.member },
      select: { id: true, name: true },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    return serverError("members.POST", e);
  }
}

/** 회원 여러 명 삭제 — 연결된 기록도 함께 지워짐 (onDelete: Cascade). */
export async function DELETE(request: Request) {
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await readBody(request);
    const ids = body.ids;
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      !ids.every((id) => typeof id === "string")
    ) {
      return badRequest("삭제할 회원을 선택해 주세요.");
    }

    // scope를 조건에 넣어 남의 회원은 지워지지 않게 함
    // 연결된 앱 계정은 지우지 않는다(연결만 풀림). 계정 관리에서 다른 회원에 다시 이을 수 있음
    const { count } = await prisma.member.deleteMany({
      where: { id: { in: ids }, ...scope },
    });

    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return serverError("members.DELETE", e);
  }
}
