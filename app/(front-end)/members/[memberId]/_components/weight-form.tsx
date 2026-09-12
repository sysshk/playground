"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/custom/date-picker";
import { today } from "@/lib/client";

import { Input } from "@/components/ui/input";
export interface WeightPayload {
  date: string;
  weight: number;
  memo: string | null;
}

export default function WeightForm({
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: WeightPayload) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      setError("날짜를 선택해 주세요.");
      return;
    }

    const parsed = Number(weight);
    if (weight === "" || !Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
      setError("0보다 크고 500kg 이하로 입력해 주세요.");
      return;
    }

    onSubmit({ date, weight: parsed, memo: memo.trim() || null });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <DatePicker
          value={date}
          onChange={setDate}
          max={today()}
          ariaLabel="측정 날짜"
        />
        <div className="flex items-center gap-1.5">
          <input
            className="w-24 rounded-xl border border-line bg-surface px-3 py-2 text-center text-md font-bold outline-none focus:border-primary"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            placeholder="72.5"
            aria-label="체중"
            autoFocus
          />
          <span className="text-sm font-semibold text-muted-foreground">kg</span>
        </div>
      </div>

      <Input
        className="bg-surface py-2"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 — 공복 측정, 운동 후 측정 등"
        aria-label="메모"
      />

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <div className="flex gap-2.5">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1">
          기록하기
        </Button>
      </div>
    </form>
  );
}
