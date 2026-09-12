"use client";

import { FormEvent, useState } from "react";
import { DatePicker, HourPicker } from "@/components/custom/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today } from "@/lib/client";

import { Icon } from "@/components/custom/icons";
export interface SessionCompletePayload {
  /** YYYY-MM-DD */
  date: string;
  /** 0~23. 분 단위는 받지 않는다. */
  time: number;
  reason: string | null;
}

/** 사유는 몇 가지로 정해져 있다. 폰에서 키보드를 올리지 않고 넣게 한다. */
const QUICK_REASONS = ["상담", "체형 평가", "노쇼"];

/** 운동 기록 없이 수업 1회를 차감하는 폼. */
export default function SessionCompleteForm({
  disabled = false,
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  /** 남은 수업이 없어 차감할 수 없는 상태 */
  disabled?: boolean;
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: SessionCompletePayload) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(() => new Date().getHours());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      setError("날짜를 선택해 주세요.");
      return;
    }

    onSubmit({ date, time, reason: reason.trim() || null });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <DatePicker
          value={date}
          onChange={setDate}
          max={today()}
          ariaLabel="차감 날짜"
        />
        <HourPicker value={time} onChange={setTime} ariaLabel="차감 시간" />
      </div>

      <Input
        className="bg-surface"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="사유 — 상담, 체형 평가 등 (선택)"
        aria-label="차감 사유"
        maxLength={40}
      />

      <div className="flex flex-wrap gap-2">
        {QUICK_REASONS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setReason(label)}
            className="h-8 rounded-full border border-line bg-surface px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-edge hover:text-ink"
          >
            + {label}
          </button>
        ))}
      </div>

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <div className="flex gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          취소
        </Button>
        <Button type="submit" loading={busy} disabled={disabled} className="flex-1">
          <Icon name="check" size={17} />
          {disabled ? "남은 수업이 없습니다" : "수업 1회 차감"}
        </Button>
      </div>
    </form>
  );
}
