/*
  회원 상세·내 기록 화면 — 개인 운동 탭
  회원이 혼자 한 운동. 회원 본인만 쓰고 트레이너는 봄

  @date : 2026-09-19
*/

"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { EmptyState } from "@/components/custom/empty-state";
import { formatDate, formatDateShort } from "@/lib/client";
import { type Workout } from "@/lib/types";
import { SetGrid } from "./pt-tab";
import { IconButton, Memo, Section, SectionAction, useSave } from "./tab-ui";

// ── 개인 운동 ─────────────────────────────

/** 회원이 혼자 한 운동. 회원 본인만 쓰고, 트레이너는 봄 */
export function PersonalWorkoutSection({
  workouts,
  editable = false,
}: {
  workouts: Workout[];
  /** 회원 본인 화면 — 추가·수정·삭제 */
  editable?: boolean;
}) {
  const { run, busy } = useSave();
  const [removing, setRemoving] = useState<Workout | null>(null);

  return (
    <Section
      title="개인 운동"
      subtitle={
        workouts.length > 0
          ? `최근 ${workouts.length}건`
          : editable
            ? "수업 없이 혼자 한 운동을 남겨 보세요."
            : "회원이 혼자 한 운동이 여기에 보입니다."
      }
      action={
        editable ? (
          <SectionAction
            icon="plus"
            label="기록 추가"
            href="/me/workouts/new"
          />
        ) : undefined
      }
    >
      {workouts.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="개인 운동 기록이 없습니다"
          description={
            editable
              ? "혼자 한 운동을 적어 두면 트레이너가 보고 수업에 반영합니다."
              : "회원이 앱에서 개인 운동을 기록하면 여기에 보입니다."
          }
        />
      ) : (
        <ul className="flex flex-col">
          {workouts.map((workout) => {
            const sets = workout.exercises.reduce(
              (n, e) => n + e.sets.length,
              0,
            );
            return (
              <li
                key={workout.id}
                className="flex flex-col gap-2.5 border-b border-line py-5 first:pt-0 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-extrabold">
                      {formatDateShort(workout.date)}
                    </span>
                    <span className="text-2xs font-semibold text-subtle">
                      종목 {workout.exercises.length}개 · {sets}세트
                    </span>
                  </p>
                  {editable && (
                    <span className="flex shrink-0 gap-1">
                      <IconButton
                        icon="pencil"
                        label="개인 운동 수정"
                        href={`/me/workouts/${workout.id}`}
                      />
                      <IconButton
                        icon="trash"
                        label="개인 운동 삭제"
                        danger
                        disabled={busy}
                        onClick={() => setRemoving(workout)}
                      />
                    </span>
                  )}
                </div>
                <SetGrid exercises={workout.exercises} />
                {workout.memo && <Memo text={workout.memo} />}
              </li>
            );
          })}
        </ul>
      )}

      {editable && (
        <ConfirmDialog
          open={removing !== null}
          busy={busy}
          title="개인 운동 삭제"
          message={`${removing ? formatDate(removing.date) : ""} 개인 운동을 삭제하시겠습니까?`}
          hint="삭제된 기록은 복구할 수 없습니다."
          onConfirm={async () => {
            if (!removing) return;
            await run(
              `/api/me/workouts/${removing.id}`,
              { method: "DELETE" },
              "개인 운동을 삭제했습니다.",
              "개인 운동 삭제에 실패했습니다.",
            );
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </Section>
  );
}
