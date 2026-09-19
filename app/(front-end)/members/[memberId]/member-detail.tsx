/*
  회원 상세 화면 — 머리(회원 정보·수정), 탭(PT·몸 상태·식단·개인 운동·Q&A) 조립, 삭제 확인 창
  데이터는 서버 화면(page.tsx)이 읽어 넘기고, 저장·삭제 뒤에는 router.refresh로 다시 받음

  @date : 2026-09-12
*/

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/custom/breadcrumbs";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { Icon } from "@/components/custom/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch, errorMessage, formatDate, formatDayHour, formatDayShort } from "@/lib/client";
import { formatPhone } from "@/lib/phone";
import type {
  CoachingNote,
  MemberDetail,
  MemberTab,
  SessionCompletion,
  Workout,
} from "@/lib/types";
import MemberForm, { type MemberPayload } from "../member-form";
import { DietSection, NutritionPanel } from "./tabs/diet-tab";
import { WeightSection, type InbodyPayload } from "./tabs/inbody-tab";
import { PersonalWorkoutSection } from "./tabs/personal-tab";
import { LessonHistory, NoteSection } from "./tabs/pt-tab";
import { QuestionSection } from "./tabs/qna-tab";
import { MemberTabs } from "./tabs/tab-ui";

/** 화면에 펼쳐져 있는 입력 폼. 한 번에 하나만 열어 둠 */
type OpenForm =
  | { kind: "member" }
  | { kind: "weight" }
  | null;

