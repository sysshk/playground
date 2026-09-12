import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  requireOwnedMember,
  requireTrainerId,
  serverError,
  toTrimmed,
} from "@/lib/api";

/** 메모는 일정 줄에 한 줄로 보이는 값이라 길게 받지 않는다. */
const MEMO_MAX = 60;

/**
 * 일정 목록.
 *
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD 구간으로 받는다. to는 그날을 포함한다.
 * 구간을 안 주면 오늘 하루만 내려준다 — 홈 화면이 제일 자주 쓰는 모양이다.
 */
export async function GET(request: Request) {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to") ?? from;

  const range = dayRange(from, to);
  if (!range) return badRequest("날짜 형식이 올바르지 않습니다.");

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        member: { trainerId },
        startsAt: { gte: range.start, lt: range.end },
      },
      orderBy: { startsAt: "asc" },
      include: {
        member: {
          select: { id: true, name: true, phone: true, remainingSessions: true },
        },
      },
    });

    return NextResponse.json({ appointments });
  } catch (e) {
    return serverError("appointments.GET", e);
  }
}

/** 일정 등록 */
export async function POST(request: Request) {
  const { trainerId, error } = await requireTrainerId();
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));

    const memberId = toTrimmed(body?.memberId);
    if (!memberId) return badRequest("회원을 선택해 주세요.");

    const owned = await requireOwnedMember(memberId, trainerId);
    if (owned.error) return owned.error;

    const startsAt = parseStart(body?.startsAt);
    if (!startsAt) return badRequest("시작 시각이 올바르지 않습니다.");

    const memo = toTrimmed(body?.memo);
    if (memo && memo.length > MEMO_MAX) {
      return badRequest(`메모는 ${MEMO_MAX}자 이내로 입력해 주세요.`);
    }

    const appointment = await prisma.appointment.create({
      data: { memberId, startsAt, memo },
      include: {
        member: {
          select: { id: true, name: true, phone: true, remainingSessions: true },
        },
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (e) {
    return serverError("appointments.POST", e);
  }
}

/** "YYYY-MM-DD" 두 개를 [시작, 끝) 구간으로 바꾼다. 없으면 오늘 하루. */
function dayRange(from: string | null, to: string | null) {
  const startKey = from ?? todayKey();
  const endKey = to ?? startKey;
  if (!isDateKey(startKey) || !isDateKey(endKey)) return null;

  const start = fromKey(startKey);
  const end = fromKey(endKey);
  end.setDate(end.getDate() + 1);
  if (end <= start) return null;

  return { start, end };
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** 분·초는 버리고 시 단위로 맞춘다. 화면에서도 시까지만 고르게 되어 있다. */
export function parseStart(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setMinutes(0, 0, 0);
  return parsed;
}
