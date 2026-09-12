"use client";

import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/client";
import type { Exercise, Workout } from "@/lib/types";
import { IconButton, Section } from "./section";

/**
 * 날짜별 운동 기록. 수업을 차감하며 저장한 기록에는 뱃지가 붙는다.
 *
 * 작성·수정은 별도 화면에서 한다. 종목과 세트가 늘어나면 폼이 화면을 통째로
 * 써서, 여기서 펼치면 아래 내용이 한꺼번에 밀려난다.
 */
export function WorkoutSection({
  id,
  memberId,
  workouts,
  linkedWorkoutIds,
  onDelete,
}: {
  id?: string;
  memberId: string;
  workouts: Workout[];
  /** 수업 차감과 연결된 기록 id */
  linkedWorkoutIds: Set<string>;
  onDelete: (workout: Workout) => void;
}) {
  return (
    <Section
      id={id}
      title="운동 기록"
      subtitle={
        workouts.length > 0
          ? `총 ${workouts.length}건 · 최신순`
          : "세트마다 횟수와 무게를 따로 기록합니다."
      }
      action={
        <Button asChild variant="ghost" size="sm">
          <Link href={`/members/${memberId}/workouts/new`}>
            <Icon name="plus" size={16} />
            기록 추가
          </Link>
        </Button>
      }
    >
      {workouts.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="운동 기록이 없습니다"
          description="기록 추가를 눌러 오늘 진행한 종목을 남겨보세요."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {workouts.map((workout) => (
            <li
              key={workout.id}
              className="overflow-hidden rounded-xl border border-line"
            >
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
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
                  <Link
                    href={`/members/${memberId}/workouts/${workout.id}`}
                    title="운동 기록 수정"
                    aria-label="운동 기록 수정"
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-ink"
                  >
                    <Icon name="pencil" size={15} />
                  </Link>
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
            className="flex items-baseline gap-1.5 rounded-lg bg-chip px-2.5 py-1.5"
          >
            <span className="text-2xs font-bold text-subtle">{i + 1}</span>
            <span className="text-xs font-bold tabular-nums">{set.reps}회</span>
            <span className="text-2xs font-semibold tabular-nums text-muted-foreground">
              {set.unit === "bodyweight" ? "맨몸" : `${set.weight}kg`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
