"use client";

import { useParams } from "next/navigation";
import { WorkoutEditor } from "../_components/workout-editor";

/** 새 운동 기록 */
export default function NewWorkoutPage() {
  const { memberId } = useParams<{ memberId: string }>();
  return <WorkoutEditor memberId={memberId} />;
}
