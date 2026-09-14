"use client";

import { useParams } from "next/navigation";
import { EditorSkeleton } from "../_components/editor-frame";

/** 코칭 메모 화면을 읽는 동안 */
export default function NotesLoading() {
  const { memberId } = useParams<{ memberId: string }>();
  return <EditorSkeleton back={`/members/${memberId}`} title="코칭 메모" />;
}
