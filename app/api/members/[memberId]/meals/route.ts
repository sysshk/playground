/*
  API — 트레이너가 회원 식단 한 끼 기록

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, requireOwnedMember, requireTrainerId, serverError } from "@/lib/api";
import { parseMeal } from "./parse";

type Params = { params: Promise<{ memberId: string }> };

/** 식단 한 끼 추가 */
export async function POST(request: Request, { params }: Params) {
  const { memberId } = await params;
  const { scope, error } = await requireTrainerId();
  if (error) return error;

  try {
    const owned = await requireOwnedMember(memberId, scope);
    if (owned.error) return owned.error;

    const parsed = parseMeal(await request.json());
    if ("error" in parsed) return badRequest(parsed.error);

    const meal = await prisma.meal.create({ data: { memberId, ...parsed.meal } });
    return NextResponse.json({ meal }, { status: 201 });
  } catch (e) {
    return serverError("meals.POST", e);
  }
}
