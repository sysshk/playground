"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage, formatDate } from "@/lib/client";
import type { CoachingNote } from "@/lib/types";
import { EditorFrame } from "../../_components/editor-frame";
import CoachingNoteForm, {
  type CoachingNotePayload,
} from "../../_components/coaching-note-form";

/** 코칭 메모 작성·수정 화면. 데이터는 서버 컴포넌트가 읽어 넘긴다. */
export function NoteEditor({
  member,
  note,
}: {
  member: { id: string; name: string };
  /** 주면 수정, 없으면 새 메모 */
  note: CoachingNote | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const memberId = member.id;
  const noteId = note?.id;
  const back = `/members/${memberId}`;

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
      <div>
        <CoachingNoteForm
          note={note ?? undefined}
          busy={busy}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => router.push(back)}
        />
      </div>
    </EditorFrame>
  );
}
