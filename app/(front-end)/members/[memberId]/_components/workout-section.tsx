"use client";

import { EmptyState } from "@/components/custom/empty-state";
import { formatDate } from "@/lib/client";
import type { Exercise, Workout } from "@/lib/types";
import { IconButton, Section, SectionAction } from "./section";
import WorkoutForm, { type WorkoutPayload } from "./workout-form";

/** 날짜별 운동 기록. 수업을 차감하며 저장한 기록에는 뱃지가 붙는다. */
export function WorkoutSection({
  workouts,
  remainingSessions,
  linkedWorkoutIds,
  editing,
  formOpen,
  busy,
  serverError,
  onToggle,
  onEdit,
  onSubmit,
  onCancel,
  onDelete,
  onDeleteAll,
}: {
  workouts: Workout[];
  remainingSessions: number;
  /** 수업 차감과 연결된 기록 id */
  linkedWorkoutIds: Set<string>;
  /** 수정 중인 기록. 새로 추가하는 중이면 null */
  editing: Workout | null;
  formOpen: boolean;
  busy: boolean;
  serverError: string | null;
  onToggle: () => void;
  onEdit: (workout: Workout) => void;
  onSubmit: (payload: WorkoutPayload) => void;
  onCancel: () => void;
  onDelete: (workout: Workout) => void;
  onDeleteAll: () => void;
}) {
  return (
    <Section
      title="운동 기록"
      subtitle={
        workouts.length > 0
          ? `총 ${workouts.length}건 · 최신순`
          : "세트마다 횟수와 무게를 따로 기록합니다."
      }
      action={
        <div className="flex gap-1.5">
          {workouts.length > 0 && (
            <IconButton
              icon="trash"
              label="운동 기록 전체 삭제"
              danger
              onClick={onDeleteAll}
            />
          )}
          <SectionAction
            icon={formOpen ? "close" : "plus"}
            label={formOpen ? "닫기" : "기록 추가"}
            active={formOpen}
            onClick={onToggle}
          />
        </div>
      }
    >
      {formOpen && (
        <div className="mb-4">
          <WorkoutForm
            key={editing?.id ?? "new"}
            workout={editing ?? undefined}
            remainingSessions={remainingSessions}
            busy={busy}
            serverError={serverError}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      )}

      {workouts.length === 0 ? (
        !formOpen && (
          <EmptyState
            icon="dumbbell"
            title="운동 기록이 없습니다"
            description="기록 추가를 눌러 오늘 진행한 종목을 남겨보세요."
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {workouts.map((workout) => (
            <li
              key={workout.id}
              className="overflow-hidden rounded-xl border border-line"
            >
              <div className="flex items-center justify-between gap-3 border-b border-line bg-raised px-4 py-2.5">
                <p className="text-sm font-bold">
                  {formatDate(workout.date)}
                  <span className="ml-2 text-2xs font-semibold text-muted-foreground">
                    종목 {workout.exercises.length}개 ·{" "}
                    {workout.exercises.reduce((n, e) => n + e.sets.length, 0)}세트
                  </span>
                  {linkedWorkoutIds.has(workout.id) && (
                    <span className="ml-2 rounded-full bg-primary-light px-2 py-0.5 text-2xs font-bold text-primary-dark">
                      수업 1회
                    </span>
                  )}
                </p>
                <span className="flex shrink-0 gap-1">
                  <IconButton
                    icon="pencil"
                    label="운동 기록 수정"
                    onClick={() => onEdit(workout)}
                  />
                  <IconButton
                    icon="trash"
                    label="운동 기록 삭제"
                    danger
                    onClick={() => onDelete(workout)}
                  />
                </span>
              </div>

              <div className="flex flex-col divide-y divide-line">
                {workout.exercises.map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} />
                ))}
              </div>

              {workout.memo && (
                <p className="whitespace-pre-wrap border-t border-line px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  {workout.memo}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** 종목 한 줄 — 세트별 수치를 그대로 펼쳐 보여준다. */
function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-bold">{exercise.name}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {exercise.sets.map((set, i) => (
          <li
            key={set.id}
            className="flex items-baseline gap-1 rounded-lg bg-raised px-2.5 py-1.5"
          >
            <span className="text-2xs font-bold text-subtle">{i + 1}</span>
            <span className="text-xs font-semibold">{set.reps}회</span>
            <span className="text-2xs text-muted-foreground">
              {set.unit === "bodyweight" ? "맨몸" : `${set.weight}kg`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
