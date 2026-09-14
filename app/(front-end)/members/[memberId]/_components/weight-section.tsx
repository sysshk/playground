/*
  회원 상세·내 기록 화면 — 체중 섹션 (그래프 박스, 기록 목록, 기록 입력 창)

  @date : 2026-09-12
*/

"use client";

import { FormEvent, useState } from "react";
import { DatePicker } from "@/components/custom/date-picker";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateShort, today } from "@/lib/client";
import type { WeightRecord } from "@/lib/types";
import { isValidWeight, WEIGHT_RANGE_MESSAGE } from "@/lib/weight";
import { IconButton, Section, SectionAction } from "./section";
import { WeightChartCard } from "./weight-chart";

export interface WeightPayload {
  date: string;
  weight: number;
  memo: string | null;
}

/** 체중 기록. 맨 위가 최신이고, 그 값이 회원 요약의 최신 체중이 된다. */
export function WeightSection({
  weights,
  targetWeight,
  readOnly = false,
  formOpen = false,
  busy = false,
  serverError = null,
  onToggle,
  onSubmit,
  onSaveGoal,
  onCancel,
  onDelete,
}: {
  weights: WeightRecord[];
  targetWeight: number | null;
  /** 회원 본인 화면 — 기록·삭제·목표 수정을 숨긴다. 이때 아래 핸들러는 넘기지 않는다. */
  readOnly?: boolean;
  formOpen?: boolean;
  busy?: boolean;
  serverError?: string | null;
  onToggle?: () => void;
  onSubmit?: (payload: WeightPayload) => void;
  onSaveGoal?: (targetWeight: number | null) => void;
  onCancel?: () => void;
  onDelete?: (record: WeightRecord) => void;
}) {
  return (
    <Section
      title="체중 기록"
      subtitle={
        weights.length > 0
          ? `총 ${weights.length}건 · 최신순`
          : "체중 변화를 기록해 보세요."
      }
      action={
        readOnly ? undefined : (
          <SectionAction icon="plus" label="체중 기록" onClick={onToggle} />
        )
      }
    >
      {/* 입력 창 */}
      {!readOnly && onSubmit && onCancel && (
        <Dialog
          open={formOpen}
          onOpenChange={(next) => {
            if (!next) onCancel();
          }}
        >
          <DialogContent dismissOnOutsideClick>
            <DialogHeader>
              <DialogTitle>체중 기록</DialogTitle>
            </DialogHeader>
            <WeightForm busy={busy} serverError={serverError} onSubmit={onSubmit} />
          </DialogContent>
        </Dialog>
      )}

      {weights.length === 0 ? (
        <EmptyState
          icon="trend"
          title="체중 기록이 없습니다"
          description={
            readOnly
              ? "트레이너가 체중을 기록하면 여기에 그래프로 보입니다."
              : "첫 체중을 기록하고 변화를 확인해 보세요."
          }
        />
      ) : (
        <>
          {/* 그래프 */}
          <WeightChartCard
            weights={weights}
            targetWeight={targetWeight}
            busy={busy}
            onSaveGoal={readOnly ? undefined : onSaveGoal}
          />

          {/* 목록 */}
          <ul className="flex flex-col divide-y divide-line">
            {weights.map((record) => (
              <li
                key={record.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-base font-bold">
                    {record.weight}
                    <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
                      kg
                    </span>
                    <span className="ml-2.5 text-xs font-medium text-muted-foreground">
                      {formatDateShort(record.date)}
                    </span>
                  </p>
                  {record.memo && (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {record.memo}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <IconButton
                    icon="trash"
                    label={`${record.date} 체중 기록 삭제`}
                    danger
                    onClick={() => onDelete?.(record)}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

function WeightForm({
  busy,
  serverError,
  onSubmit,
}: {
  busy: boolean;
  serverError: string | null;
  onSubmit: (payload: WeightPayload) => void;
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
    if (weight.trim() === "" || !isValidWeight(parsed)) {
      setError(WEIGHT_RANGE_MESSAGE);
      return;
    }

    onSubmit({ date, weight: parsed, memo: memo.trim() || null });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

      <Button type="submit" loading={busy}>
        기록하기
      </Button>
    </form>
  );
}
