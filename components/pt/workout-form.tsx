"use client";

import { FormEvent, useState } from "react";
import { Button, Field, inputClass } from "./ui";
import { today } from "@/lib/client";
import type { WeightUnit } from "@/lib/types";

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  unit: WeightUnit;
  weight: string;
}

export interface WorkoutPayload {
  date: string;
  memo: string | null;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    unit: WeightUnit;
    weight: number | null;
  }[];
}

const emptyRow = (): ExerciseRow => ({
  name: "",
  sets: "3",
  reps: "10",
  unit: "kg",
  weight: "",
});

export default function WorkoutForm({
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: WorkoutPayload) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState("");
  const [rows, setRows] = useState<ExerciseRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (index: number, patch: Partial<ExerciseRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      setError("날짜를 선택해 주세요.");
      return;
    }

    const exercises: WorkoutPayload["exercises"] = [];

    for (const [index, row] of rows.entries()) {
      const name = row.name.trim();
      if (!name) {
        setError(`종목 ${index + 1}: 종목명을 입력해 주세요.`);
        return;
      }

      const sets = Number(row.sets);
      if (!Number.isInteger(sets) || sets < 1) {
        setError(`${name}: 세트 수는 1 이상 입력해 주세요.`);
        return;
      }

      const reps = Number(row.reps);
      if (!Number.isInteger(reps) || reps < 1) {
        setError(`${name}: 횟수는 1 이상 입력해 주세요.`);
        return;
      }

      let weight: number | null = null;
      if (row.unit === "kg") {
        const parsed = Number(row.weight);
        if (row.weight === "" || !Number.isFinite(parsed) || parsed < 0) {
          setError(`${name}: 무게는 0 이상 입력해 주세요.`);
          return;
        }
        weight = parsed;
      }

      exercises.push({ name, sets, reps, unit: row.unit, weight });
    }

    onSubmit({ date, memo: memo.trim() || null, exercises });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="날짜" required>
        <input
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">운동 종목</span>
          <span className="text-[12px] text-muted">
            하루에 진행한 종목을 모두 추가하세요.
          </span>
        </div>

        {rows.map((row, index) => (
          <fieldset
            key={index}
            className="rounded-xl border border-line bg-canvas p-3.5"
          >
            <legend className="sr-only">종목 {index + 1}</legend>

            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-muted">
                종목 {index + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  aria-label={`종목 ${index + 1} 삭제`}
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="rounded-lg px-2 py-1 text-[12px] font-semibold text-danger transition-colors hover:bg-red-50"
                >
                  삭제
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <input
                className={inputClass}
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder="벤치프레스, 스쿼트 등"
                aria-label={`종목 ${index + 1} 종목명`}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-muted">세트 수</span>
                  <input
                    className={inputClass}
                    value={row.sets}
                    onChange={(e) => updateRow(index, { sets: e.target.value })}
                    inputMode="numeric"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-muted">횟수</span>
                  <input
                    className={inputClass}
                    value={row.reps}
                    onChange={(e) => updateRow(index, { reps: e.target.value })}
                    inputMode="numeric"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-muted">무게 단위</span>
                  <select
                    className={inputClass}
                    value={row.unit}
                    onChange={(e) =>
                      updateRow(index, { unit: e.target.value as WeightUnit })
                    }
                  >
                    <option value="kg">kg</option>
                    <option value="bodyweight">바디웨이트</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-muted">무게 (kg)</span>
                  <input
                    className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
                    value={row.unit === "bodyweight" ? "" : row.weight}
                    onChange={(e) => updateRow(index, { weight: e.target.value })}
                    disabled={row.unit === "bodyweight"}
                    inputMode="decimal"
                    placeholder={row.unit === "bodyweight" ? "—" : "예: 72.5"}
                  />
                </label>
              </div>
            </div>
          </fieldset>
        ))}

        <Button
          variant="ghost"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
        >
          + 종목 추가
        </Button>
      </div>

      <Field label="메모">
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="폼 체크, 컨디션 등"
        />
      </Field>

      {(error || serverError) && (
        <p className="text-[13px] text-danger">{error ?? serverError}</p>
      )}

      <div className="mt-2 flex gap-2.5">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1">
          저장하기
        </Button>
      </div>
    </form>
  );
}
