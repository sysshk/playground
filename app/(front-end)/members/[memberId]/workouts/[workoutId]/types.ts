/*
  수업 기록 작성·수정 화면 — 이 화면에서만 쓰는 타입

  @date : 2026-09-16
*/

import type { WeightUnit } from "@/lib/types";

/** 세트 한 줄. 입력 중에는 전부 문자열로 들고 있다가 저장할 때 숫자로 바꿈 */
export interface SetRow {
  reps: string; // 횟수
  weight: string; // 무게 kg, 바디웨이트면 빈 값
  bodyweight: boolean; // 켜면 무게 없이 한 세트
}

/** 종목 한 덩어리 */
export interface ExerciseRow {
  name: string; // 종목명, 비우면 저장할 때 빠짐
  sets: SetRow[];
  editing: boolean; // 펼친 종목 — 끄면 글자만 보여 잘못 눌러도 값이 안 바뀜
}

/** API로 보낼 값 */
export interface WorkoutPayload {
  date: string; // 수업한 날 YYYY-MM-DD
  memo: string | null;
  completedAt: string; // 수업 시각 — 수정하면 연결된 수업의 시각도 따라감
  exercises: {
    name: string;
    sets: { reps: number; weight: number | null; unit: WeightUnit }[]; // 세트마다 무게가 다를 수 있음
  }[];
}
