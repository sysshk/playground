import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { getMemberDetail } from "@/lib/queries";
import { requireTrainer } from "@/lib/session";
import { MemberDetailView } from "./_components/member-detail";

/** 회원 상세 — 서버에서 읽어 첫 화면에 바로 그린다. */
export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const trainer = await requireTrainer();
  const member = await getMemberDetail(memberId, trainer.id);

  if (!member) {
    return (
      <EmptyState
        icon="users"
        title="회원을 찾을 수 없습니다"
        description="삭제되었거나 잘못된 경로입니다."
        action={
          <Link href="/members">
            <Button variant="outline">회원 목록으로</Button>
          </Link>
        }
      />
    );
  }

  return <MemberDetailView member={member} />;
}
