/*
  API 공통 — 코칭 메모 검증 (작성·수정이 함께 씀)

  @date : 2026-09-19
*/

import { isValidDate, toTrimmed } from "@/lib/api";

interface NoteInput {
  date: string;
  pain: string | null; // 통증
  posture: string | null; // 자세 문제
  movement: string | null; // 움직임
  homework: string | null; // 숙제
}

/** 날짜와 네 항목 중 하나 이상 */
export function parseNote(body: Record<string, unknown>): { note: NoteInput } | { error: string } {
  if (!isValidDate(body.date)) return { error: "날짜를 선택해 주세요." };

  const note = {
    date: body.date,
    pain: toTrimmed(body.pain),
    posture: toTrimmed(body.posture),
    movement: toTrimmed(body.movement),
    homework: toTrimmed(body.homework),
  };
  if (!note.pain && !note.posture && !note.movement && !note.homework) {
    return { error: "코칭 항목을 하나 이상 입력해 주세요." };
  }
  return { note };
}
