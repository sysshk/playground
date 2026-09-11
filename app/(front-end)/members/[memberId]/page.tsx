"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CoachingNoteForm, {
  type CoachingNotePayload,
} from "./_components/coaching-note-form";
import MemberForm, { type MemberPayload } from "../_components/member-form";
import NutritionPanel from "./_components/nutrition-panel";
import WeightForm, { type WeightPayload } from "./_components/weight-form";
import WorkoutForm, { type WorkoutPayload } from "./_components/workout-form";
import { DateTimePicker } from "@/components/custom/date-picker";
import { Icon, type IconName } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./_components/confirm-dialog";
import { EmptyState } from "@/components/custom/empty-state";
import { Section } from "./_components/section";
import { apiFetch, errorMessage, formatDate, formatDateTime } from "@/lib/client";
import type { CoachingNote, Exercise, MemberDetail, Workout } from "@/lib/types";

import { toast } from "sonner";
/** 삭제처럼 되돌릴 수 없는 동작만 확인 창을 띄운다. 입력은 전부 화면 안에서 한다. */
type PendingAction =
  | { type: "completeSession" }
  | { type: "deleteMember" }
  | { type: "deleteWorkout"; workout: Workout }
  | { type: "deleteAllWorkouts" }
  | { type: "deleteWeight"; id: string; date: string }
  | { type: "deleteNote"; note: CoachingNote }
  | { type: "cancelCompletion"; id: string; completedAt: string };

