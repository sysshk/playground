"use client";

import { EmptyState } from "@/components/custom/empty-state";
import { formatDate } from "@/lib/client";
import type { CoachingNote } from "@/lib/types";
import CoachingNoteForm, { type CoachingNotePayload } from "./coaching-note-form";
import { IconButton, Section, SectionAction } from "./section";

const FIELDS = [
  ["통증", "pain"],
  ["자세 문제", "posture"],
  ["움직임 평가", "movement"],
  ["숙제", "homework"],
] as const;

/** 통증·자세·움직임·숙제를 남겨 다음 수업으로 이어간다. */
export function NoteSection({
  notes,
  editing,
  formOpen,
  busy,
  serverError,
  onToggle,
  onEdit,
  onSubmit,
  onCancel,
  onDelete,
}: {
  notes: CoachingNote[];
  /** 수정 중인 메모. 새로 쓰는 중이면 null */
  editing: CoachingNote | null;
  formOpen: boolean;
  busy: boolean;
  serverError: string | null;
  onToggle: () => void;
  onEdit: (note: CoachingNote) => void;
  onSubmit: (payload: CoachingNotePayload) => void;
  onCancel: () => void;
  onDelete: (note: CoachingNote) => void;
}) {
  return (
    <Section
      title="코칭 메모"
      subtitle={
        notes.length > 0
          ? `총 ${notes.length}건 · 최신순`
          : "통증, 자세와 움직임 평가를 다음 수업에 활용하세요."
      }
      action={
        <SectionAction
          icon={formOpen ? "close" : "plus"}
          label={formOpen ? "닫기" : "메모 작성"}
          active={formOpen}
          onClick={onToggle}
        />
      }
    >
      {formOpen && (
        <div className="mb-4 rounded-xl border border-line bg-raised p-4">
          <CoachingNoteForm
            key={editing?.id ?? "new"}
            note={editing ?? undefined}
            busy={busy}
            serverError={serverError}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      )}

      {notes.length === 0 ? (
        !formOpen && (
          <EmptyState
            icon="clipboard"
            title="코칭 메모가 없습니다"
            description="통증·자세·움직임·숙제를 남겨 다음 수업에 이어가세요."
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{formatDate(note.date)}</p>
                <div className="flex gap-1">
                  <IconButton
                    icon="pencil"
                    label="코칭 메모 수정"
                    onClick={() => onEdit(note)}
                  />
                  <IconButton
                    icon="trash"
                    label="코칭 메모 삭제"
                    danger
                    onClick={() => onDelete(note)}
                  />
                </div>
              </div>

              <dl className="mt-3 flex flex-col gap-2.5">
                {FIELDS.filter(([, key]) => note[key]).map(([label, key]) => (
                  <div key={key}>
                    <dt className="text-2xs font-bold uppercase tracking-wide text-subtle">
                      {label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                      {note[key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
