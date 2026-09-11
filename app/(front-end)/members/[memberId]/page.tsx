"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CoachingNoteForm, {
  type CoachingNotePayload,
} from "@/components/pt/coaching-note-form";
import MemberForm, { type MemberPayload } from "@/components/pt/member-form";
import NutritionPanel from "@/components/pt/nutrition-panel";
import WorkoutForm, { type WorkoutPayload } from "@/components/pt/workout-form";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Section,
  Toast,
  inputClass,
} from "@/components/pt/ui";
import {
  apiFetch,
  errorMessage,
  formatDate,
  formatDateTime,
  today,
} from "@/lib/client";
import type { CoachingNote, MemberDetail, Workout } from "@/lib/types";

/** 확인 다이얼로그로 처리하는 작업들 */
type PendingAction =
  | { type: "completeSession" }
  | { type: "deleteMember" }
  | { type: "deleteWorkout"; workout: Workout }
  | { type: "deleteAllWorkouts" }
  | { type: "deleteWeight"; id: string; date: string }
  | { type: "deleteNote"; note: CoachingNote };

export default function MemberDetailPage() {
  const router = useRouter();
  const { memberId } = useParams<{ memberId: string }>();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<CoachingNote | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

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
      setToast(successMessage);
      return true;
    } catch (e) {
      const message = errorMessage(e, fallback);
      setFormError(message);
      setToast(message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!pending || !member) return;

    const done = await (async () => {
      switch (pending.type) {
        case "completeSession":
          return run(
            async () => {
              await apiFetch(`/api/members/${memberId}/complete`, {
                method: "POST",
              });
            },
            "수업을 완료 처리했습니다.",
            "수업 완료 처리에 실패했습니다.",
          );

        case "deleteMember":
          setBusy(true);
          try {
            await apiFetch(`/api/members/${memberId}`, { method: "DELETE" });
            router.push("/members");
            return true;
          } catch (e) {
            setToast(errorMessage(e, "회원 삭제에 실패했습니다."));
            return false;
          } finally {
            setBusy(false);
          }

        case "deleteWorkout":
          return run(
            async () => {
              await apiFetch(
                `/api/members/${memberId}/workouts/${pending.workout.id}`,
                { method: "DELETE" },
              );
            },
            "운동 기록을 삭제했습니다.",
            "운동 기록 삭제에 실패했습니다.",
          );

        case "deleteAllWorkouts":
          return run(
            async () => {
              await apiFetch(`/api/members/${memberId}/workouts`, {
                method: "DELETE",
              });
            },
            "운동 기록을 모두 삭제했습니다.",
            "운동 기록 삭제에 실패했습니다.",
          );

        case "deleteWeight":
          return run(
            async () => {
              await apiFetch(
                `/api/members/${memberId}/weights/${pending.id}`,
                { method: "DELETE" },
              );
            },
            "체중 기록을 삭제했습니다.",
            "체중 기록 삭제에 실패했습니다.",
          );

        case "deleteNote":
          return run(
            async () => {
              await apiFetch(
                `/api/members/${memberId}/notes/${pending.note.id}`,
                { method: "DELETE" },
              );
            },
            "코칭 메모를 삭제했습니다.",
            "코칭 메모 삭제에 실패했습니다.",
          );
      }
    })();

    if (done && pending.type !== "deleteMember") setPending(null);
    else if (done) setPending(null);
    else setPending(null);
  };

  const handleEdit = async (values: MemberPayload) => {
    const ok = await run(
      async () => {
        await apiFetch(`/api/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      },
      "회원 정보를 수정했습니다.",
      "회원 정보 수정에 실패했습니다.",
    );
    if (ok) setEditOpen(false);
  };

  const handleAddWorkout = async (payload: WorkoutPayload) => {
    const ok = await run(
      async () => {
        await apiFetch(`/api/members/${memberId}/workouts`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      },
      "운동 기록을 추가했습니다.",
      "운동 기록 추가에 실패했습니다.",
    );
    if (ok) setWorkoutOpen(false);
  };

  const handleSaveNote = async (payload: CoachingNotePayload) => {
    const editing = noteTarget !== "new" && noteTarget !== null;
    const ok = await run(
      async () => {
        await apiFetch(
          editing
            ? `/api/members/${memberId}/notes/${noteTarget.id}`
            : `/api/members/${memberId}/notes`,
          {
            method: editing ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );
      },
      editing ? "코칭 메모를 수정했습니다." : "코칭 메모를 저장했습니다.",
      "코칭 메모 저장에 실패했습니다.",
    );
    if (ok) setNoteTarget(null);
  };

  // ── 로딩 / 오류 ─────────────────────────────

  if (notFound) {
    return (
      <EmptyState
        icon="🙈"
        title="회원을 찾을 수 없습니다"
        description="삭제되었거나 잘못된 경로입니다."
        action={
          <Link href="/members">
            <Button variant="ghost">회원 목록으로</Button>
          </Link>
        }
      />
    );
  }

  if (loadError) {
    return (
      <EmptyState
        icon="⚠️"
        title="회원 정보를 불러오지 못했습니다"
        description={loadError}
        action={
          <Button variant="ghost" onClick={() => void load()}>
            다시 시도
          </Button>
        }
      />
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-[148px] animate-pulse rounded-2xl border border-line bg-white" />
        <div className="h-[180px] animate-pulse rounded-2xl border border-line bg-white" />
      </div>
    );
  }

  const latestWeight = member.weights[0]?.weight ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/members"
        className="w-fit text-[13px] font-semibold text-muted transition-colors hover:text-primary-dark"
      >
        ← 회원 목록
      </Link>

      {/* 회원 요약 */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              {member.name}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              {member.phone}
              {member.goal && (
                <>
                  <span aria-hidden="true"> · </span>
                  {member.goal}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(true)}>
              수정
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPending({ type: "deleteMember" })}
              className="text-danger"
            >
              삭제
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <Stat
            label="남은 세션"
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
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-canvas px-4 py-3 text-[13px] leading-relaxed text-ink">
            {member.memo}
          </p>
        )}

        <Button
          onClick={() => setPending({ type: "completeSession" })}
          disabled={member.remainingSessions === 0}
          className="mt-4 w-full"
        >
          수업 완료
        </Button>
        {member.remainingSessions === 0 && (
          <p className="mt-2 text-center text-[12px] text-muted">
            남은 세션이 없어 더 이상 차감할 수 없습니다.
          </p>
        )}
      </section>

      {/* 수업 완료 내역 */}
      <Section
        title="수업 완료 내역"
        subtitle={
          member.completions.length > 0
            ? `총 ${member.completions.length}회`
            : "완료한 수업이 아직 없습니다."
        }
      >
        {member.completions.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="아직 완료한 수업이 없습니다"
            description="수업 완료 버튼을 누르면 날짜와 시간이 함께 기록됩니다."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {member.completions.slice(0, 10).map((completion) => (
              <li
                key={completion.id}
                className="flex items-center gap-2.5 rounded-xl bg-canvas px-4 py-3 text-[13px]"
              >
                <span aria-hidden="true">✅</span>
                {formatDateTime(completion.completedAt)}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 체중 기록 */}
      <Section
        title="체중 기록"
        subtitle={
          member.weights.length > 0
            ? `총 ${member.weights.length}건 · 최신순`
            : "체중 변화를 기록해 보세요."
        }
        action={
          <Button variant="ghost" onClick={() => setWeightOpen(true)}>
            + 체중 기록
          </Button>
        }
      >
        {member.weights.length === 0 ? (
          <EmptyState
            icon="💪"
            title="체중 기록이 없습니다"
            description="첫 체중을 기록하고 변화를 확인해 보세요."
            action={
              <Button onClick={() => setWeightOpen(true)}>+ 체중 기록하기</Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {member.weights.map((record) => (
              <li
                key={record.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-canvas px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-bold">
                    {record.weight}kg
                    <span className="ml-2 text-[12px] font-medium text-muted">
                      {formatDate(record.date)}
                    </span>
                  </p>
                  {record.memo && (
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                      {record.memo}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`${record.date} 체중 기록 삭제`}
                  onClick={() =>
                    setPending({
                      type: "deleteWeight",
                      id: record.id,
                      date: record.date,
                    })
                  }
                  className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-danger transition-colors hover:bg-red-50"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 운동 기록 */}
      <Section
        title="운동 기록"
        subtitle={
          member.workouts.length > 0
            ? `총 ${member.workouts.length}건 · 최신순`
            : "회원별 운동 기록을 등록하고 최신순으로 확인하세요."
        }
        action={
          <div className="flex gap-2">
            {member.workouts.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => setPending({ type: "deleteAllWorkouts" })}
                className="text-danger"
              >
                전체 삭제
              </Button>
            )}
            <Button variant="ghost" onClick={() => setWorkoutOpen(true)}>
              + 기록 추가
            </Button>
          </div>
        }
      >
        {member.workouts.length === 0 ? (
          <EmptyState
            icon="🏋️"
            title="운동 기록이 없습니다"
            description="첫 운동 기록을 추가해 보세요."
            action={
              <Button onClick={() => setWorkoutOpen(true)}>
                + 운동 기록 추가
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {member.workouts.map((workout) => (
              <li
                key={workout.id}
                className="rounded-xl border border-line bg-canvas p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-bold">
                    {formatDate(workout.date)}
                    <span className="ml-2 text-[12px] font-medium text-muted">
                      종목 {workout.exercises.length}개
                    </span>
                  </p>
                  <button
                    type="button"
                    aria-label="운동 기록 삭제"
                    onClick={() => setPending({ type: "deleteWorkout", workout })}
                    className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-danger transition-colors hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>

                <ul className="mt-3 flex flex-col gap-1.5">
                  {workout.exercises.map((exercise) => (
                    <li
                      key={exercise.id}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]"
                    >
                      <span className="font-semibold">{exercise.name}</span>
                      <span className="text-muted">
                        {exercise.sets}세트 × {exercise.reps}회
                        <span aria-hidden="true"> · </span>
                        {exercise.unit === "bodyweight"
                          ? "바디웨이트"
                          : `${exercise.weight}kg`}
                      </span>
                    </li>
                  ))}
                </ul>

                {workout.memo && (
                  <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-[13px] leading-relaxed text-muted">
                    {workout.memo}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 코칭 메모 */}
      <Section
        title="코칭 메모"
        subtitle={
          member.notes.length > 0
            ? `총 ${member.notes.length}건 · 최신순`
            : "통증, 자세와 움직임 평가를 기록해 다음 수업에 활용하세요."
        }
        action={
          <Button variant="ghost" onClick={() => setNoteTarget("new")}>
            + 코칭 메모
          </Button>
        }
      >
        {member.notes.length === 0 ? (
          <EmptyState
            icon="📋"
            title="코칭 메모가 없습니다"
            description="통증, 자세와 움직임 평가를 기록해 다음 수업에 활용하세요."
            action={
              <Button onClick={() => setNoteTarget("new")}>첫 메모 작성하기</Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {member.notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-line bg-canvas p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-bold">{formatDate(note.date)}</p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setNoteTarget(note)}
                      className="rounded-lg px-2 py-1 text-[12px] font-semibold text-primary-dark transition-colors hover:bg-primary-light"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setPending({ type: "deleteNote", note })}
                      className="rounded-lg px-2 py-1 text-[12px] font-semibold text-danger transition-colors hover:bg-red-50"
                    >
                      삭제
                    </button>
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
                        <dt className="text-[12px] font-bold text-muted">
                          {label}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed">
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

      <NutritionPanel
        memberId={member.id}
        nutrition={member.nutrition}
        suggestedWeight={latestWeight}
        onSaved={(nutrition) =>
          setMember((prev) => (prev ? { ...prev, nutrition } : prev))
        }
      />

      {/* ── 모달 ── */}

      <Modal open={editOpen} title="회원 정보 수정" onClose={() => setEditOpen(false)}>
        <MemberForm
          member={member}
          submitLabel="수정하기"
          busy={busy}
          serverError={formError}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal
        open={workoutOpen}
        title="운동 기록 추가"
        onClose={() => setWorkoutOpen(false)}
      >
        <WorkoutForm
          busy={busy}
          serverError={formError}
          onSubmit={handleAddWorkout}
          onCancel={() => setWorkoutOpen(false)}
        />
      </Modal>

      <WeightModal
        open={weightOpen}
        memberId={memberId}
        busy={busy}
        onClose={() => setWeightOpen(false)}
        onSaved={async () => {
          setWeightOpen(false);
          await load();
          setToast("체중을 기록했습니다.");
        }}
      />

      <Modal
        open={noteTarget !== null}
        title={noteTarget === "new" ? "코칭 메모 작성" : "코칭 메모 수정"}
        onClose={() => setNoteTarget(null)}
      >
        {noteTarget && (
          <CoachingNoteForm
            note={noteTarget === "new" ? undefined : noteTarget}
            busy={busy}
            serverError={formError}
            onSubmit={handleSaveNote}
            onCancel={() => setNoteTarget(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        {...confirmCopy(pending, member.name)}
      />

      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  );
}

/** 확인 다이얼로그 문구 */
function confirmCopy(pending: PendingAction | null, memberName: string) {
  switch (pending?.type) {
    case "completeSession":
      return {
        title: "수업 완료 확인",
        message: `${memberName} 회원의 수업을 완료 처리할까요?`,
        hint: "완료하면 남은 세션이 1회 차감되고, 완료한 날짜와 시간이 함께 기록됩니다.",
        confirmLabel: "완료 처리",
        tone: "primary" as const,
      };
    case "deleteMember":
      return {
        title: "회원 삭제",
        message: `${memberName} 회원을 삭제하시겠습니까?`,
        hint: "삭제된 정보는 복구할 수 없습니다.",
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
    default:
      return { title: "", message: "" };
  }
}

/** 체중 기록 입력 모달 */
function WeightModal({
  open,
  memberId,
  busy,
  onClose,
  onSaved,
}: {
  open: boolean;
  memberId: string;
  busy: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 열 때마다 입력값을 초기화한다.
  useEffect(() => {
    if (open) {
      setDate(today());
      setWeight("");
      setMemo("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      setError("날짜를 선택해 주세요.");
      return;
    }

    const parsed = Number(weight);
    if (weight === "" || !Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
      setError("0보다 크고 500kg 이하로 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/members/${memberId}/weights`, {
        method: "POST",
        body: JSON.stringify({ date, weight: parsed, memo: memo.trim() || null }),
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "체중 기록 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="체중 기록 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="날짜" required>
          <input
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <Field label="체중 (kg)" required>
          <input
            className={inputClass}
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            placeholder="예: 72.5"
            autoFocus
          />
        </Field>

        <Field label="메모">
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="공복 측정, 운동 후 측정 등"
          />
        </Field>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <div className="mt-2 flex gap-2.5">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button type="submit" loading={saving || busy} className="flex-1">
            기록하기
          </Button>
        </div>
      </form>
    </Modal>
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
        highlight ? "border-primary bg-primary-light" : "border-line bg-canvas"
      }`}
    >
      <p
        className={`text-[12px] font-semibold ${
          highlight ? "text-primary-dark" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight">
        {value}
        {unit && (
          <span className="ml-1 text-[12px] font-bold text-muted">{unit}</span>
        )}
      </p>
    </div>
  );
}
