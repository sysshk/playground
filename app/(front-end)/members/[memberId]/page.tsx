/*
  회원 상세 화면 (서버) — 회원 데이터를 읽어 화면에 넘긴다

  @date : 2026-09-12
*/

import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { getMemberDetail, lessonLimit } from "@/lib/queries";
import { requireTrainer } from "@/lib/auth";
import { MemberDetailView } from "./_components/member-detail";

/** 회원 상세 — 서버에서 읽어 첫 화면에 바로 그린다. */
export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ lessons?: string }>;
}) {
  const [{ memberId }, { lessons }] = await Promise.all([params, searchParams]);
  const trainer = await requireTrainer();
  const member = await getMemberDetail(memberId, trainer.scope, lessonLimit(lessons));

  if (!member) {
    return (
      <EmptyState
        icon="users"
        title="회원을 찾을 수 없습니다"
        description="삭제되었거나 잘못된 경로입니다."
        action={
          <Button asChild variant="outline">
            <Link href="/members">회원 목록으로</Link>
          </Button>
        }
      />
    );
  }

  return <MemberDetailView member={member} />;
}
