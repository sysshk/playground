"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/client";
import type { NutritionProfile } from "@/lib/types";
import { EditorFrame } from "./editor-frame";
import NutritionForm, { type NutritionPayload } from "./nutrition-form";

/** 칼로리 및 영양 계산. 입력이 여덟 칸이라 회원 상세 안에서 펼치지 않는다. */
export function NutritionEditor({
  member,
  nutrition,
  latestWeight,
}: {
  member: { id: string; name: string };
  nutrition: NutritionProfile | null;
  /** 체중 칸에 미리 넣어 둘 가장 최근 체중 */
  latestWeight: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const memberId = member.id;
  const back = `/members/${memberId}`;

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

  return (
    <EditorFrame
      back={back}
      title="영양 계산"
      name={member.name}
      subtitle="신체 정보와 목표를 넣으면 일일 섭취 기준을 계산합니다."
    >
      <div>
        <NutritionForm
          nutrition={nutrition}
          suggestedWeight={latestWeight}
          busy={busy}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => router.push(back)}
        />
      </div>
    </EditorFrame>
  );
}
