import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, requireTrainerId, serverError, toNumber, toTrimmed } from "@/lib/api";

/** 로그인한 트레이너의 회원 목록 (최신 체중 · 운동 기록 수 포함) */
export async function GET() {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const members = await prisma.member.findMany({
      where: { trainerId },
      orderBy: { createdAt: "desc" },
      include: {
        weights: {
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { weight: true },
        },
        _count: { select: { workouts: true } },
      },
    });

    return NextResponse.json({
      members: members.map(({ weights, _count, ...member }) => ({
        ...member,
        latestWeight: weights[0]?.weight ?? null,
        workoutCount: _count.workouts,
      })),
    });
  } catch (e) {
    return serverError("members.GET", e);
  }
}

/** 회원 등록 */
export async function POST(request: Request) {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await request.json();

    const name = toTrimmed(body.name);
    if (!name) return badRequest("이름을 입력해 주세요.");

    const phone = toTrimmed(body.phone);
    if (!phone) return badRequest("연락처를 입력해 주세요.");

    const remainingSessions = toNumber(body.remainingSessions) ?? 0;
    if (remainingSessions < 0 || !Number.isInteger(remainingSessions)) {
      return badRequest("남은 세션은 0 이상의 정수로 입력해 주세요.");
    }

    const member = await prisma.member.create({
      data: {
        trainerId,
        name,
        phone,
        goal: toTrimmed(body.goal),
        memo: toTrimmed(body.memo),
        remainingSessions,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    return serverError("members.POST", e);
  }
}
