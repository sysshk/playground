import { getWorkoutEditor } from "@/lib/queries";
import { requireTrainer } from "@/lib/session";
import { EditorMissing } from "../../_components/editor-frame";
import { WorkoutEditor } from "../_components/workout-editor";

/** 기존 운동 기록 수정 */
export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ memberId: string; workoutId: string }>;
}) {
  const { memberId, workoutId } = await params;
  const trainer = await requireTrainer();
  const data = await getWorkoutEditor(memberId, trainer.id, workoutId);
  const back = `/members/${memberId}`;

  if (!data) {
    return <EditorMissing back={back} title="수업 기록" message="회원을 찾을 수 없습니다." />;
  }
  // 주소를 직접 쳐서 없는 기록으로 들어온 경우
  if (!data.workout) {
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
    <WorkoutEditor member={data.member} workout={data.workout} lastSets={data.lastSets} />
  );
}
