"use client";

import { useParams } from "next/navigation";
import { EditorSkeleton } from "../_components/editor-frame";

/** 영양 계산 화면을 읽는 동안 */
export default function NutritionLoading() {
  const { memberId } = useParams<{ memberId: string }>();
  return <EditorSkeleton back={`/members/${memberId}`} title="영양 계산" />;
}
