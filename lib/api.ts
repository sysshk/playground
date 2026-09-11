// API 라우트 공통 유틸 — 인증 가드, 소유권 확인, 입력 검증

import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/auth-config";
import { prisma } from "@/lib/prisma";

/** 로그인한 트레이너 id를 돌려준다. 없으면 401 응답을 던진다. */
export async function requireTrainerId(): Promise<
  { trainerId: string; error: null } | { trainerId: null; error: NextResponse }
> {
  const session = await auth();
  const trainerId = session?.user?.id;

  if (!trainerId) {
    return {
      trainerId: null,
      error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }

  return { trainerId, error: null };
}

/**
 * 회원이 이 트레이너의 것인지 확인한다.
 * 남의 회원이면 존재 여부를 흘리지 않도록 404로 돌려준다.
 */
export async function requireOwnedMember(memberId: string, trainerId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, trainerId },
    select: { id: true, remainingSessions: true },
  });

  if (!member) {
    return {
      member: null,
      error: NextResponse.json(
        { error: "회원을 찾을 수 없습니다." },
        { status: 404 },
      ),
    };
  }

  return { member, error: null };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
  return NextResponse.json(
    { error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 500 },
  );
}

/** 값을 숫자로 바꾼다. 비어 있거나 숫자가 아니면 undefined. */
export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** 문자열을 다듬는다. 비면 null. */
export function toTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD 형식인지 확인한다. */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}
