/*
  공통 — 체중 입력 범위 (화면 폼과 API가 같은 규칙을 씀)

  @date : 2026-09-14
*/

export const WEIGHT_RANGE_MESSAGE = "0보다 크고 500kg 이하로 입력해 주세요.";

/** 0 초과 500 이하의 숫자인지 */
export function isValidWeight(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 500;
}
