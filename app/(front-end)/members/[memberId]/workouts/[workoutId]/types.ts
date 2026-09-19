/*
  수업 기록 작성·수정 화면 — 이 화면에서만 쓰는 타입

  @date : 2026-09-16
*/

import type { WeightUnit } from "@/lib/types";

/** 세트 한 줄. 입력 중에는 전부 문자열로 들고 있다가 저장할 때 숫자로 바꿈 */
export interface SetRow {
  unit: WeightUnit; // 입력 방식 탭 — 무게, 바디웨이트, 좌우
  reps: string; // 횟수
  weight: string; // 무게 kg, 좌우면 왼쪽
  weightRight: string; // 좌우일 때 오른쪽 무게 kg
}

/** 종목 한 덩어리 */
export interface ExerciseRow {
  name: string; // 종목명, 비우면 저장할 때 빠짐
  restSeconds: number | null; // 마지막으로 누른 휴식 타이머 초 — 종목의 휴식 시간으로 저장
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
    restSeconds: number | null;
    sets: { reps: number; weight: number | null; weightRight: number | null; unit: WeightUnit }[]; // 세트마다 방식·무게가 다를 수 있음
  }[];
}
