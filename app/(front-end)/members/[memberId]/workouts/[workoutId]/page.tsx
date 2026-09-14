/*
  수업 기록 작성·수정 화면 (서버) — 주소가 workouts/new면 새 기록, 아니면 그 기록을 고친다

  @date : 2026-09-12
*/

import { requireTrainer } from "@/lib/auth";
import { getWorkoutEditor } from "@/lib/queries";
import { EditorMissing } from "../../_components/editor-frame";
import { WorkoutEditor } from "../workout-editor";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ memberId: string; workoutId: string }>;
}) {
  const { memberId, workoutId } = await params;
  const isNew = workoutId === "new";
  const trainer = await requireTrainer();
  const data = await getWorkoutEditor(memberId, trainer.scope, isNew ? undefined : workoutId);
  const back = `/members/${memberId}`;

  if (!data) {
    return <EditorMissing back={back} title="수업 기록" message="회원을 찾을 수 없습니다." />;
  }
  // 주소를 직접 쳐서 없는 기록으로 들어온 경우
  if (!isNew && !data.workout) {
    return (
      <EditorMissing
        back={back}
        title="수업 기록"
        name={data.member.name}
        message="기록을 찾을 수 없습니다."
      />
    );
  }

  return (
    <WorkoutEditor
      member={data.member}
      workout={data.workout}
      completedAt={data.completedAt}
      lastSets={data.lastSets}
    />
  );
}
