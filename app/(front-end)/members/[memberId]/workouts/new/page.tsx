"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WorkoutEditor } from "../_components/workout-editor";

/** 새 운동 기록 */
export default function NewWorkoutPage() {
  return (
    <Suspense fallback={null}>
      <NewWorkout />
    </Suspense>
  );
}

function NewWorkout() {
  const { memberId } = useParams<{ memberId: string }>();
  // 일정에서 들어왔으면 저장할 때 그 일정을 끝난 것으로 표시한다.
  const appointmentId = useSearchParams().get("appointment");

  return (
    <WorkoutEditor memberId={memberId} appointmentId={appointmentId ?? undefined} />
  );
}
