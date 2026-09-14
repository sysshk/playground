"use client";

// 회원 상세 — 저장·삭제를 처리하고, 섹션들을 이어 붙인다.
// 데이터는 서버 컴포넌트(page.tsx)가 읽어 넘기고, 바뀌면 router.refresh로 다시 받는다.
// 화면 모양은 전부 섹션 컴포넌트가 가지고 있다.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { confirmCopy, type PendingAction } from "./confirm-copy";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { MemberSummary } from "./member-summary";
import { NoteSection } from "./note-section";
import NutritionPanel from "./nutrition-panel";
import { SessionSection } from "./session-section";
import { WeightSection } from "./weight-section";
import type { WeightPayload } from "./weight-form";
import type { MemberPayload } from "../../_components/member-form";
import { Icon } from "@/components/custom/icons";
import { apiFetch, errorMessage } from "@/lib/client";
import type { MemberDetail } from "@/lib/types";

/** 화면에 펼쳐져 있는 입력 폼. 한 번에 하나만 연다. */
type OpenForm =
  | { kind: "member" }
  | { kind: "weight" }
  | null;

export function MemberDetailView({ member }: { member: MemberDetail }) {
  const router = useRouter();
  const memberId = member.id;
  const [refreshing, startRefresh] = useTransition();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [open, setOpen] = useState<OpenForm>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 새 데이터가 도착할 때까지 버튼을 잠가 둔다.
  const locked = busy || refreshing;

  const show = (form: OpenForm) => {
    setFormError(null);
    setOpen(form);
  };

  /**
   * 뮤테이션 공통 래퍼 — 끝나면 서버에서 상세를 다시 그린다.
   * after(폼·창 닫기)는 새 데이터와 한 번에 반영되도록 같은 전환에 묶는다.
   */
  const run = async (
    action: () => Promise<void>,
    successMessage: string,
    fallback: string,
    after?: () => void,
  ) => {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      startRefresh(() => {
        after?.();
        router.refresh();
      });
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
      deleteWorkout: [
        `${path}/workouts/${pending.type === "deleteWorkout" ? pending.workout.id : ""}`,
        { method: "DELETE" },
        "수업 기록을 삭제했습니다.",
        "수업 기록 삭제에 실패했습니다.",
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
        "수업 기록을 삭제했습니다. 남은 수업이 1회 늘었습니다.",
        "수업 기록 삭제에 실패했습니다.",
      ],
    };

    const [url, init, ok, fail] = jobs[pending.type];
    // 기록과 수업은 한 줄로 보이므로 함께 지운다. 기록만 지우고 수업이
    // 남으면 화면에는 사라졌는데 횟수는 그대로인 상태가 된다.
    const linked =
      pending.type === "deleteWorkout" ? pending.completionId : undefined;

    const done = await run(
      async () => {
        await apiFetch(url, init);
        if (linked) await apiFetch(`${path}/complete/${linked}`, { method: "DELETE" });
      },
      linked ? "수업 기록을 삭제했습니다. 남은 수업이 1회 늘었습니다." : ok,
      fail,
      () => setPending(null),
    );
    if (!done) {
      toast(formError ?? fail);
      setPending(null);
    }
  };

  const save = async (
    url: string,
    init: RequestInit,
    ok: string,
    fail: string,
  ) => {
    await run(
      async () => {
        await apiFetch(url, init);
      },
      ok,
      fail,
      () => setOpen(null),
    );
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

  // 등록한 전체 횟수는 남은 것과 쓴 것을 더한 값이다.
  const totalSessions = member.remainingSessions + member.completions.length;
  const lastCompletedAt = member.completions[0]?.completedAt ?? null;

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
        busy={locked}
        serverError={formError}
        onToggleEdit={() =>
          show(open?.kind === "member" ? null : { kind: "member" })
        }
        onSubmit={handleEditMember}
        onCancel={() => setOpen(null)}
      />

      <SessionSection
        id="sessions"
        memberId={member.id}
        completions={member.completions}
        workouts={member.workouts}
        busy={locked}
        onDeleteWorkout={(workout, completionId) =>
          setPending({ type: "deleteWorkout", workout, completionId })
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

      <WeightSection
        weights={member.weights}
        formOpen={open?.kind === "weight"}
        busy={locked}
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
        busy={locked}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        {...confirmCopy(pending, member.name)}
      />
    </div>
  );
}
