"use client";

// 회원 상세 — 데이터를 읽고, 저장·삭제를 처리하고, 섹션들을 이어 붙인다.
// 화면 모양은 전부 _components 아래 섹션 컴포넌트가 가지고 있다.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { confirmCopy, type PendingAction } from "./_components/confirm-copy";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { MemberSummary } from "./_components/member-summary";
import { NoteSection } from "./_components/note-section";
import NutritionPanel from "./_components/nutrition-panel";
import { SessionHistorySection } from "./_components/session-history-section";
import { WeightSection } from "./_components/weight-section";
import type { WeightPayload } from "./_components/weight-form";
import { WorkoutSection } from "./_components/workout-section";
import type { MemberPayload } from "../_components/member-form";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { apiFetch, completedAtFrom, errorMessage } from "@/lib/client";
import type { MemberDetail } from "@/lib/types";

/** 화면에 펼쳐져 있는 입력 폼. 한 번에 하나만 연다. */
type OpenForm =
  | { kind: "member" }
  | { kind: "weight" }
  | null;

export default function MemberDetailPage() {
  const router = useRouter();
  const { memberId } = useParams<{ memberId: string }>();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [open, setOpen] = useState<OpenForm>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [standaloneOpen, setStandaloneOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiFetch<{ member: MemberDetail }>(
        `/api/members/${memberId}`,
      );
      setMember(data.member);
    } catch (e) {
      const message = errorMessage(e, "회원 정보를 불러오지 못했습니다.");
      if (message.includes("찾을 수 없습니다")) setNotFound(true);
      else setLoadError(message);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const show = (form: OpenForm) => {
    setFormError(null);
    setOpen(form);
  };

  /** 뮤테이션 공통 래퍼 — 끝나면 상세를 다시 읽는다. */
  const run = async (
    action: () => Promise<void>,
    successMessage: string,
    fallback: string,
  ) => {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      await load();
      toast(successMessage);
      return true;
    } catch (e) {
      const message = errorMessage(e, fallback);
      setFormError(message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const path = `/api/members/${memberId}`;

    if (pending.type === "deleteMember") {
      setBusy(true);
      try {
        await apiFetch(path, { method: "DELETE" });
        router.push("/members");
      } catch (e) {
        toast(errorMessage(e, "회원 삭제에 실패했습니다."));
        setPending(null);
      } finally {
        setBusy(false);
      }
      return;
    }

    const jobs: Record<string, [string, RequestInit, string, string]> = {
      completeSession: [
        `${path}/complete`,
        {
          method: "POST",
          body: JSON.stringify(
            pending.type === "completeSession"
              ? {
                  completedAt: completedAtFrom(pending.date, pending.time),
                  reason: pending.reason,
                }
              : {},
          ),
        },
        "수업 1회를 차감했습니다.",
        "수업 차감에 실패했습니다.",
      ],
      deleteWorkout: [
        `${path}/workouts/${pending.type === "deleteWorkout" ? pending.workout.id : ""}`,
        { method: "DELETE" },
        "운동 기록을 삭제했습니다.",
        "운동 기록 삭제에 실패했습니다.",
      ],
      deleteWeight: [
        `${path}/weights/${pending.type === "deleteWeight" ? pending.id : ""}`,
        { method: "DELETE" },
        "체중 기록을 삭제했습니다.",
        "체중 기록 삭제에 실패했습니다.",
      ],
      deleteNote: [
        `${path}/notes/${pending.type === "deleteNote" ? pending.note.id : ""}`,
        { method: "DELETE" },
        "코칭 메모를 삭제했습니다.",
        "코칭 메모 삭제에 실패했습니다.",
      ],
      cancelCompletion: [
        `${path}/complete/${pending.type === "cancelCompletion" ? pending.completion.id : ""}`,
        { method: "DELETE" },
        "차감을 되돌렸습니다. 남은 수업이 1회 늘었습니다.",
        "차감 되돌리기에 실패했습니다.",
      ],
    };

    const [url, init, ok, fail] = jobs[pending.type];
    const done = await run(
      async () => {
        await apiFetch(url, init);
      },
      ok,
      fail,
    );
    if (!done) toast(formError ?? fail);
    if (done && pending.type === "completeSession") setStandaloneOpen(false);
    setPending(null);
  };

  const save = async (
    url: string,
    init: RequestInit,
    ok: string,
    fail: string,
  ) => {
    const done = await run(
      async () => {
        await apiFetch(url, init);
      },
      ok,
      fail,
    );
    if (done) setOpen(null);
  };

  const handleEditMember = (values: MemberPayload) =>
    save(
      `/api/members/${memberId}`,
      { method: "PATCH", body: JSON.stringify(values) },
      "회원 정보를 수정했습니다.",
      "회원 정보 수정에 실패했습니다.",
    );

  const handleAddWeight = (payload: WeightPayload) =>
    save(
      `/api/members/${memberId}/weights`,
      { method: "POST", body: JSON.stringify(payload) },
      "체중을 기록했습니다.",
      "체중 기록 저장에 실패했습니다.",
    );

  // ── 로딩 / 오류 ─────────────────────────────

  if (notFound) {
    return (
      <EmptyState
        icon="users"
        title="회원을 찾을 수 없습니다"
        description="삭제되었거나 잘못된 경로입니다."
        action={
          <Link href="/members">
            <Button variant="outline">회원 목록으로</Button>
          </Link>
        }
      />
    );
  }

  if (loadError) {
    return (
      <EmptyState
        icon="close"
        title="회원 정보를 불러오지 못했습니다"
        description={loadError}
        action={
          <Button variant="outline" onClick={() => void load()}>
            다시 시도
          </Button>
        }
      />
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-[150px] animate-pulse rounded-2xl border border-line bg-surface" />
        <div className="h-[200px] animate-pulse rounded-2xl border border-line bg-surface" />
      </div>
    );
  }

  // 등록한 전체 횟수는 남은 것과 쓴 것을 더한 값이다.
  const totalSessions = member.remainingSessions + member.completions.length;
  const lastCompletedAt = member.completions[0]?.completedAt ?? null;

  // 수업을 차감하며 저장한 운동 기록 — 카드에 뱃지로 표시한다.
  const linkedWorkoutIds = new Set(
    member.completions.flatMap((c) => (c.workoutId ? [c.workoutId] : [])),
  );

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      <Link
        href="/members"
        className="hidden w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink lg:flex"
      >
        <Icon name="arrowLeft" size={15} />
        회원 목록
      </Link>

      <MemberSummary
        member={member}
        totalSessions={totalSessions}
        lastCompletedAt={lastCompletedAt}
        editing={open?.kind === "member"}
        busy={busy}
        serverError={formError}
        onToggleEdit={() =>
          show(open?.kind === "member" ? null : { kind: "member" })
        }
        onSubmit={handleEditMember}
        onCancel={() => setOpen(null)}
        onDelete={() => setPending({ type: "deleteMember" })}
      />

      <WorkoutSection
        id="workouts"
        memberId={member.id}
        workouts={member.workouts}
        linkedWorkoutIds={linkedWorkoutIds}
        onDelete={(workout) => setPending({ type: "deleteWorkout", workout })}
      />

      <SessionHistorySection
        id="session-history"
        remainingSessions={member.remainingSessions}
        completions={member.completions}
        standaloneOpen={standaloneOpen}
        busy={busy}
        serverError={formError}
        onToggleStandalone={() => {
          setFormError(null);
          setStandaloneOpen((v) => !v);
        }}
        onComplete={({ date, time, reason }) =>
          setPending({ type: "completeSession", date, time, reason })
        }
        onCancelCompletion={(completion) =>
          setPending({ type: "cancelCompletion", completion })
        }
      />

      <NoteSection
        memberId={member.id}
        notes={member.notes}
        onDelete={(note) => setPending({ type: "deleteNote", note })}
      />

      <WeightSection
        weights={member.weights}
        formOpen={open?.kind === "weight"}
        busy={busy}
        serverError={formError}
        onToggle={() => show(open?.kind === "weight" ? null : { kind: "weight" })}
        onSubmit={handleAddWeight}
        onCancel={() => setOpen(null)}
        onDelete={(record) =>
          setPending({ type: "deleteWeight", id: record.id, date: record.date })
        }
      />

      <NutritionPanel memberId={member.id} nutrition={member.nutrition} />

      <ConfirmDialog
        open={pending !== null}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        {...confirmCopy(pending, member.name)}
      />
    </div>
  );
}
