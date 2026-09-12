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
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { DatePicker, HourPicker } from "@/components/custom/date-picker";
import { completedAtFrom, today } from "@/lib/client";
import type { WeightUnit, Workout } from "@/lib/types";

/** 무게 −/+ 한 번에 움직이는 양. 원판 한 쌍(1.25kg × 2) 기준. */
const WEIGHT_STEP = 2.5;

interface SetRow {
  reps: string;
  weight: string;
}

interface ExerciseRow {
  name: string;
  sets: SetRow[];
}

export interface WorkoutPayload {
  date: string;
  memo: string | null;
  /** 새 기록이면 항상 수업 1회를 차감한다. 잘못 저장했으면 수업 이력에서 되돌린다. */
  completeSession?: boolean;
  /** 수업이 있었던 시각 (새 기록일 때만 보낸다) */
  completedAt?: string;
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
  sets: [emptySet()],
});

/** 저장된 기록을 폼 입력 상태(전부 문자열)로 되돌린다. */
function toRows(workout?: Workout): ExerciseRow[] {
  if (!workout || workout.exercises.length === 0) return [emptyExercise()];
  return workout.exercises.map((e) => ({
    name: e.name,
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
  lastSets,
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  /** 주면 수정 모드로 연다. */
  workout?: Workout;
  /** 종목명 → 직전 기록 표시 ("60kg × 12회") */
  lastSets?: Map<string, string>;
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: WorkoutPayload) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(() => workout?.date ?? today());
  const [memo, setMemo] = useState(workout?.memo ?? "");
  const [rows, setRows] = useState<ExerciseRow[]>(() => toRows(workout));
  const [error, setError] = useState<string | null>(null);

  const [hour, setHour] = useState(() => new Date().getHours());
  const [removing, setRemoving] = useState<number | null>(null);

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

        // 스쿼트 1세트는 그냥 하고 2세트부터 무게를 다는 식으로 한 종목
        // 안에서 섞이므로 세트마다 따로 본다. 비웠거나 0이면 무게가 없는
        // 세트다 — 0kg으로 하는 운동은 없으니 둘을 구분할 이유가 없다.
        const raw = set.weight.trim();
        const parsed = Number(raw);
        if (raw !== "" && (!Number.isFinite(parsed) || parsed < 0)) {
          setError(`${name} ${s + 1}세트: 무게를 다시 입력해 주세요.`);
          return;
        }
        const noWeight = raw === "" || parsed === 0;

        sets.push({
          reps,
          weight: noWeight ? null : parsed,
          unit: noWeight ? "bodyweight" : "kg",
        });
      }

      exercises.push({ name, sets });
    }

    onSubmit({
      date,
      memo: memo.trim() || null,
      exercises,
      ...(workout
        ? {}
        : { completeSession: true, completedAt: completedAtFrom(date, hour) }),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold">날짜</span>
        <DatePicker value={date} onChange={setDate} max={today()} />
        <HourPicker value={hour} onChange={setHour} ariaLabel="수업 시각" />
      </div>

      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border-[1.5px] border-edge bg-surface">
          {/* 종목 */}
          <div className="flex items-center gap-2 border-b border-line py-1.5 pl-3 pr-1.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-canvas text-xs font-bold text-muted-foreground">
              {i + 1}
            </span>
            <input
              className="h-11 min-w-0 flex-1 bg-transparent text-md font-bold outline-none placeholder:font-normal placeholder:text-subtle"
              value={row.name}
              onChange={(e) => patchExercise(i, { name: e.target.value })}
              placeholder="종목명 (벤치프레스, 스쿼트 등)"
              aria-label={`${i + 1}번째 종목명`}
            />
            {lastSets?.get(row.name.trim()) && (
              <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-2xs font-bold text-primary-dark dark:text-primary-bright">
                지난 {lastSets.get(row.name.trim())}
              </span>
            )}
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRemoving(i)}
                aria-label={`${i + 1}번째 종목 삭제`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger"
              >
                <Icon name="trash" size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 p-3">
            {/* 세트 */}
            <ol className="flex flex-col gap-2">
              {row.sets.map((set, s) => (
                <li
                  key={s}
                  className="grid grid-cols-2 items-center gap-2 rounded-lg p-1 sm:flex sm:min-w-0 sm:gap-3"
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

                  <Stepper
                    label={`${s + 1}세트 무게`}
                    unit="kg"
                    value={set.weight}
                    step={WEIGHT_STEP}
                    min={0}
                    inputMode="decimal"
                    placeholder="없음"
                    emptyAtMin
                    onChange={(weight) => patchSet(i, s, { weight })}
                  />

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
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-canvas text-sm font-bold text-ink transition-colors hover:bg-raised"
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
        className="flex h-12 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-line-strong bg-surface text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Icon name="plus" size={16} />
        종목 추가
      </button>

      <textarea
        className="min-h-20 w-full resize-y rounded-xl border-[1.5px] border-edge bg-surface px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 — 폼 체크, 컨디션 등"
        aria-label="메모"
      />


      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="종목 삭제"
        message={`${rows[removing ?? 0]?.name.trim() || `${(removing ?? 0) + 1}번째 종목`}을(를) 지울까요?`}
        hint="입력한 세트도 함께 사라집니다."
        icon="trash"
        onConfirm={() => {
          setRows((p) => p.filter((_, n) => n !== removing));
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="px-5">
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1 sm:flex-none sm:px-7">
          {workout ? "수정 저장" : "저장"}
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
  placeholder = "0",
  emptyAtMin = false,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  step: number;
  min: number;
  inputMode: "numeric" | "decimal";
  placeholder?: string;
  /** 최솟값에서 한 번 더 줄이면 칸을 비운다. 무게가 없는 세트를 만드는 길이다. */
  emptyAtMin?: boolean;
  onChange: (value: string) => void;
}) {
  const empty = value.trim() === "";
  const current = Number(value) || 0;
  const bump = (delta: number) => {
    const next = round1(current + delta);
    if (emptyAtMin && next <= min) {
      onChange("");
      return;
    }
    onChange(String(Math.max(min, next)));
  };

  return (
    <div className="flex h-11 min-w-0 items-center overflow-hidden rounded-lg bg-canvas sm:flex-1">
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={emptyAtMin ? empty : current <= min}
        aria-label={`${label} 줄이기`}
        className="grid h-full w-9 shrink-0 place-items-center rounded-l-lg sm:w-11 text-muted-foreground transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
      >
        <Icon name="minus" size={17} />
      </button>
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-right text-md font-bold tabular-nums outline-none placeholder:text-line-strong"
        />
        {!(emptyAtMin && empty) && (
          <span className="shrink-0 pr-1.5 text-xs font-semibold text-muted-foreground">
            {unit}
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={() => bump(step)}
        aria-label={`${label} 늘리기`}
        className="grid h-full w-9 shrink-0 place-items-center rounded-r-lg sm:w-11 text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
      >
        <Icon name="plus" size={17} />
      </button>
    </div>
  );
}
