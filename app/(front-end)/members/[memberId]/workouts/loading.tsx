/*
  수업 기록 작성·수정 화면 — 불러오는 동안 뼈대

  @date : 2026-09-14
*/

"use client";

import { useParams } from "next/navigation";
import { EditorSkeleton } from "../_components/editor-frame";

/** 수업 기록 화면을 읽는 동안 */
export default function WorkoutsLoading() {
  const { memberId } = useParams<{ memberId: string }>();
  return <EditorSkeleton back={`/members/${memberId}`} title="수업 기록" />;
}
