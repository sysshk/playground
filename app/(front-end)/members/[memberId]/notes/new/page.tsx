"use client";

import { useParams } from "next/navigation";
import { NoteEditor } from "../_components/note-editor";

/** 새 코칭 메모 */
export default function NewNotePage() {
  const { memberId } = useParams<{ memberId: string }>();
  return <NoteEditor memberId={memberId} />;
}
