"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage, formatDate } from "@/lib/client";
import type { MemberDetail } from "@/lib/types";
import WorkoutForm, {
  type WorkoutPayload,
} from "../../_components/workout-form";

/**
 * 운동 기록 작성·수정 화면.
 *
 * 종목과 세트가 늘어나면 폼이 화면 하나를 통째로 쓴다. 회원 상세 안에서
 * 펼치면 아래 내용이 한꺼번에 밀려나 어디를 보고 있었는지 놓치게 된다.
 * 체중·코칭 메모처럼 몇 줄짜리 입력은 지금처럼 그 자리에서 연다.
 */
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
              ? "운동 기록을 저장하고 수업 1회를 차감했습니다."
              : "운동 기록은 저장했지만 남은 수업이 없어 차감하지 못했습니다.",
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
      <Shell back={back} title="운동 기록">
        <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
          <p className="text-base font-bold">{loadError}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={back}>회원으로 돌아가기</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (!member) {
    return (
      <Shell back={back} title="운동 기록">
        <div className="h-[420px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface" />
      </Shell>
    );
  }

  // 주소를 직접 쳐서 없는 기록으로 들어온 경우
  if (workoutId && !workout) {
    return (
      <Shell back={back} title="운동 기록" name={member.name}>
        <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
          <p className="text-base font-bold">기록을 찾을 수 없습니다.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={back}>회원으로 돌아가기</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      back={back}
      title={workout ? "운동 기록 수정" : "운동 기록"}
      name={member.name}
      subtitle={
        workout
          ? `${formatDate(workout.date)} 기록을 고칩니다.`
          : "종목과 세트를 남기면 수업이 함께 차감됩니다."
      }
    >
      <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-4 sm:p-5">
        <WorkoutForm
          workout={workout}
          remainingSessions={member.remainingSessions}
          busy={busy}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => router.push(back)}
        />
      </div>
    </Shell>
  );
}

function Shell({
  back,
  title,
  name,
  subtitle,
  children,
}: {
  back: string;
  title: string;
  name?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <Link
        href={back}
        className="hidden w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink lg:flex"
      >
        <Icon name="arrowLeft" size={15} />
        {name ?? "회원"}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-extrabold tracking-[-0.03em]">
          {title}
          {name && (
            <span className="rounded-full bg-raised px-2.5 py-1 text-2xs font-bold text-muted-foreground">
              {name}
            </span>
          )}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}
