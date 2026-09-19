/*
  API 공통 — 회원 정보 검증 (등록·수정이 함께 씀)

  @date : 2026-09-19
*/

import { toNumber, toTrimmed } from "@/lib/api";
import { formatPhone, PHONE_ERROR, validatePhone } from "@/lib/phone";

interface MemberInput {
  name: string;
  phone: string; // 010-0000-0000 모양으로 맞춘 값
  goal: string | null;
  memo: string | null;
  remainingSessions: number;
}

/** 이름·연락처는 꼭, 남은 수업은 0 이상 정수 */
export function parseMember(body: Record<string, unknown>): { member: MemberInput } | { error: string } {
  const name = toTrimmed(body.name);
  if (!name) return { error: "이름을 입력해 주세요." };

  const rawPhone = toTrimmed(body.phone);
  if (!rawPhone) return { error: "연락처를 입력해 주세요." };
  if (!validatePhone(rawPhone)) return { error: PHONE_ERROR };

  const remainingSessions = toNumber(body.remainingSessions) ?? 0;
  if (remainingSessions < 0 || !Number.isInteger(remainingSessions)) {
    return { error: "남은 수업은 0 이상의 정수로 입력해 주세요." };
  }

  return {
    member: {
      name,
      phone: formatPhone(rawPhone),
      goal: toTrimmed(body.goal),
      memo: toTrimmed(body.memo),
      remainingSessions,
    },
  };
}
