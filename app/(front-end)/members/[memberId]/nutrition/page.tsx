"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage } from "@/lib/client";
import type { MemberDetail, NutritionProfile } from "@/lib/types";
import { EditorFrame } from "../_components/editor-frame";
import NutritionForm, {
  type NutritionPayload,
} from "../_components/nutrition-form";

/** 칼로리 및 영양 계산. 입력이 여덟 칸이라 회원 상세 안에서 펼치지 않는다. */
export default function NutritionPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const router = useRouter();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const back = `/members/${memberId}`;

  useEffect(() => {
    let alive = true;
    apiFetch<{ member: MemberDetail }>(`/api/members/${memberId}`).then(
      (data) => {
        if (alive) setMember(data.member);
      },
      (e) => {
        if (alive) setLoadError(errorMessage(e, "회원을 불러오지 못했습니다."));
      },
    );
    return () => {
      alive = false;
    };
  }, [memberId]);

  const handleSubmit = useCallback(
    async (payload: NutritionPayload) => {
      setBusy(true);
      setServerError(null);
      try {
        await apiFetch<{ nutrition: NutritionProfile }>(
          `/api/members/${memberId}/nutrition`,
          { method: "PUT", body: JSON.stringify(payload) },
        );
        toast("섭취 기준을 계산했습니다.");
        router.replace(back);
      } catch (e) {
        setServerError(errorMessage(e, "계산 결과를 저장하지 못했습니다."));
        setBusy(false);
      }
    },
    [back, memberId, router],
  );

  if (loadError) {
    return (
      <EditorFrame back={back} title="영양 계산">
        <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
          <p className="text-base font-bold">{loadError}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={back}>회원으로 돌아가기</Link>
          </Button>
        </div>
      </EditorFrame>
    );
  }

  if (!member) {
    return (
      <EditorFrame back={back} title="영양 계산">
        <div className="h-[420px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface" />
      </EditorFrame>
    );
  }

  return (
    <EditorFrame
      back={back}
      title="영양 계산"
      name={member.name}
      subtitle="신체 정보와 목표를 넣으면 일일 섭취 기준을 계산합니다."
    >
      <div>
        <NutritionForm
          nutrition={member.nutrition}
          suggestedWeight={member.weights[0]?.weight ?? null}
          busy={busy}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => router.push(back)}
        />
      </div>
    </EditorFrame>
  );
}
