/*
  회원 목록 화면 (서버) — 회원 목록·지표·이번 달 수업 달력을 함께 읽는다

  @date : 2026-09-12
*/

import { kstMonth } from "@/lib/kst";
import { getMemberList, getMonthCalendar } from "@/lib/queries";
import { requireTrainer } from "@/lib/auth";
import { MemberList } from "./_components/member-list";

/** 회원 목록 — 서버에서 읽어 첫 화면에 바로 그린다. */
export default async function MembersPage() {
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
