/*
  회원 상세 화면 (서버) — 회원 데이터를 읽어 화면에 넘김

  @date : 2026-09-12
*/

import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { getMemberDetail, lessonLimit } from "@/lib/queries";
import { requireTrainer } from "@/lib/auth";
import { MemberDetailView } from "./member-detail";

type Props = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ lessons?: string }>;
};

/** 회원 상세 — 서버에서 읽어 첫 화면에 바로 그림. 읽는 동안은 뼈대를 보여 줌 */
export default function MemberDetailPage(props: Props) {
  return (
    <Suspense fallback={<MemberSkeleton />}>
      <MemberScreen {...props} />
    </Suspense>
  );
}

async function MemberScreen({ params, searchParams }: Props) {
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

/** 회원 상세와 그 아래 작성 화면을 읽는 동안 */
function MemberSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-surface" />
      <div className="h-[150px] animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="h-[280px] animate-pulse rounded-2xl border border-line bg-surface" />
    </div>
  );
}
