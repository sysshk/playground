/*
  회원 본인 화면 — 식단 한 끼 작성 (서버). ?date=&slot=으로 날짜·끼니를 받음
  입력 화면은 트레이너 식단 작성 화면을 그대로 씀

  @date : 2026-09-19
*/

import { Suspense } from "react";
import { requireClient } from "@/lib/auth";
import { toPastDay } from "@/lib/kst";
import { getMyMealEditor } from "@/lib/queries";
import { toMealSlot } from "@/types";
import { EditorMissing } from "@/components/custom/editor-page";
import { MealEditor } from "../../members/[memberId]/new-meal/meal-editor";

type Props = { searchParams: Promise<{ date?: string; slot?: string }> };

export default function MyMealPage(props: Props) {
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

async function Screen({ searchParams }: Props) {
  const query = await searchParams;
  const date = toPastDay(query.date);
  const slot = toMealSlot(query.slot);
  const back = `/me?tab=diet&date=${date}`;

  if (!slot) {
    return <EditorMissing back={back} title="식단 기록" message="끼니를 알 수 없습니다." />;
  }

  const viewer = await requireClient();
  const data = await getMyMealEditor(viewer.id, date, slot);
  if (!data) {
    return <EditorMissing back={back} title="식단 기록" message="연결된 회원 기록이 없습니다." />;
  }

  return (
    <MealEditor
      meals={data.meals}
      date={date}
      slot={slot}
      api="/api/me/meals"
      back={back}
    />
  );
}
