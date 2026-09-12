"use client";

// 운동 기록 입력 — 폰·태블릿으로 운동 중에 쓰는 화면이다.
//
// 땀난 손으로 누르기 쉽게 모든 버튼을 손가락 크기(44px) 이상으로 두고,
// 숫자는 키보드를 띄우지 않고 −/+로 바꾼다. 숫자를 누르면 직접 입력도 된다.
// 세트를 추가하면 직전 세트를 그대로 복사한다 — 대개 같은 무게로 반복하다
// 한두 세트만 바뀌기 때문이다.

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/custom/icons";
import { DatePicker } from "@/components/custom/date-picker";
import { today } from "@/lib/client";
import type { WeightUnit, Workout } from "@/lib/types";

/** 무게 −/+ 한 번에 움직이는 양. 원판 한 쌍(1.25kg × 2) 기준. */
const WEIGHT_STEP = 2.5;

interface SetRow {
  reps: string;
  weight: string;
}

interface ExerciseRow {
  name: string;
  /** 맨몸 운동은 종목 단위로 정한다. 세트마다 바뀌는 경우는 드물다. */
  unit: WeightUnit;
  sets: SetRow[];
}

export interface WorkoutPayload {
  date: string;
  memo: string | null;
  /** 저장하면서 수업 1회를 차감할지 (새 기록일 때만 보낸다) */
  completeSession?: boolean;
  exercises: {
    name: string;
    sets: { reps: number; weight: number | null; unit: WeightUnit }[];
  }[];
}

const emptySet = (from?: SetRow): SetRow => ({
  reps: from?.reps ?? "10",
  weight: from?.weight ?? "",
});

const emptyExercise = (): ExerciseRow => ({
  name: "",
  unit: "kg",
  sets: [emptySet()],
});

/** 저장된 기록을 폼 입력 상태(전부 문자열)로 되돌린다. */
function toRows(workout?: Workout): ExerciseRow[] {
  if (!workout || workout.exercises.length === 0) return [emptyExercise()];
  return workout.exercises.map((e) => ({
    name: e.name,
    unit: e.sets[0]?.unit ?? "kg",
    sets: e.sets.map((s) => ({
      reps: String(s.reps),
      weight: s.weight === null ? "" : String(s.weight),
    })),
  }));
}

/** 소수점 한 자리까지만 남긴다 (2.5kg 단위 계산에서 생기는 부동소수 오차 제거). */
const round1 = (n: number) => Math.round(n * 10) / 10;

