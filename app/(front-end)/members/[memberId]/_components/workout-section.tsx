"use client";

import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon } from "@/components/custom/icons";
import { formatDate } from "@/lib/client";
import type { Exercise, Workout } from "@/lib/types";
import { IconButton, Section, SectionAction } from "./section";

/** 날짜별 운동 기록. 수업을 차감하며 저장한 기록에는 뱃지가 붙는다. */
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
        <SectionAction
          icon="plus"
          label="기록 추가"
          href={`/members/${memberId}/workouts/new`}
        />
      }
    >
      {workouts.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="운동 기록이 없습니다"
          description="기록 추가를 눌러 오늘 진행한 종목을 남겨보세요."
        />
      ) : (
        <ul className="flex flex-col">
          {workouts.map((workout) => (
            <li
              key={workout.id}
              className="flex flex-col gap-2.5 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:gap-5"
            >
              <div className="flex items-start justify-between gap-3 sm:w-[130px] sm:shrink-0 sm:flex-col sm:gap-1">
                <p className="flex flex-col gap-0.5">
                  <span className="text-sm font-extrabold">
                    {formatDate(workout.date)}
                  </span>
                  <span className="text-2xs font-semibold text-subtle">
                    종목 {workout.exercises.length}개 ·{" "}
                    {workout.exercises.reduce((n, e) => n + e.sets.length, 0)}세트
                  </span>
                  {linkedWorkoutIds.has(workout.id) && (
                    <span className="mt-1 w-fit rounded-full bg-primary-light px-2 py-0.5 text-2xs font-bold text-primary-dark dark:text-primary-bright">
                      수업 1회
                    </span>
                  )}
                </p>
                <span className="flex shrink-0 gap-1 sm:hidden">
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

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {workout.exercises.map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} />
                ))}

                {workout.memo && (
                  <p className="whitespace-pre-wrap border-l-2 border-line pl-3 text-xs leading-relaxed text-muted-foreground">
                    {workout.memo}
                  </p>
                )}
              </div>

              <span className="hidden shrink-0 gap-1 sm:flex">
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
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold">{exercise.name}</p>
      <ul className="flex flex-wrap gap-1.5">
        {exercise.sets.map((set, i) => (
          <li
            key={set.id}
            className="flex items-baseline gap-1.5 rounded-lg bg-surface py-1 pl-2 pr-2.5 text-xs tabular-nums text-muted-foreground"
          >
            <span className="text-2xs font-bold text-subtle">{i + 1}세트</span>
            <span className="font-semibold text-ink">
              {set.unit === "bodyweight" ? "무게 없음" : `${set.weight}kg`}
            </span>
            <span className="text-subtle">×</span>
            {set.reps}회
          </li>
        ))}
      </ul>
    </div>
  );
}
