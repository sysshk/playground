"use client";

// 수업 하나가 한 줄이다. 종목을 남긴 수업은 종목을, 상담처럼 남길 운동이
// 없던 수업은 사유를 보여준다. 예전에는 이 둘이 '운동 기록'과 '수업 이력'으로
// 나뉘어 있어 같은 날 수업이 두 곳에 각각 나왔다.

import { useState } from "react";
import { EmptyState } from "@/components/custom/empty-state";
import { formatDateShort, formatDayShort, formatHour } from "@/lib/client";
import type { Exercise, SessionCompletion, Workout } from "@/lib/types";
import { IconButton, Section, SectionAction } from "./section";

/** 이력이 길어지면 접어 둔다. */
const VISIBLE = 6;

/** 목록에 그리는 수업 한 건. 둘 중 하나는 반드시 있다. */
interface SessionEntry {
  key: string;
  /** 정렬용 시각 */
  at: number;
  label: string;
  /** 몇 번째 수업인지. 완료 내역이 붙은 것만 센다. */
  no?: number;
  /** 완료 시각. 운동 기록만 있는 옛 자료에는 없다. */
  hour?: string;
  completion?: SessionCompletion;
  workout?: Workout;
}

/** 완료 내역과 운동 기록을 시간순 한 줄기로 엮는다. */
function buildEntries(
  completions: SessionCompletion[],
  workouts: Workout[],
): SessionEntry[] {
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const used = new Set<string>();

  const entries: SessionEntry[] = completions.map((completion) => {
    const workout = completion.workoutId
      ? byId.get(completion.workoutId)
      : undefined;
    if (workout) used.add(workout.id);
    return {
      key: `c-${completion.id}`,
      at: new Date(completion.completedAt).getTime(),
      label: formatDayShort(completion.completedAt),
      hour: formatHour(completion.completedAt),
      completion,
      workout,
    };
  });

  // 남은 수업이 없을 때 저장한 기록은 완료 내역 없이 홀로 남는다.
  for (const workout of workouts) {
    if (used.has(workout.id)) continue;
    entries.push({
      key: `w-${workout.id}`,
      at: new Date(`${workout.date}T12:00`).getTime(),
      label: formatDateShort(workout.date),
      workout,
    });
  }

  entries.sort((a, b) => b.at - a.at);

  // 회차는 오래된 것부터 1번이다. 최신순 목록이라 뒤에서부터 매긴다.
  let no = entries.filter((e) => e.completion).length;
  for (const entry of entries) {
    if (!entry.completion) continue;
    entry.no = no;
    no -= 1;
  }

  return entries;
}

export function SessionSection({
  id,
  memberId,
  completions,
  workouts,
  busy,
  onDeleteWorkout,
  onDeleteCompletion,
}: {
  id?: string;
  memberId: string;
  completions: SessionCompletion[];
  workouts: Workout[];
  busy: boolean;
  onDeleteWorkout: (workout: Workout, completionId?: string) => void;
  onDeleteCompletion: (completion: SessionCompletion) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const entries = buildEntries(completions, workouts);
  const rows = expanded ? entries : entries.slice(0, VISIBLE);

  return (
    <Section
      id={id}
      title="수업"
      subtitle={
        entries.length > 0
          ? `총 ${entries.length}회 · 최신순`
          : "세트마다 횟수와 무게를 따로 기록합니다."
      }
      action={
        <SectionAction
          icon="plus"
          label="수업 기록"
          href={`/members/${memberId}/workouts/new`}
        />
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="기록한 수업이 없습니다"
          description="수업 기록을 눌러 오늘 진행한 종목을 남겨보세요."
        />
      ) : (
        <>
          <ul className="flex flex-col">
            {rows.map((entry) => (
              <SessionRow
                key={entry.key}
                entry={entry}
                memberId={memberId}
                busy={busy}
                onDeleteWorkout={onDeleteWorkout}
                onDeleteCompletion={onDeleteCompletion}
              />
            ))}
          </ul>

          {entries.length > VISIBLE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 w-full rounded-lg py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
            >
              {expanded ? "접기" : `더 보기 (${entries.length - VISIBLE}회)`}
            </button>
          )}
        </>
      )}
    </Section>
  );
}

function SessionRow({
  entry,
  memberId,
  busy,
  onDeleteWorkout,
  onDeleteCompletion,
}: {
  entry: SessionEntry;
  memberId: string;
  busy: boolean;
  onDeleteWorkout: (workout: Workout, completionId?: string) => void;
  onDeleteCompletion: (completion: SessionCompletion) => void;
}) {
  const { workout, completion } = entry;

  const actions = (
    <span className="flex shrink-0 gap-1">
      {workout && (
        <IconButton
          icon="pencil"
          label="수업 기록 수정"
          href={`/members/${memberId}/workouts/${workout.id}`}
        />
      )}
      <IconButton
        icon="trash"
        label="수업 기록 삭제"
        danger
        disabled={busy}
        onClick={() =>
          workout
            ? onDeleteWorkout(workout, completion?.id)
            : completion && onDeleteCompletion(completion)
        }
      />
    </span>
  );

  const sets = workout
    ? workout.exercises.reduce((n, e) => n + e.sets.length, 0)
    : 0;

  const meta = [
    entry.hour,
    workout && `종목 ${workout.exercises.length}개`,
    workout && `${sets}세트`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-col gap-2.5 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-extrabold">{entry.label}</span>
            {entry.no !== undefined && (
              <span className="text-xs font-bold tabular-nums text-primary">
                {entry.no}회차
              </span>
            )}
          </span>
          {meta && (
            <span className="text-2xs font-semibold text-subtle">{meta}</span>
          )}
        </p>
        {actions}
      </div>

      {workout && (
        <div className="flex min-w-0 flex-col gap-3">
          {workout.exercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} />
          ))}
          {workout.memo && <Memo text={workout.memo} />}
        </div>
      )}

      {!workout && completion?.reason && (
        <p className="text-sm font-semibold text-muted-foreground">
          {completion.reason}
        </p>
      )}
    </li>
  );
}

function Memo({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap rounded-r-lg border-l-[3px] border-primary bg-primary-light/40 py-1.5 pr-3 pl-3 text-xs leading-relaxed text-ink">
      {text}
    </p>
  );
}

/** 종목 한 줄 — 세트별 수치를 그대로 펼쳐 보여준다. */
function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold">{exercise.name}</p>
      <ul className="flex flex-wrap gap-1.5">
        {exercise.sets.map((set, i) => (
          <li
            key={set.id}
            className="flex items-baseline gap-1.5 rounded-lg bg-surface py-1 pr-2.5 pl-2 text-xs tabular-nums text-muted-foreground"
          >
            <span className="text-2xs font-bold text-subtle">{i + 1}세트</span>
            {set.unit === "bodyweight" ? (
              <span className="font-semibold text-ink">{set.reps}회</span>
            ) : (
              <>
                <span className="font-semibold text-ink">{set.weight}kg</span>
                <span className="text-subtle">×</span>
                {set.reps}회
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