export function MemberDetailView({
  member,
  initialTab,
  initialDate,
}: {
  member: MemberDetail;
  /** 주소의 ?tab= 로 여는 탭 */
  initialTab: MemberTab;
  initialDate: string; // 주소의 ?date= — 식단 탭이 여는 날
}) {
  const router = useRouter();
  const memberId = member.id;
  const [refreshing, startRefresh] = useTransition();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [open, setOpen] = useState<OpenForm>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 새 데이터가 도착할 때까지 버튼을 잠가 둠
  const locked = busy || refreshing;

  const show = (form: OpenForm) => {
    setFormError(null);
    setOpen(form);
  };

  /**
   * 저장·삭제 공통 — 끝나면 서버에서 상세를 다시 그림. 실패하면 오류 문구를 돌려줌
   * after(폼·창 닫기)는 새 데이터와 한 번에 반영되도록 같은 전환에 묶음
   */
  const run = async (
    url: string,
    init: RequestInit,
    ok: string,
    fail: string,
    after?: () => void,
  ) => {
    setBusy(true);
    setFormError(null);
    try {
      await apiFetch(url, init);
      startRefresh(() => {
        after?.();
        router.refresh();
      });
      toast(ok);
      return null;
    } catch (e) {
      return errorMessage(e, fail);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const { url, ok, fail } = pendingCopy(pending, memberId);
    const error = await run(url, { method: "DELETE" }, ok, fail, () => setPending(null));
    if (error) {
      toast(error);
      setPending(null);
    }
  };

  // 입력 창 안에서 저장하는 것들 — 실패 문구는 창에 띄움
  const save = async (url: string, init: RequestInit, ok: string, fail: string) => {
    const error = await run(url, init, ok, fail, () => setOpen(null));
    if (error) setFormError(error);
  };

  const handleEditMember = (values: MemberPayload) =>
    save(
      `/api/members/${memberId}`,
      { method: "PATCH", body: JSON.stringify(values) },
      "회원 정보를 수정했습니다.",
      "회원 정보 수정에 실패했습니다.",
    );

  const handleAddWeight = (payload: InbodyPayload) =>
    save(
      `/api/members/${memberId}/weights`,
      { method: "POST", body: JSON.stringify(payload) },
      "체중·인바디를 기록했습니다.",
      "기록 저장에 실패했습니다.",
    );

  // 그래프 위에서 바로 고치는 칸이라 오류를 띄울 폼이 없음. 실패는 토스트로 알림
  const handleSaveGoal = async (targetWeight: number | null) => {
    const error = await run(
      `/api/members/${memberId}/weights/target`,
      { method: "PUT", body: JSON.stringify({ targetWeight }) },
      targetWeight === null ? "목표 체중을 지웠습니다." : "목표 체중을 저장했습니다.",
      "목표 체중 저장에 실패했습니다.",
    );
    if (error) toast(error);
  };

  // 등록한 전체 횟수는 남은 것과 쓴 것을 더한 값임
  const totalSessions = member.remainingSessions + member.completionTotal;
  const lastCompletedAt = member.completions[0]?.completedAt ?? null;
  const confirm = pending ? pendingCopy(pending, memberId) : null;

  return (
    <div className="mx-auto -mt-5 flex w-full max-w-[760px] flex-col gap-7 sm:-mt-7 lg:mt-0">
      <Breadcrumbs
        className="-ml-1.5 hidden text-sm lg:flex"
        items={[{ label: "회원", href: "/members" }, { label: member.name }]}
      />

      <MemberTabs
        initial={initialTab}
        badges={{ qna: member.questions.filter((q) => !q.answer).length }}
        header={
          <MemberSummary
            member={member}
            totalSessions={totalSessions}
            lastCompletedAt={lastCompletedAt}
            editing={open?.kind === "member"}
            busy={locked}
            serverError={formError}
            onToggleEdit={() =>
              show(open?.kind === "member" ? null : { kind: "member" })
            }
            onSubmit={handleEditMember}
            onCancel={() => setOpen(null)}
          />
        }
        panels={{
          lessons: (
            <>
              <LessonHistory
                id="sessions"
                memberId={member.id}
                completions={member.completions}
                workouts={member.workouts}
                completionTotal={member.completionTotal}
                lessonTotal={member.lessonTotal}
                lessonLimit={member.lessonLimit}
                busy={locked}
                onDeleteWorkout={(workout, completionId) =>
                  setPending({ type: "deleteWorkout", workout, refunds: completionId !== undefined })
                }
                onDeleteCompletion={(completion) =>
                  setPending({ type: "cancelCompletion", completion })
                }
              />
              <NoteSection
                memberId={member.id}
                notes={member.notes}
                onDelete={(note) => setPending({ type: "deleteNote", note })}
              />
            </>
          ),
          body: (
            <>
              <WeightSection
                weights={member.weights}
                targetWeight={member.targetWeight}
                defaults={{
                  gender: member.nutrition?.gender ?? null,
                  age: member.nutrition?.age ?? null,
                  height: member.nutrition?.height ?? null,
                }}
                formOpen={open?.kind === "weight"}
                busy={locked}
                serverError={formError}
                onToggle={() => show(open?.kind === "weight" ? null : { kind: "weight" })}
                onSubmit={handleAddWeight}
                onSaveGoal={handleSaveGoal}
                onCancel={() => setOpen(null)}
                onDelete={(record) =>
                  setPending({ type: "deleteWeight", id: record.id, date: record.date })
                }
              />
            </>
          ),
          diet: (
            <>
              <DietSection
                memberId={member.id}
                meals={member.meals}
                nutrition={member.nutrition}
                role="trainer"
                initialDate={initialDate}
              />
              <NutritionPanel memberId={member.id} nutrition={member.nutrition} />
            </>
          ),
          personal: <PersonalWorkoutSection workouts={member.personalWorkouts} />,
          qna: <QuestionSection memberId={member.id} questions={member.questions} role="trainer" />,
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        busy={locked}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        hint={confirm?.hint}
      />
    </div>
  );
}

// ── 머리 ─────────────────────────────────

/** 회원 상세의 머리. */
function MemberSummary({
  member,
  totalSessions,
  lastCompletedAt,
  editing,
  busy,
  serverError,
  onToggleEdit,
  onSubmit,
  onCancel,
}: {
  member: MemberDetail;
  /** 등록한 전체 횟수 (남은 것 + 쓴 것) */
  totalSessions: number;
  /** 가장 최근 차감 시각. 없으면 null */
  lastCompletedAt: string | null;
  editing: boolean;
  busy: boolean;
  serverError: string | null;
  onToggleEdit: () => void;
  onSubmit: (values: MemberPayload) => void;
  onCancel: () => void;
}) {
  const { remainingSessions: left } = member;
  const used = totalSessions - left;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-extrabold tracking-[-0.03em]">
              {member.name}
            </h1>
            {member.goal && (
              <span className="rounded-full bg-raised px-2.5 py-1 text-2xs font-bold text-muted-foreground">
                {member.goal}
              </span>
            )}
            <span className="text-sm font-medium text-muted-foreground">{formatPhone(member.phone)}</span>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-muted-foreground">
            <span className="font-bold text-ink">남은 수업</span>
            <span
              className={`text-lg font-extrabold leading-none tracking-[-0.02em] ${
                left === 0 ? "text-subtle" : "text-primary"
              }`}
            >
              {left}
            </span>
            <span className="font-bold text-ink">회</span>
            <span aria-hidden="true" className="text-line-strong">
              ·
            </span>
            <span>
              {totalSessions > 0
                ? `등록 ${totalSessions}회 중 ${used}회 사용`
                : "등록된 수업 없음"}
              {lastCompletedAt && ` · 최근 수업 ${formatDayShort(lastCompletedAt)}`}
            </span>
          </p>
          {left === 0 && totalSessions > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-bold text-danger">
              <Icon name="alert" size={14} />
              남은 수업을 다 썼습니다. 재등록이 필요합니다.
            </p>
          )}
          {member.memo && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              <span className="font-bold text-ink">특이사항</span> : {member.memo}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleEdit}
          aria-label="회원 정보 수정"
          title="회원 정보 수정"
          className={`-mr-2 -mt-1.5 grid size-10 shrink-0 place-items-center transition-colors ${
            editing ? "text-ink" : "text-primary hover:text-primary-dark"
          }`}
        >
          <Icon name="pencil" className="size-3.5 sm:size-[15px] lg:size-4" />
        </button>
      </div>

      {/* 회원 정보 수정 창 */}
      <Dialog
        open={editing}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      >
        <DialogContent dismissOnOutsideClick className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>회원 정보 수정</DialogTitle>
          </DialogHeader>
          <MemberForm
            member={member}
            submitLabel="수정하기"
            busy={busy}
            serverError={serverError}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ── 확인 창 ──────────────────────────────────

/** 되돌릴 수 없는 동작만 확인 창을 띄움. 입력은 전부 화면 안에서 함 */
type PendingAction =
  | { type: "deleteWorkout"; workout: Workout; refunds: boolean }
  | { type: "deleteWeight"; id: string; date: string }
  | { type: "deleteNote"; note: CoachingNote }
  | { type: "cancelCompletion"; completion: SessionCompletion };

/** 확인 창 문구와 삭제 요청 경로 */
function pendingCopy(pending: PendingAction, memberId: string) {
  const path = `/api/members/${memberId}`;
  const refunded = "수업 기록을 삭제했습니다. 남은 수업이 1회 늘었습니다.";

  switch (pending.type) {
    case "deleteWorkout":
      return {
        title: "수업 기록 삭제",
        message: `${formatDate(pending.workout.date)} 수업 기록을 삭제하시겠습니까?`,
        hint: pending.refunds
          ? "종목과 세트가 지워지고 남은 수업이 1회 늘어납니다. 복구할 수 없습니다."
          : "삭제된 기록은 복구할 수 없습니다.",
        url: `${path}/workouts/${pending.workout.id}`,
        ok: pending.refunds ? refunded : "수업 기록을 삭제했습니다.",
        fail: "수업 기록 삭제에 실패했습니다.",
      };
    case "deleteWeight":
      return {
        title: "체중 기록 삭제",
        message: `${formatDate(pending.date)} 체중 기록을 삭제하시겠습니까?`,
        hint: "같은 날 적은 인바디 수치도 함께 지워지고 복구할 수 없습니다.",
        url: `${path}/weights/${pending.id}`,
        ok: "체중 기록을 삭제했습니다.",
        fail: "체중 기록 삭제에 실패했습니다.",
      };
    case "deleteNote":
      return {
        title: "코칭 메모 삭제",
        message: `${formatDate(pending.note.date)} 코칭 메모를 삭제하시겠습니까?`,
        hint: "삭제된 메모는 복구할 수 없습니다.",
        url: `${path}/notes/${pending.note.id}`,
        ok: "코칭 메모를 삭제했습니다.",
        fail: "코칭 메모 삭제에 실패했습니다.",
      };
    case "cancelCompletion":
      return {
        title: "수업 기록 삭제",
        message: `${formatDayHour(pending.completion.completedAt)} 수업 기록을 삭제하시겠습니까?`,
        hint: "남은 수업이 1회 늘어납니다.",
        url: `${path}/complete/${pending.completion.id}`,
        ok: refunded,
        fail: "수업 기록 삭제에 실패했습니다.",
      };
  }
}
