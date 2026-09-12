"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage, formatDate } from "@/lib/client";
import type { MemberDetail } from "@/lib/types";
import { EditorFrame } from "../../_components/editor-frame";
import WorkoutForm, {
  type WorkoutPayload,
} from "../../_components/workout-form";

/** 운동 기록 작성·수정 화면. */
export function WorkoutEditor({
  memberId,
  workoutId,
}: {
  memberId: string;
  /** 주면 수정, 없으면 새 기록 */
  workoutId?: string;
}) {
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const back = `/members/${memberId}`;

  useEffect(() => {
    let alive = true;
    apiFetch<{ member: MemberDetail }>(`/api/members/${memberId}`).then(
      (data) => {
        if (alive) setMember(data.member);
      },
      (e) => {
        if (alive) setLoadError(errorMessage(e, "회원을 불러오지 못했습니다."));
      },
    );
    return () => {
      alive = false;
    };
  }, [memberId]);

  const workout = workoutId
    ? member?.workouts.find((w) => w.id === workoutId)
    : undefined;

  /**
   * 종목별 직전 기록. 무게를 정할 때 지난번 수치를 보러 나갔다 오지 않게
   * 종목 이름 옆에 띄운다. workouts는 최신순이라 처음 만난 것이 가장 최근이다.
   */
  const lastSets = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of member?.workouts ?? []) {
      if (w.id === workoutId) continue;
      for (const e of w.exercises) {
        if (map.has(e.name)) continue;
        const top = e.sets.reduce(
          (best, s) => ((s.weight ?? 0) > (best.weight ?? 0) ? s : best),
          e.sets[0],
        );
        if (!top) continue;
        map.set(
          e.name,
          top.unit === "bodyweight"
            ? `${top.reps}회`
            : `${top.weight}kg × ${top.reps}회`,
        );
      }
    }
    return map;
  }, [member, workoutId]);

  const handleSubmit = useCallback(
    async (payload: WorkoutPayload) => {
      setBusy(true);
      setServerError(null);
      try {
        const res = await apiFetch<{ completed?: boolean }>(
          workoutId
            ? `/api/members/${memberId}/workouts/${workoutId}`
            : `/api/members/${memberId}/workouts`,
          {
            method: workoutId ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );

        if (workoutId) {
          toast("운동 기록을 수정했습니다.");
        } else if (payload.completeSession) {
          // 차감을 요청했는데 남은 수업이 없었으면 기록만 저장됐다는 걸 알린다.
          toast(
            res.completed === true
              ? "운동 기록을 저장하고 수업 1회를 완료했습니다."
              : "운동 기록은 저장했지만 남은 수업이 없어 수업은 완료하지 못했습니다.",
          );
        } else {
          toast("운동 기록을 저장했습니다.");
        }

        router.replace(back);
      } catch (e) {
        setServerError(errorMessage(e, "운동 기록 저장에 실패했습니다."));
        setBusy(false);
      }
    },
    [back, memberId, router, workoutId],
  );

  if (loadError) {
    return (
      <EditorFrame back={back} title="운동 기록">
        <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
          <p className="text-base font-bold">{loadError}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={back}>회원으로 돌아가기</Link>
          </Button>
        </div>
      </EditorFrame>
    );
  }

  if (!member) {
    return (
      <EditorFrame back={back} title="운동 기록">
        <div className="h-[420px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface" />
      </EditorFrame>
    );
  }

  // 주소를 직접 쳐서 없는 기록으로 들어온 경우
  if (workoutId && !workout) {
    return (
      <EditorFrame back={back} title="운동 기록" name={member.name}>
        <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
          <p className="text-base font-bold">기록을 찾을 수 없습니다.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={back}>회원으로 돌아가기</Link>
          </Button>
        </div>
      </EditorFrame>
    );
  }

  return (
    <EditorFrame
      back={back}
      title={workout ? "운동 기록 수정" : "운동 기록"}
      name={member.name}
      subtitle={
        workout
          ? `${formatDate(workout.date)} 기록을 고칩니다.`
          : "종목과 세트를 남기면 수업도 함께 완료됩니다."
      }
      aside={
        !workout && (
          <p className="flex shrink-0 items-baseline gap-1.5 rounded-xl bg-primary-light px-3 py-2">
            <span className="text-xs font-bold text-primary-dark dark:text-primary-bright">
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
      <div>
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
