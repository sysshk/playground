import { getMemberList } from "@/lib/queries";
import { requireTrainer } from "@/lib/session";
import { MemberList } from "./_components/member-list";

/** 회원 목록 — 서버에서 읽어 첫 화면에 바로 그린다. */
export default async function MembersPage() {
  const trainer = await requireTrainer();
  const { members, stats } = await getMemberList(trainer.id);

  return <MemberList members={members} stats={stats} trainerName={trainer.name} />;
}
