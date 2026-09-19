/*
  공통 도구 — className 합치기 (shadcn 규약 경로), 소수 첫째 자리 반올림

  @date : 2026-09-12
*/

export { cn } from "cn"

/** 소수 첫째 자리까지 반올림 */
export function round1(value: number) {
  return Math.round(value * 10) / 10;
}
