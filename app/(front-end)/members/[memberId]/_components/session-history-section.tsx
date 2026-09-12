"use client";

import { useState } from "react";
import { Icon } from "@/components/custom/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayHour } from "@/lib/client";
import type { SessionCompletion } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Section, SectionAction } from "./section";
import SessionCompleteForm, {
  type SessionCompletePayload,
} from "./session-complete-form";

/** 이력이 길어지면 접어 둔다. */
const VISIBLE = 5;

/**
 * 수업 이력.
 *
 * 수업 차감은 운동 기록을 저장할 때 함께 일어난다. 여기서는 남은 횟수를 보고,
 * 잘못 차감한 것을 되돌리고, 상담처럼 운동 기록이 없는 날만 직접 차감한다.
 */
export function SessionHistorySection({
  id,
  remainingSessions,
  completions,
  standaloneOpen,
  busy,
  serverError,
  onToggleStandalone,
  onComplete,
  onCancelCompletion,
}: {
  id?: string;
  remainingSessions: number;
  completions: SessionCompletion[];
  standaloneOpen: boolean;
  busy: boolean;
  serverError: string | null;
  onToggleStandalone: () => void;
  onComplete: (payload: SessionCompletePayload) => void;
  onCancelCompletion: (completion: SessionCompletion) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const done = completions.length;
  const rows = expanded ? completions : completions.slice(0, VISIBLE);

  return (
    <Section
      id={id}
      title="수업 이력"
      subtitle="운동 기록을 저장하면 수업이 함께 차감됩니다."
      action={
        <SectionAction
          icon="check"
          label="직접 차감"
          onClick={onToggleStandalone}
        />
      }
    >
      <Dialog
        open={standaloneOpen}
        onOpenChange={(next) => {
          if (!next) onToggleStandalone();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수업 1회 차감</DialogTitle>
            <DialogDescription>
              상담이나 체형 평가처럼 남길 운동 기록이 없는 날에 씁니다.
            </DialogDescription>
          </DialogHeader>
          <SessionCompleteForm
            disabled={remainingSessions === 0}
            busy={busy}
            serverError={serverError}
            onSubmit={onComplete}
            onCancel={onToggleStandalone}
          />
        </DialogContent>
      </Dialog>

      {done === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          아직 차감한 수업이 없습니다.
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((completion, i) => (
              <li
                key={completion.id}
                className="flex items-center justify-between gap-2 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-2xs font-bold text-muted-foreground">
                    {done - i}
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {formatDayHour(completion.completedAt)}
                  </span>
                  {(completion.workoutId || completion.reason) && (
                    <Badge
                      variant={completion.workoutId ? "secondary" : "outline"}
                      className="shrink-0 font-semibold"
                    >
                      {completion.workoutId ? "운동 기록" : completion.reason}
                    </Badge>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => onCancelCompletion(completion)}
                  className="shrink-0 text-muted-foreground"
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
