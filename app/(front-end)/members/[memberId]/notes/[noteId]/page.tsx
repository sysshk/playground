"use client";

import { useParams } from "next/navigation";
import { NoteEditor } from "../_components/note-editor";

/** 코칭 메모 수정 */
export default function EditNotePage() {
  const { memberId, noteId } = useParams<{
    memberId: string;
    noteId: string;
  }>();
  return <NoteEditor memberId={memberId} noteId={noteId} />;
}
