import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, requireTrainerId, serverError, toNumber, toTrimmed } from "@/lib/api";

/** 한국 시각 기준 오늘에서 days일 전의 YYYY-MM-DD */
function kstDateString(daysAgo: number) {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const t = Date.now() + KST_OFFSET - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

/** 로그인한 트레이너의 회원 목록 + 대시보드 집계 */
export async function GET() {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    // "이번 주"는 타임존에 따라 경계가 흔들린다. 최근 7일로 잡고 그대로 표기한다.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sinceDate = kstDateString(6);

    const [recentCompletions, recentWorkouts] = await Promise.all([
      prisma.sessionCompletion.count({
        where: { member: { trainerId }, completedAt: { gte: since } },
      }),
      prisma.workout.count({
        where: { member: { trainerId }, date: { gte: sinceDate } },
      }),
    ]);

    const members = await prisma.member.findMany({
      where: { trainerId },
      orderBy: { createdAt: "desc" },
      include: {
        weights: {
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { weight: true },
        },
        _count: { select: { workouts: true, completions: true } },
      },
    });

    const summaries = members.map(({ weights, _count, ...member }) => ({
      ...member,
      latestWeight: weights[0]?.weight ?? null,
      workoutCount: _count.workouts,
      // 진행 막대를 그리려면 쓴 횟수가 필요하다.
      completedSessions: _count.completions,
    }));

    return NextResponse.json({
      members: summaries,
      stats: {
        total: summaries.length,
        recentCompletions,
        recentWorkouts,
        // 3회 이하로 남은 회원은 재등록 안내가 필요하다.
        runningLow: summaries.filter(
          (m) => m.remainingSessions > 0 && m.remainingSessions <= 3,
        ).length,
      },
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
      return badRequest("남은 수업은 0 이상의 정수로 입력해 주세요.");
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