/** datetime-local 입력이 쓰는 "YYYY-MM-DDTHH:mm" (로컬 시각) */
function nowLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/** 화면에 펼쳐져 있는 입력 폼. 한 번에 하나만 연다. */
type OpenForm =
  | { kind: "member" }
  | { kind: "workout"; workout: Workout | null }
  | { kind: "weight" }
  | { kind: "note"; note: CoachingNote | null }
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
  const [completedAt, setCompletedAt] = useState(nowLocal);
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
          body: JSON.stringify({
            completedAt: new Date(completedAt).toISOString(),
          }),
        },
        "수업을 완료 처리했습니다.",
        "수업 완료 처리에 실패했습니다.",
      ],
      deleteWorkout: [
        `${path}/workouts/${pending.type === "deleteWorkout" ? pending.workout.id : ""}`,
        { method: "DELETE" },
        "운동 기록을 삭제했습니다.",
        "운동 기록 삭제에 실패했습니다.",
      ],
      deleteAllWorkouts: [
        `${path}/workouts`,
        { method: "DELETE" },
        "운동 기록을 모두 삭제했습니다.",
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
        `${path}/complete/${pending.type === "cancelCompletion" ? pending.id : ""}`,
        { method: "DELETE" },
        "수업 완료를 취소했습니다. 남은 수업이 1회 늘었습니다.",
        "수업 완료 취소에 실패했습니다.",
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

  const handleSaveWorkout = async (payload: WorkoutPayload) => {
    const editing = open?.kind === "workout" ? open.workout : null;
    let completed = false;

    const done = await run(
      async () => {
        const res = await apiFetch<{ completed?: boolean }>(
          editing
            ? `/api/members/${memberId}/workouts/${editing.id}`
            : `/api/members/${memberId}/workouts`,
          { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
        );
        completed = res.completed === true;
      },
      editing ? "운동 기록을 수정했습니다." : "운동 기록을 저장했습니다.",
      "운동 기록 저장에 실패했습니다.",
    );
    if (!done) return;

    setOpen(null);
    // 차감을 요청했는데 남은 수업이 없었으면 기록만 저장됐다는 걸 알린다.
    if (!editing && payload.completeSession) {
      toast(
        completed
          ? "운동 기록을 저장하고 수업 1회를 차감했습니다."
          : "운동 기록은 저장했지만 남은 수업이 없어 차감하지 못했습니다.",
      );
    }
  };

  const handleAddWeight = (payload: WeightPayload) =>
    save(
      `/api/members/${memberId}/weights`,
      { method: "POST", body: JSON.stringify(payload) },
      "체중을 기록했습니다.",
      "체중 기록 저장에 실패했습니다.",
    );

  const handleSaveNote = (payload: CoachingNotePayload) => {
    const editing = open?.kind === "note" ? open.note : null;
    return save(
      editing
        ? `/api/members/${memberId}/notes/${editing.id}`
        : `/api/members/${memberId}/notes`,
      { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      editing ? "코칭 메모를 수정했습니다." : "코칭 메모를 저장했습니다.",
      "코칭 메모 저장에 실패했습니다.",
    );
  };

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

  const latestWeight = member.weights[0]?.weight ?? null;

  // 수업을 차감하며 저장한 운동 기록 — 카드에 뱃지로 표시한다.
  const linkedWorkoutIds = new Set(
    member.completions.flatMap((c) => (c.workoutId ? [c.workoutId] : [])),
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/members"
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink"
      >
        <Icon name="arrowLeft" size={15} />
        회원 목록
      </Link>

      {/* ── 회원 요약 ──────────────────────── */}
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-[-0.02em]">
              {member.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {member.phone}
              {member.goal && <> · {member.goal}</>}
            </p>
          </div>
          <div className="flex gap-1.5">
            <IconButton
              icon="pencil"
              label="회원 정보 수정"
              onClick={() =>
                show(open?.kind === "member" ? null : { kind: "member" })
              }
              active={open?.kind === "member"}
            />
            <IconButton
              icon="trash"
              label="회원 삭제"
              danger
              onClick={() => setPending({ type: "deleteMember" })}
            />
          </div>
        </div>

        {open?.kind === "member" ? (
          <div className="mt-4 rounded-xl border border-line bg-raised p-4">
            <MemberForm
              member={member}
              submitLabel="수정하기"
              busy={busy}
              serverError={formError}
              onSubmit={handleEditMember}
              onCancel={() => setOpen(null)}
            />
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              <Stat
                label="남은 수업"
                value={`${member.remainingSessions}`}
                unit="회"
                highlight={member.remainingSessions > 0}
              />
              <Stat
                label="최신 체중"
                value={latestWeight !== null ? `${latestWeight}` : "—"}
                unit={latestWeight !== null ? "kg" : ""}
              />
              <Stat
                label="운동 기록"
                value={`${member.workouts.length}`}
                unit="건"
              />
            </div>

            {member.memo && (
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-raised px-4 py-3 text-sm leading-relaxed">
                {member.memo}
              </p>
            )}

          </>
        )}
      </section>

      {/* ── 운동 기록 ──────────────────────── */}
      <Section
        title="운동 기록"
        subtitle={
          member.workouts.length > 0
            ? `총 ${member.workouts.length}건 · 최신순`
            : "세트마다 횟수와 무게를 따로 기록합니다."
        }
        action={
          <div className="flex gap-1.5">
            {member.workouts.length > 0 && (
              <IconButton
                icon="trash"
                label="운동 기록 전체 삭제"
                danger
                onClick={() => setPending({ type: "deleteAllWorkouts" })}
              />
            )}
            <SectionAction
              icon={open?.kind === "workout" ? "close" : "plus"}
              label={open?.kind === "workout" ? "닫기" : "기록 추가"}
              active={open?.kind === "workout"}
              onClick={() =>
                show(open?.kind === "workout" ? null : { kind: "workout", workout: null })}
            />
          </div>
        }
      >
        {open?.kind === "workout" && (
          <div className="mb-4">
            <WorkoutForm
              key={open.workout?.id ?? "new"}
              workout={open.workout ?? undefined}
              remainingSessions={member.remainingSessions}
              busy={busy}
              serverError={formError}
              onSubmit={handleSaveWorkout}
              onCancel={() => setOpen(null)}
            />
          </div>
        )}

        {member.workouts.length === 0 ? (
          open?.kind !== "workout" && (
            <EmptyState
              icon="dumbbell"
              title="운동 기록이 없습니다"
              description="기록 추가를 눌러 오늘 진행한 종목을 남겨보세요."
            />
          )
        ) : (
          <ul className="flex flex-col gap-3">
            {member.workouts.map((workout) => (
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
                      onClick={() => show({ kind: "workout", workout })}
                    />
                    <IconButton
                      icon="trash"
                      label="운동 기록 삭제"
                      danger
                      onClick={() => setPending({ type: "deleteWorkout", workout })}
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

      {/* ── 체중 ───────────────────────────── */}
      <Section
        title="체중 기록"
        subtitle={
          member.weights.length > 0
            ? `총 ${member.weights.length}건 · 최신순`
            : "체중 변화를 기록해 보세요."
        }
        action={
          <SectionAction
              icon={open?.kind === "weight" ? "close" : "plus"}
              label={open?.kind === "weight" ? "닫기" : "체중 기록"}
              active={open?.kind === "weight"}
              onClick={() =>
              show(open?.kind === "weight" ? null : { kind: "weight" })}
            />
        }
      >
        {open?.kind === "weight" && (
          <div className="mb-4">
            <WeightForm
              busy={busy}
              serverError={formError}
              onSubmit={handleAddWeight}
              onCancel={() => setOpen(null)}
            />
          </div>
        )}

        {member.weights.length === 0 ? (
          open?.kind !== "weight" && (
            <EmptyState
              icon="trend"
              title="체중 기록이 없습니다"
              description="첫 체중을 기록하고 변화를 확인해 보세요."
            />
          )
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {member.weights.map((record) => (
              <li
                key={record.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-base font-bold">
                    {record.weight}
                    <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
                      kg
                    </span>
                    <span className="ml-2.5 text-xs font-medium text-muted-foreground">
                      {formatDate(record.date)}
                    </span>
                  </p>
                  {record.memo && (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {record.memo}
                    </p>
                  )}
                </div>
                <IconButton
                  icon="trash"
                  label={`${record.date} 체중 기록 삭제`}
                  danger
                  onClick={() =>
                    setPending({
                      type: "deleteWeight",
                      id: record.id,
                      date: record.date,
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── 코칭 메모 ──────────────────────── */}
      <Section
        title="코칭 메모"
        subtitle={
          member.notes.length > 0
            ? `총 ${member.notes.length}건 · 최신순`
            : "통증, 자세와 움직임 평가를 다음 수업에 활용하세요."
        }
        action={
          <SectionAction
              icon={open?.kind === "note" ? "close" : "plus"}
              label={open?.kind === "note" ? "닫기" : "메모 작성"}
              active={open?.kind === "note"}
              onClick={() =>
              show(open?.kind === "note" ? null : { kind: "note", note: null })}
            />
        }
      >
        {open?.kind === "note" && (
          <div className="mb-4 rounded-xl border border-line bg-raised p-4">
            <CoachingNoteForm
              key={open.note?.id ?? "new"}
              note={open.note ?? undefined}
              busy={busy}
              serverError={formError}
              onSubmit={handleSaveNote}
              onCancel={() => setOpen(null)}
            />
          </div>
        )}

        {member.notes.length === 0 ? (
          open?.kind !== "note" && (
            <EmptyState
              icon="clipboard"
              title="코칭 메모가 없습니다"
              description="통증·자세·움직임·숙제를 남겨 다음 수업에 이어가세요."
            />
          )
        ) : (
          <ul className="flex flex-col gap-3">
            {member.notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold">{formatDate(note.date)}</p>
                  <div className="flex gap-1">
                    <IconButton
                      icon="pencil"
                      label="코칭 메모 수정"
                      onClick={() => show({ kind: "note", note })}
                    />
                    <IconButton
                      icon="trash"
                      label="코칭 메모 삭제"
                      danger
                      onClick={() => setPending({ type: "deleteNote", note })}
                    />
                  </div>
                </div>

                <dl className="mt-3 flex flex-col gap-2.5">
                  {(
                    [
                      ["통증", note.pain],
                      ["자세 문제", note.posture],
                      ["움직임 평가", note.movement],
                      ["숙제", note.homework],
                    ] as const
                  )
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-2xs font-bold uppercase tracking-wide text-subtle">
                          {label}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                          {value}
                        </dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── 수업 이력 ─────────────────────────
          수업 차감은 운동 기록을 저장할 때 같이 한다. 여기서는 이력을 보고
          잘못 차감한 걸 취소한다. 상담·체형 평가처럼 운동 기록이 없는 날만
          "기록 없이 완료"로 따로 처리한다. */}
      <Section
        title="수업 이력"
        subtitle={`남은 ${member.remainingSessions}회 · 지금까지 ${member.completions.length}회 완료`}
        action={
          <SectionAction
            icon={standaloneOpen ? "close" : "check"}
            label={standaloneOpen ? "닫기" : "기록 없이 완료"}
            active={standaloneOpen}
            onClick={() => {
              setCompletedAt(nowLocal());
              setStandaloneOpen((v) => !v);
            }}
          />
        }
      >
        {standaloneOpen && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-raised p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold">
                완료 시각
              </span>
              <DateTimePicker
                value={completedAt}
                onChange={setCompletedAt}
                max={nowLocal().slice(0, 10)}
              />
            </div>
            <Button
              onClick={() => setPending({ type: "completeSession" })}
              disabled={member.remainingSessions === 0}
              className="w-full sm:w-auto sm:px-6"
            >
              <Icon name="check" size={17} />
              {member.remainingSessions === 0 ? "남은 수업이 없습니다" : "수업 1회 완료"}
            </Button>
          </div>
        )}

        {member.completions.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            아직 완료한 수업이 없습니다. 운동 기록을 저장할 때 차감하면 여기에 남습니다.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {member.completions.slice(0, 12).map((completion, i) => (
              <li
                key={completion.id}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-primary-dark">
                    {member.completions.length - i}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {formatDateTime(completion.completedAt)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {completion.workoutId ? "운동 기록과 함께 차감" : "기록 없이 완료"}
                    </span>
                  </span>
                </span>
                <IconButton
                  icon="trash"
                  label="수업 완료 취소"
                  danger
                  onClick={() =>
                    setPending({
                      type: "cancelCompletion",
                      id: completion.id,
                      completedAt: completion.completedAt,
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <NutritionPanel
        memberId={member.id}
        nutrition={member.nutrition}
        suggestedWeight={latestWeight}
        onSaved={(nutrition) =>
          setMember((prev) => (prev ? { ...prev, nutrition } : prev))
        }
      />

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

/** 섹션 머리의 보조 동작. 옆의 아이콘 버튼과 같은 높이·무게로 맞춘다. */
function SectionAction({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
        active ? "bg-raised text-ink" : "text-muted-foreground hover:bg-raised hover:text-ink"
      }`}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  danger = false,
  active = false,
}: {
  icon: "pencil" | "trash" | "close";
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
        active
          ? "bg-primary-light text-primary-dark"
          : danger
            ? "text-subtle hover:bg-danger/8 hover:text-danger"
            : "text-subtle hover:bg-raised hover:text-ink"
      }`}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        highlight ? "border-primary bg-primary-light" : "border-line bg-raised"
      }`}
    >
      <p
        className={`text-2xs font-semibold ${
          highlight ? "text-primary-dark" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold leading-none tracking-[-0.02em]">
        {value}
        {unit && (
          <span className="ml-1 text-2xs font-bold text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  );
}

/** 확인 다이얼로그 문구 */
function confirmCopy(pending: PendingAction | null, memberName: string) {
  switch (pending?.type) {
    case "completeSession":
      return {
        title: "수업 완료 확인",
        message: `${memberName} 회원의 수업 1회를 운동 기록 없이 완료 처리할까요?`,
        hint: "남은 수업이 1회 차감되고 이력에 남습니다. 운동을 했다면 기록을 저장할 때 차감하세요.",
        confirmLabel: "완료 처리",
        tone: "primary" as const,
      };
    case "deleteMember":
      return {
        title: "회원 삭제",
        message: `${memberName} 회원을 삭제하시겠습니까?`,
        hint: "운동 기록과 코칭 메모까지 함께 지워지며 복구할 수 없습니다.",
      };
    case "deleteWorkout":
      return {
        title: "운동 기록 삭제",
        message: `${formatDate(pending.workout.date)} 운동 기록을 삭제하시겠습니까?`,
        hint: "삭제된 기록은 복구할 수 없습니다.",
      };
    case "deleteAllWorkouts":
      return {
        title: "운동 기록 전체 삭제",
        message: `${memberName}의 운동 기록 전체를 삭제하시겠습니까?`,
        hint: "삭제된 기록은 복구할 수 없습니다.",
      };
    case "deleteWeight":
      return {
        title: "체중 기록 삭제",
        message: `${formatDate(pending.date)} 체중 기록을 삭제하시겠습니까?`,
        hint: "삭제된 기록은 복구할 수 없습니다.",
      };
    case "deleteNote":
      return {
        title: "코칭 메모 삭제",
        message: `${formatDate(pending.note.date)} 코칭 메모를 삭제하시겠습니까?`,
        hint: "삭제된 메모는 복구할 수 없습니다.",
      };
    case "cancelCompletion":
      return {
        title: "수업 완료 취소",
        message: `${formatDateTime(pending.completedAt)} 수업 완료를 취소할까요?`,
        hint: "남은 수업이 1회 다시 늘어납니다. 연결된 운동 기록은 그대로 남습니다.",
        confirmLabel: "완료 취소",
      };
    default:
      return { title: "", message: "" };
  }
}
