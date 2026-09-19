/*
  API 공통 — 식단 한 끼 검증 (회원 본인·트레이너가 함께 씀)
  kcal·탄단지는 직접 입력일 때만 옴. 글·사진으로 적으면 비워 두고 나중에 AI 추정이 채움

  @date : 2026-09-19
*/

import { isValidDate, toNumber, toTrimmed } from "@/lib/api";
import { kstDay } from "@/lib/kst";
import { MEAL_MAX, MEAL_SLOTS, type MealSlot } from "@/lib/types";

interface MealInput {
  date: string;
  slot: MealSlot;
  content: string;
  calories: number | null;
  carbs: number | null;
  fat: number | null;
  protein: number | null;
}

type ParseResult = { meal: MealInput } | { error: string };

const KCAL_MAX = 10000;
const GRAM_MAX = 1000;

/** 날짜·끼니·먹은 것, 선택으로 kcal·탄단지. 미래 날짜는 막음 */
export function parseMeal(body: Record<string, unknown>): ParseResult {
  if (!isValidDate(body.date) || body.date > kstDay()) {
    return { error: "날짜를 선택해 주세요. 미래 날짜는 기록할 수 없습니다." };
  }
  if (!MEAL_SLOTS.includes(body.slot as MealSlot)) return { error: "끼니를 골라 주세요." };

  const content = toTrimmed(body.content);
  if (!content) return { error: "먹은 음식을 적어 주세요." };
  if (content.length > MEAL_MAX) return { error: `${MEAL_MAX}자 이내로 적어 주세요.` };

  const calories = toNumber(body.calories) ?? null;
  if (calories !== null && (!Number.isInteger(calories) || calories < 0 || calories > KCAL_MAX)) {
    return { error: `칼로리는 0~${KCAL_MAX} 사이 정수로 적어 주세요.` };
  }

  const grams = { carbs: "탄수화물", fat: "지방", protein: "단백질" } as const;
  const macros = { carbs: null, fat: null, protein: null } as Record<keyof typeof grams, number | null>;
  for (const key of Object.keys(grams) as (keyof typeof grams)[]) {
    const value = toNumber(body[key]) ?? null;
    if (value !== null && (value < 0 || value > GRAM_MAX)) {
      return { error: `${grams[key]}은(는) 0~${GRAM_MAX}g 사이로 적어 주세요.` };
    }
    macros[key] = value;
  }

  return { meal: { date: body.date, slot: body.slot as MealSlot, content, calories, ...macros } };
}
