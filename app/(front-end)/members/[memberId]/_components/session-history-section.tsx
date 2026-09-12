"use client";

import { useState } from "react";
import { DateTimePicker } from "@/components/custom/date-picker";
import { Icon } from "@/components/custom/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/client";
import type { SessionCompletion } from "@/lib/types";
import { Section, SectionAction } from "./section";

/** 이력이 길어지면 접어 둔다. */
const VISIBLE = 5;

/**
 * 수업 이력.
 *
 * 수업 차감은 운동 기록을 저장할 때 함께 일어난다. 여기서는 남은 횟수를 보고,
 * 잘못 차감한 것을 되돌리고, 상담처럼 운동 기록이 없는 날만 직접 차감한다.
 */
export function SessionHistorySection({
  remainingSessions,
  completions,
  standaloneOpen,
  completedAt,
  maxDate,
  busy,
  onToggleStandalone,
  onCompletedAtChange,
  onComplete,
  onCancelCompletion,
}: {
  remainingSessions: number;
  completions: SessionCompletion[];
  standaloneOpen: boolean;
  /** "YYYY-MM-DDTHH:mm" */
  completedAt: string;
  /** 이 날짜(YYYY-MM-DD) 이후는 고를 수 없다. */
  maxDate: string;
  busy: boolean;
  onToggleStandalone: () => void;
  onCompletedAtChange: (value: string) => void;
  onComplete: () => void;
  onCancelCompletion: (completion: SessionCompletion) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const done = completions.length;
  // 등록한 전체 횟수는 남은 것과 쓴 것을 더한 값이다.
  const total = remainingSessions + done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const rows = expanded ? completions : completions.slice(0, VISIBLE);

  return (
    <Section
      title="수업 이력"
      subtitle="운동 기록을 저장하면 수업이 함께 차감됩니다."
      action={
        <SectionAction
          icon={standaloneOpen ? "close" : "check"}
          label={standaloneOpen ? "닫기" : "직접 차감"}
          active={standaloneOpen}
          onClick={onToggleStandalone}
        />
      }
    >
      {/* 남은 횟수와 진행 정도 */}
      <div className="rounded-xl border border-line bg-raised px-4 py-3.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">남은 수업</span>
            <span className="text-2xl font-extrabold leading-none tracking-[-0.02em]">
              {remainingSessions}
            </span>
            <span className="text-xs font-bold text-muted-foreground">회</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `등록 ${total}회 중 ${done}회 사용` : "등록된 수업이 없습니다"}
          </p>
        </div>

        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="수업 사용 정도"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>

        {remainingSessions === 0 && total > 0 && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
            <Icon name="alert" size={14} />
            남은 수업을 다 썼습니다. 재등록이 필요합니다.
          </p>
        )}
      </div>

      {standaloneOpen && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary-light/50 p-3 sm:p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            상담이나 체형 평가처럼 운동 기록이 없는 날에만 씁니다. 운동을 했다면 기록을
            저장할 때 함께 차감하세요.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold">
                차감 시각
              </span>
              <DateTimePicker
                value={completedAt}
                onChange={onCompletedAtChange}
                max={maxDate}
              />
            </div>
            <Button
              onClick={onComplete}
              disabled={remainingSessions === 0 || busy}
              className="w-full sm:w-auto"
            >
              <Icon name="check" size={17} />
              {remainingSessions === 0 ? "남은 수업이 없습니다" : "수업 1회 차감"}
            </Button>
          </div>
        </div>
      )}

      {done === 0 ? (
        <p className="mt-4 py-2 text-center text-sm text-muted-foreground">
          아직 차감한 수업이 없습니다.
        </p>
      ) : (
        <>
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {rows.map((completion, i) => (
              <li
                key={completion.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-2xs font-bold text-muted-foreground">
                    {done - i}
                  </span>
                  <span className="text-sm font-semibold">
                    {formatDateTime(completion.completedAt)}
                  </span>
                  <Badge
                    variant={completion.workoutId ? "secondary" : "outline"}
                    className="shrink-0 font-semibold"
                  >
                    {completion.workoutId ? "운동 기록" : "직접 차감"}
                  </Badge>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => onCancelCompletion(completion)}
                  className="text-muted-foreground"
                >
                  <Icon name="undo" size={14} />
                  되돌리기
                </Button>
              </li>
            ))}
          </ul>

          {done > VISIBLE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
            >
              {expanded ? "접기" : `더 보기 (${done - VISIBLE}건)`}
            </button>
          )}
        </>
      )}
    </Section>
  );
}