export default function WorkoutForm({
  workout,
  remainingSessions = 0,
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  /** 주면 수정 모드로 연다. */
  workout?: Workout;
  /** 남은 수업 수 — 차감 체크에 쓴다. */
  remainingSessions?: number;
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: WorkoutPayload) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(() => workout?.date ?? today());
  const [memo, setMemo] = useState(workout?.memo ?? "");
  const [rows, setRows] = useState<ExerciseRow[]>(() => toRows(workout));
  const [error, setError] = useState<string | null>(null);

  // 새 기록이면 기본으로 수업 1회를 차감한다. 개인 운동을 기록할 때만 끈다.
  const [completeSession, setCompleteSession] = useState(
    !workout && remainingSessions > 0,
  );

  const patchExercise = (i: number, patch: Partial<ExerciseRow>) => {
    setRows((prev) => prev.map((r, n) => (n === i ? { ...r, ...patch } : r)));
    setError(null);
  };

  const patchSet = (i: number, s: number, patch: Partial<SetRow>) => {
    setRows((prev) =>
      prev.map((r, n) =>
        n === i
          ? { ...r, sets: r.sets.map((v, m) => (m === s ? { ...v, ...patch } : v)) }
          : r,
      ),
    );
    setError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const exercises: WorkoutPayload["exercises"] = [];

    for (const [i, row] of rows.entries()) {
      const name = row.name.trim();
      if (!name) {
        setError(`${i + 1}번째 종목의 이름을 입력해 주세요.`);
        return;
      }

      const sets: WorkoutPayload["exercises"][number]["sets"] = [];

      for (const [s, set] of row.sets.entries()) {
        const reps = Number(set.reps);
        if (set.reps === "" || !Number.isInteger(reps) || reps < 1) {
          setError(`${name} ${s + 1}세트: 횟수는 1 이상 입력해 주세요.`);
          return;
        }

        let weight: number | null = null;
        if (row.unit === "kg") {
          const parsed = Number(set.weight);
          if (set.weight === "" || !Number.isFinite(parsed) || parsed < 0) {
            setError(`${name} ${s + 1}세트: 무게를 입력해 주세요.`);
            return;
          }
          weight = parsed;
        }

        sets.push({ reps, weight, unit: row.unit });
      }

      exercises.push({ name, sets });
    }

    onSubmit({
      date,
      memo: memo.trim() || null,
      exercises,
      ...(workout ? {} : { completeSession }),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-raised p-3 sm:p-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold">날짜</span>
        <DatePicker value={date} onChange={setDate} max={today()} />
      </div>

      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface">
          {/* 종목 */}
          <div className="flex items-center gap-2 border-b border-line py-1.5 pl-3 pr-1.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-raised text-xs font-bold text-muted-foreground">
              {i + 1}
            </span>
            <input
              className="h-11 min-w-0 flex-1 bg-transparent text-md font-bold outline-none placeholder:font-normal placeholder:text-subtle"
              value={row.name}
              onChange={(e) => patchExercise(i, { name: e.target.value })}
              placeholder="종목명 (벤치프레스, 스쿼트 등)"
              aria-label={`${i + 1}번째 종목명`}
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((p) => p.filter((_, n) => n !== i))}
                aria-label={`${i + 1}번째 종목 삭제`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger"
              >
                <Icon name="trash" size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 p-3">
            {/* 중량 / 맨몸 */}
            <div
              role="radiogroup"
              aria-label="무게 방식"
              className="grid w-full grid-cols-2 rounded-lg bg-raised p-1 sm:w-56"
            >
              {(
                [
                  ["kg", "중량"],
                  ["bodyweight", "맨몸"],
                ] as const
              ).map(([unit, label]) => (
                <button
                  key={unit}
                  type="button"
                  role="radio"
                  aria-checked={row.unit === unit}
                  onClick={() => patchExercise(i, { unit })}
                  className={`h-9 rounded-md text-sm font-semibold transition-colors ${
                    row.unit === unit ? "bg-surface text-ink shadow-card" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 세트 */}
            <ol className="flex flex-col gap-2">
              {row.sets.map((set, s) => (
                <li
                  key={s}
                  className="grid grid-cols-2 items-center gap-2 rounded-lg border border-line p-2 sm:flex sm:gap-3"
                >
                  <div className="col-span-2 flex items-center justify-between sm:w-14 sm:shrink-0">
                    <span className="text-sm font-bold text-muted-foreground">{s + 1}세트</span>
                    {row.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          patchExercise(i, { sets: row.sets.filter((_, m) => m !== s) })
                        }
                        aria-label={`${s + 1}세트 삭제`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger sm:hidden"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>

                  <Stepper
                    label={`${s + 1}세트 횟수`}
                    unit="회"
                    value={set.reps}
                    step={1}
                    min={1}
                    inputMode="numeric"
                    onChange={(reps) => patchSet(i, s, { reps })}
                  />

                  {row.unit === "kg" ? (
                    <Stepper
                      label={`${s + 1}세트 무게`}
                      unit="kg"
                      value={set.weight}
                      step={WEIGHT_STEP}
                      min={0}
                      inputMode="decimal"
                      onChange={(weight) => patchSet(i, s, { weight })}
                    />
                  ) : (
                    <span className="flex h-11 items-center justify-center rounded-lg bg-raised text-sm font-semibold text-muted-foreground sm:flex-1">
                      맨몸
                    </span>
                  )}

                  {row.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        patchExercise(i, { sets: row.sets.filter((_, m) => m !== s) })
                      }
                      aria-label={`${s + 1}세트 삭제`}
                      className="hidden h-11 w-11 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger sm:grid"
                    >
                      <Icon name="close" size={17} />
                    </button>
                  )}
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() =>
                patchExercise(i, {
                  sets: [...row.sets, emptySet(row.sets[row.sets.length - 1])],
                })
              }
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-raised text-sm font-bold text-ink transition-colors hover:bg-line"
            >
              <Icon name="plus" size={16} />
              세트 추가
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((p) => [...p, emptyExercise()])}
        className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Icon name="plus" size={16} />
        종목 추가
      </button>

      <textarea
        className="min-h-16 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 — 폼 체크, 컨디션 등"
        aria-label="메모"
      />

      {!workout && (
        <label
          title="회원 혼자 한 개인 운동이면 끄세요"
          className={`flex items-center gap-2 text-sm ${
            remainingSessions === 0 ? "opacity-60" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            checked={completeSession}
            disabled={remainingSessions === 0}
            onChange={(e) => setCompleteSession(e.target.checked)}
            className="size-4 shrink-0 accent-primary"
          />
          <span className="font-semibold">수업 1회 차감</span>
          <span className="text-xs text-muted-foreground">
            {remainingSessions === 0
              ? "남은 수업 없음"
              : `${remainingSessions}회 → ${
                  remainingSessions - (completeSession ? 1 : 0)
                }회`}
          </span>
        </label>
      )}

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="px-5">
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1 sm:flex-none sm:px-7">
          {workout ? "수정 저장" : "운동 기록 저장"}
        </Button>
      </div>
    </form>
  );
}

/** −/+ 버튼으로 숫자를 바꾸는 입력. 가운데 숫자를 누르면 직접 입력할 수 있다. */
function Stepper({
  label,
  unit,
  value,
  step,
  min,
  inputMode,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  step: number;
  min: number;
  inputMode: "numeric" | "decimal";
  onChange: (value: string) => void;
}) {
  const current = Number(value) || 0;
  const bump = (delta: number) =>
    onChange(String(Math.max(min, round1(current + delta))));

  return (
    <div className="flex h-11 items-center rounded-lg border border-line sm:flex-1">
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={current <= min}
        aria-label={`${label} 줄이기`}
        className="grid h-full w-11 shrink-0 place-items-center rounded-l-lg text-muted-foreground transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
      >
        <Icon name="minus" size={17} />
      </button>
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder="0"
          aria-label={label}
          className="w-full min-w-0 bg-transparent text-right text-md font-bold tabular-nums outline-none placeholder:text-line-strong"
        />
        <span className="shrink-0 pr-1 text-xs font-semibold text-muted-foreground">{unit}</span>
      </label>
      <button
        type="button"
        onClick={() => bump(step)}
        aria-label={`${label} 늘리기`}
        className="grid h-full w-11 shrink-0 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
      >
        <Icon name="plus" size={17} />
      </button>
    </div>
  );
}
