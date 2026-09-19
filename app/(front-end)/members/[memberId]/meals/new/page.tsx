/*
  식단 한 끼 작성 화면 (서버) — 트레이너가 회원 식단을 적음. ?date=&slot=으로 날짜·끼니를 받음

  @date : 2026-09-19
*/

import { Suspense } from "react";
import { requireTrainer } from "@/lib/auth";
import { toPastDay } from "@/lib/kst";
import { getMealEditor } from "@/lib/queries";
import { toMealSlot } from "@/lib/types";
import { EditorMissing } from "../../editor-frame";
import { MealEditor } from "../meal-editor";

type Props = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ date?: string; slot?: string }>;
};

export default function MealPage(props: Props) {
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

async function Screen({ params, searchParams }: Props) {
  const [{ memberId }, query] = await Promise.all([params, searchParams]);
  const date = toPastDay(query.date);
  const slot = toMealSlot(query.slot);
  const back = `/members/${memberId}?tab=diet&date=${date}`;

  if (!slot) {
    return <EditorMissing back={back} title="식단 기록" message="끼니를 알 수 없습니다." />;
  }

  const trainer = await requireTrainer();
  const data = await getMealEditor(memberId, trainer.scope, date, slot);
  if (!data) {
    return <EditorMissing back={back} title="식단 기록" message="회원을 찾을 수 없습니다." />;
  }

  return (
    <MealEditor
      name={data.member.name}
      meals={data.meals}
      date={date}
      slot={slot}
      api={`/api/members/${memberId}/meals`}
      back={back}
    />
  );
}
