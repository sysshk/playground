"use client";

import { useParams } from "next/navigation";
import { WorkoutEditor } from "../_components/workout-editor";

/** 기존 운동 기록 수정 */
export default function EditWorkoutPage() {
  const { memberId, workoutId } = useParams<{
    memberId: string;
    workoutId: string;
  }>();
  return <WorkoutEditor memberId={memberId} workoutId={workoutId} />;
}
