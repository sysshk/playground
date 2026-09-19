/*
  공통 — 인바디 결과지의 표준 범위와 막대 눈금
  표준체중은 BMI 22(여성 21) × 키², 골격근량·체지방량 표준은 표준체중에 대한 비율

  @date : 2026-09-19
*/

import type { Gender } from "@/lib/nutrition";
import { round1 } from "@/lib/utils";

/**
 * 인바디 결과지의 표준 범위 — 키·성별로 계산함
 * 표준체중은 BMI 22(여성 21) × 키², 골격근량·체지방량은 표준체중에 대한 비율
 * 결과지(171cm 남성: 체중 54.7~73.9, 골격근량 27.5~33.5, 체지방량 7.7~15.4)와 맞춘 근사식
 */
export function inbodyStandard(height: number, gender: Gender) {
  const h = height / 100;
  const weight = (gender === "male" ? 22 : 21) * h * h;
  // 결과지와 같은 반올림 — 체중·골격근은 소수 한 자리로 맞춘 표준값, 체지방은 맞추기 전 값으로 곱함
  const standardWeight = round1(weight);
  return {
    weight: standardWeight,
    muscle: round1(standardWeight * (gender === "male" ? 0.474 : 0.41)),
    fat: weight * (gender === "male" ? 0.15 : 0.23),
  };
}

/** 결과지 막대의 눈금. 눈금 사이 간격은 같게 그림 (체지방량처럼 뒤로 갈수록 성긴 눈금) */
export type InbodyScale = { ticks: number[]; low: number; high: number };

export const SCALE = {
  weight: {
    ticks: [55, 70, 85, 100, 115, 130, 145, 160, 175, 190, 205],
    low: 85,
    high: 115,
  },
  muscle: {
    ticks: [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170],
    low: 90,
    high: 110,
  },
  fat: {
    ticks: [40, 60, 80, 100, 160, 220, 280, 340, 400, 460, 520],
    low: 80,
    high: 160,
  },
  bodyFatMale: {
    ticks: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    low: 10,
    high: 20,
  },
  bodyFatFemale: {
    ticks: [8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58],
    low: 18,
    high: 28,
  },
  lean: {
    ticks: [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170],
    low: 90,
    high: 110,
  },
  whrMale: {
    ticks: [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2],
    low: 0.8,
    high: 0.9,
  },
  whrFemale: {
    ticks: [0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15],
    low: 0.75,
    high: 0.85,
  },
} satisfies Record<string, InbodyScale>;

/** 눈금 위의 위치 0~1 */
export function scalePosition(scale: InbodyScale, value: number) {
  const { ticks } = scale;
  if (value <= ticks[0]) return 0;
  for (let i = 0; i < ticks.length - 1; i++) {
    if (value <= ticks[i + 1]) {
      return (
        (i + (value - ticks[i]) / (ticks[i + 1] - ticks[i])) /
        (ticks.length - 1)
      );
    }
  }
  return 1;
}
