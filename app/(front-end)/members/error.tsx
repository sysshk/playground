/*
  회원 화면 공통 — 데이터를 못 읽었을 때

  @date : 2026-09-14
*/

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";

/** 회원 화면에서 데이터를 못 읽었을 때 */
export default function MembersError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // reset만 하면 실패한 서버 데이터를 다시 읽지 않는다. refresh를 함께 건다.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <EmptyState
      icon="alert"
      title="화면을 불러오지 못했습니다"
      description="잠시 후 다시 시도해 주세요."
      action={
        <Button variant="outline" disabled={pending} onClick={retry}>
          다시 시도
        </Button>
      }
    />
  );
}
