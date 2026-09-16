/*
  회원 목록 화면 (서버) — 회원 목록·지표·이번 달 수업 달력을 함께 읽음

  @date : 2026-09-12
*/

import { Suspense } from "react";
import { kstMonth } from "@/lib/kst";
import { getMemberList, getMonthCalendar } from "@/lib/queries";
import { requireTrainer } from "@/lib/auth";
import { MemberList } from "./member-list";

/** 회원 목록 — 서버에서 읽어 첫 화면에 바로 그림. 읽는 동안은 뼈대를 보여 줌 */
export default function MembersPage() {
  return (
    <Suspense fallback={<MembersSkeleton />}>
      <MembersScreen />
    </Suspense>
  );
}

async function MembersScreen() {
  const trainer = await requireTrainer();
  const month = kstMonth();
  const [{ members, stats }, calendar] = await Promise.all([
    getMemberList(trainer.scope),
    getMonthCalendar(trainer.scope, month),
  ]);

  return (
    <MemberList
      members={members}
      stats={stats}
      trainerName={trainer.name}
      month={month}
      calendar={calendar}
    />
  );
}

function MembersSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      <div className="h-[68px] w-2/3 animate-pulse rounded-2xl bg-surface" />
      <div className="h-[84px] animate-pulse rounded-2xl bg-surface" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[72px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
