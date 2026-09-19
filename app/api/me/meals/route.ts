/*
  API — 회원 본인의 식단 한 끼 기록

  @date : 2026-09-19
*/

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, requireClientMember, serverError } from "@/lib/api";
import { parseMeal } from "@/app/api/members/[memberId]/meals/parse";

/** 식단 한 끼 추가 */
export async function POST(request: Request) {
  const { memberId, error } = await requireClientMember();
  if (error) return error;

  try {
    const parsed = parseMeal(await request.json());
    if ("error" in parsed) return badRequest(parsed.error);

    const meal = await prisma.meal.create({ data: { memberId, ...parsed.meal } });
    return NextResponse.json({ meal }, { status: 201 });
  } catch (e) {
    return serverError("me.meals.POST", e);
  }
}
