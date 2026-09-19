/*
  영양 계산 화면 (서버)

  @date : 2026-09-12
*/

import { getNutritionEditor } from "@/lib/queries";
import { Suspense } from "react";
import { requireTrainer } from "@/lib/auth";
import { EditorMissing } from "@/components/custom/editor-page";
import { NutritionEditor } from "./nutrition-editor";

/** 칼로리 및 영양 계산 */
type Props = { params: Promise<{ memberId: string }>; };

export default function NutritionPage(props: Props) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Screen {...props} />
    </Suspense>
  );
}

/** 작성 화면을 읽는 동안 */
function EditorSkeleton() {
  return (
    <div className="mx-auto h-[420px] w-full max-w-[720px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface" />
  );
}

async function Screen({ params }: Props) {
  const { memberId } = await params;
  const trainer = await requireTrainer();
  const data = await getNutritionEditor(memberId, trainer.scope);

  if (!data) {
    return (
      <EditorMissing
        back={`/members/${memberId}?tab=diet`}
        title="영양 계산"
        message="회원을 찾을 수 없습니다."
      />
    );
  }

  return (
    <NutritionEditor
      member={data.member}
      nutrition={data.nutrition}
      latestWeight={data.latestWeight}
    />
  );
}
