// 운동 기록의 종목·세트 검증. 추가(POST)와 수정(PATCH)이 같은 규칙을 쓴다.

import { toNumber, toTrimmed } from "@/lib/api";

interface SetInput {
  order: number;
  reps: number;
  weight: number | null;
  unit: "kg" | "bodyweight";
}

export interface ExerciseInput {
  name: string;
  order: number;
  sets: { create: SetInput[] };
}

type ParseResult = { exercises: ExerciseInput[] } | { error: string };

/** 요청 본문의 exercises를 Prisma가 바로 받을 수 있는 형태로 바꾼다. */
export function parseExercises(raw: unknown): ParseResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "종목을 하나 이상 추가해 주세요." };
  }

  const exercises: ExerciseInput[] = [];

  for (const [index, item] of raw.entries()) {
    const name = toTrimmed(item?.name);
    if (!name) return { error: `종목 ${index + 1}: 종목명을 입력해 주세요.` };

    if (!Array.isArray(item?.sets) || item.sets.length === 0) {
      return { error: `${name}: 세트를 하나 이상 입력해 주세요.` };
    }

    const sets: SetInput[] = [];

    for (const [setIndex, rawSet] of item.sets.entries()) {
      const label = `${name} ${setIndex + 1}세트`;

      const reps = toNumber(rawSet?.reps);
      if (reps === undefined || reps < 1 || !Number.isInteger(reps)) {
        return { error: `${label}: 횟수는 1 이상 입력해 주세요.` };
      }

      const unit: "kg" | "bodyweight" =
        rawSet?.unit === "bodyweight" ? "bodyweight" : "kg";

      let weight: number | null = null;
      if (unit === "kg") {
        const parsed = toNumber(rawSet?.weight);
        if (parsed === undefined || parsed < 0) {
          return { error: `${label}: 무게는 0 이상 입력해 주세요.` };
        }
        weight = parsed;
      }

      sets.push({ order: setIndex, reps, weight, unit });
    }

    exercises.push({ name, order: index, sets: { create: sets } });
  }

  return { exercises };
}
