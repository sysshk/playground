import { getWorkoutEditor } from "@/lib/queries";
import { requireTrainer } from "@/lib/session";
import { EditorMissing } from "../../_components/editor-frame";
import { WorkoutEditor } from "../_components/workout-editor";

/** 새 운동 기록 */
export default async function NewWorkoutPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const trainer = await requireTrainer();
  const data = await getWorkoutEditor(memberId, trainer.id);

  if (!data) {
    return (
      <EditorMissing
        back={`/members/${memberId}`}
        title="수업 기록"
        message="회원을 찾을 수 없습니다."
      />
    );
  }

  return <WorkoutEditor member={data.member} workout={null} lastSets={data.lastSets} />;
}
