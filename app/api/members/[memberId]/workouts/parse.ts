/*
  API 공통 — 수업 기록의 종목·세트·수업 시각 검증 (추가·수정이 함께 씀)

  @date : 2026-09-12
*/

import { toNumber, toTrimmed } from "@/lib/api";
import type { WeightUnit } from "@/lib/types";

interface SetInput {
  order: number;
  reps: number;
  weight: number | null;
  weightRight: number | null;
  unit: WeightUnit;
}

export interface ExerciseInput {
  name: string;
  order: number;
  restSeconds: number | null;
  sets: { create: SetInput[] };
}

type ParseResult = { exercises: ExerciseInput[] } | { error: string };

const MAX_EXERCISES = 30;
const MAX_SETS = 30;
const NAME_MAX = 50;
const REPS_MAX = 1000;
const WEIGHT_MAX = 1000;

/** 폼이 보낸 수업 시각. 안 보냈으면 value가 없음 */
export function parseCompletedAt(
  raw: unknown,
): { value?: Date } | { error: string } {
  if (!raw) return {};

  const picked = new Date(raw as string);
  if (Number.isNaN(picked.getTime())) {
    return { error: "수업 시각이 올바르지 않습니다." };
  }
  // 시계 오차만큼은 봐줌
  if (picked.getTime() > Date.now() + 5 * 60 * 1000) {
    return { error: "수업 시각은 미래로 지정할 수 없습니다." };
  }
  return { value: picked };
}

/** 요청 본문의 exercises를 Prisma가 바로 받을 수 있는 형태로 바꿈 */
export function parseExercises(raw: unknown): ParseResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "종목을 하나 이상 추가해 주세요." };
  }
  if (raw.length > MAX_EXERCISES) {
    return { error: `종목은 한 번에 ${MAX_EXERCISES}개까지 기록할 수 있습니다.` };
  }

  const exercises: ExerciseInput[] = [];

  for (const [index, item] of raw.entries()) {
    const name = toTrimmed(item?.name);
    if (!name) return { error: `종목 ${index + 1}: 종목명을 입력해 주세요.` };
    if (name.length > NAME_MAX) {
      return { error: `종목 ${index + 1}: 종목명은 ${NAME_MAX}자 이내로 입력해 주세요.` };
    }

    if (!Array.isArray(item?.sets) || item.sets.length === 0) {
      return { error: `${name}: 세트를 하나 이상 입력해 주세요.` };
    }
    if (item.sets.length > MAX_SETS) {
      return { error: `${name}: 세트는 ${MAX_SETS}개까지 기록할 수 있습니다.` };
    }

    const sets: SetInput[] = [];

    for (const [setIndex, rawSet] of item.sets.entries()) {
      const label = `${name} ${setIndex + 1}세트`;

      const reps = toNumber(rawSet?.reps);
      if (reps === undefined || reps < 1 || reps > REPS_MAX || !Number.isInteger(reps)) {
        return { error: `${label}: 횟수는 1~${REPS_MAX} 사이로 입력해 주세요.` };
      }

      const unit: WeightUnit =
        rawSet?.unit === "bodyweight" || rawSet?.unit === "sides" ? rawSet.unit : "kg";

      let weight: number | null = null;
      let weightRight: number | null = null;
      if (unit !== "bodyweight") {
        weight = toNumber(rawSet?.weight) ?? null;
        if (weight === null || weight < 0 || weight > WEIGHT_MAX) {
          return { error: `${label}: 무게는 0~${WEIGHT_MAX}kg 사이로 입력해 주세요.` };
        }
      }
      if (unit === "sides") {
        weightRight = toNumber(rawSet?.weightRight) ?? null;
        if (weightRight === null || weightRight < 0 || weightRight > WEIGHT_MAX) {
          return { error: `${label}: 오른쪽 무게는 0~${WEIGHT_MAX}kg 사이로 입력해 주세요.` };
        }
      }

      sets.push({ order: setIndex, reps, weight, weightRight, unit });
    }

    // 휴식은 선택. 0~10분 사이 정수 초만 받고 나머지는 비움
    const rest = toNumber(item?.restSeconds);
    const restSeconds = rest !== undefined && Number.isInteger(rest) && rest > 0 && rest <= 600 ? rest : null;

    exercises.push({ name, order: index, restSeconds, sets: { create: sets } });
  }

  return { exercises };
}
