"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage, formatDate } from "@/lib/client";
import type { Workout } from "@/lib/types";
import { EditorFrame } from "../../_components/editor-frame";
import WorkoutForm, {
  type WorkoutPayload,
} from "../../_components/workout-form";

/**
 * 운동 기록 작성·수정 화면. 데이터는 서버 컴포넌트가 읽어 넘긴다.
 * 종목별 직전 기록(lastSets)도 서버에서 계산해 문구만 받는다.
 */
export function WorkoutEditor({
  member,
  workout: found,
  lastSets: lastSetsRecord,
}: {
  member: { id: string; name: string; remainingSessions: number };
  /** 주면 수정, 없으면 새 기록 */
  workout: Workout | null;
  lastSets: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const memberId = member.id;
  const workout = found ?? undefined;
  const workoutId = workout?.id;
  const back = `/members/${memberId}`;

  const lastSets = useMemo(
    () => new Map(Object.entries(lastSetsRecord)),
    [lastSetsRecord],
  );

  const handleSubmit = useCallback(
    async (payload: WorkoutPayload) => {
      setBusy(true);
      setServerError(null);
      try {
        // 종목이 없으면 남길 운동이 없던 날이다. 수업 완료만 남긴다.
        if (payload.exercises.length === 0) {
          await apiFetch(`/api/members/${memberId}/complete`, {
            method: "POST",
            body: JSON.stringify({
              completedAt: payload.completedAt,
              reason: payload.reason ?? null,
            }),
          });
          toast("수업 1회를 기록했습니다.");
          router.replace(back);
          return;
        }

        await apiFetch(
          workoutId
            ? `/api/members/${memberId}/workouts/${workoutId}`
            : `/api/members/${memberId}/workouts`,
          {
            method: workoutId ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );

        toast(
          workoutId ? "수업 기록을 수정했습니다." : "수업 1회를 기록했습니다.",
        );
        router.replace(back);
      } catch (e) {
        setServerError(errorMessage(e, "수업 기록 저장에 실패했습니다."));
        setBusy(false);
      }
    },
    [back, memberId, router, workoutId],
  );

  return (
    <EditorFrame
      back={back}
      title={workout ? "수업 기록 수정" : "수업 기록"}
      name={member.name}
      subtitle={
        workout
          ? `${formatDate(workout.date)} 기록을 고칩니다.`
          : "종목을 남기면 수업 1회가 함께 기록됩니다. 상담처럼 남길 운동이 없는 날은 종목 없이 저장하세요."
      }
      aside={
        !workout && (
          <p
            className={`flex shrink-0 items-baseline gap-1.5 rounded-xl px-3 py-2 ${
              member.remainingSessions === 0
                ? "bg-danger/10"
                : "bg-primary-light"
            }`}
          >
            <span
              className={`text-xs font-bold ${
                member.remainingSessions === 0
                  ? "text-danger"
                  : "text-primary-dark dark:text-primary-bright"
              }`}
            >
              남은 수업
            </span>
            <span className="text-lg font-extrabold leading-none tracking-[-0.02em]">
              {member.remainingSessions}
            </span>
            <span className="text-xs font-bold text-muted-foreground">회</span>
          </p>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {!workout && member.remainingSessions === 0 && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold leading-relaxed text-danger">
            남은 수업이 없어 기록을 저장할 수 없습니다. 회원 정보에서 수업
            횟수를 먼저 늘려 주세요.
          </p>
        )}

        <WorkoutForm
          workout={workout}
          lastSets={lastSets}
          busy={busy}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => router.push(back)}
        />
      </div>
    </EditorFrame>
  );
}
