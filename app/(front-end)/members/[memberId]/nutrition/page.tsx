import { getNutritionEditor } from "@/lib/queries";
import { requireTrainer } from "@/lib/session";
import { EditorMissing } from "../_components/editor-frame";
import { NutritionEditor } from "../_components/nutrition-editor";

/** 칼로리 및 영양 계산 */
export default async function NutritionPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const trainer = await requireTrainer();
  const data = await getNutritionEditor(memberId, trainer.id);

  if (!data) {
    return (
      <EditorMissing
        back={`/members/${memberId}`}
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
