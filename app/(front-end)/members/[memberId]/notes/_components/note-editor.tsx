"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage, formatDate } from "@/lib/client";
import type { MemberDetail } from "@/lib/types";
import { EditorFrame } from "../../_components/editor-frame";
import CoachingNoteForm, {
  type CoachingNotePayload,
} from "../../_components/coaching-note-form";

/** 코칭 메모 작성·수정 화면. */
export function NoteEditor({
  memberId,
  noteId,
}: {
  memberId: string;
  /** 주면 수정, 없으면 새 메모 */
  noteId?: string;
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

  const note = noteId ? member?.notes.find((n) => n.id === noteId) : undefined;

  const handleSubmit = useCallback(
    async (payload: CoachingNotePayload) => {
      setBusy(true);
      setServerError(null);
      try {
        await apiFetch(
          noteId
            ? `/api/members/${memberId}/notes/${noteId}`
            : `/api/members/${memberId}/notes`,
          {
            method: noteId ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );
        toast(noteId ? "코칭 메모를 수정했습니다." : "코칭 메모를 저장했습니다.");
        router.replace(back);
      } catch (e) {
        setServerError(errorMessage(e, "코칭 메모 저장에 실패했습니다."));
        setBusy(false);
      }
    },
    [back, memberId, noteId, router],
  );

  if (loadError) {
    return (
      <EditorFrame back={back} title="코칭 메모">
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
      <EditorFrame back={back} title="코칭 메모">
        <div className="h-[420px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface" />
      </EditorFrame>
    );
  }

  // 주소를 직접 쳐서 없는 메모로 들어온 경우
  if (noteId && !note) {
    return (
      <EditorFrame back={back} title="코칭 메모" name={member.name}>
        <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
          <p className="text-base font-bold">메모를 찾을 수 없습니다.</p>
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
      title={note ? "코칭 메모 수정" : "코칭 메모"}
      name={member.name}
      subtitle={
        note
          ? `${formatDate(note.date)} 메모를 고칩니다.`
          : "통증, 자세와 움직임 평가를 다음 수업에 활용하세요."
      }
    >
      <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-4 sm:p-5">
        <CoachingNoteForm
          note={note}
          busy={busy}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => router.push(back)}
        />
      </div>
    </EditorFrame>
  );
}
