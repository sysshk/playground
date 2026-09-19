/*
  회원 본인 화면 — 개인 운동 작성·수정 (서버). 주소가 workouts/new면 새 기록
  입력 화면은 수업 기록 화면을 personal로 그대로 씀

  @date : 2026-09-19
*/

import { Suspense } from "react";
import { requireClient } from "@/lib/auth";
import { getMyWorkoutEditor } from "@/lib/queries";
import { EditorMissing } from "../../../members/[memberId]/editor-frame";
import { WorkoutEditor } from "../../../members/[memberId]/workouts/[workoutId]/workout-editor";

type Props = { params: Promise<{ workoutId: string }> };

export default function MyWorkoutPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto h-[420px] w-full max-w-[720px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface" />
      }
    >
      <Screen {...props} />
    </Suspense>
  );
}

async function Screen({ params }: Props) {
  const { workoutId } = await params;
  const isNew = workoutId === "new";
  const viewer = await requireClient();
  const data = await getMyWorkoutEditor(viewer.id, isNew ? undefined : workoutId);
  const back = "/me?tab=personal";

  if (!data) {
    return <EditorMissing back={back} title="개인 운동" message="연결된 회원 기록이 없습니다." />;
  }
  // 주소를 직접 쳐서 없는 기록으로 들어온 경우
  if (!isNew && !data.workout) {
    return <EditorMissing back={back} title="개인 운동" message="기록을 찾을 수 없습니다." />;
  }

  return (
    <WorkoutEditor
      personal
      member={data.member}
      workout={data.workout}
      completedAt={null}
    />
  );
}
