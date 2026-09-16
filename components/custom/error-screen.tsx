/*
  공통 — 화면을 못 불러왔을 때 (회원·계정 관리·내 기록 등 모든 화면)

  @date : 2026-09-14
*/

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";

/** 화면을 못 불러왔을 때 — 다시 시도 버튼 하나 */
export default function ErrorScreen({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // reset만 하면 실패한 서버 데이터를 다시 읽지 않음. refresh를 함께 호출함
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
