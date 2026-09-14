/*
  회원 등록 화면

  @date : 2026-09-12
*/

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import MemberForm, { type MemberPayload } from "../_components/member-form";
import { Icon } from "@/components/custom/icons";
import { apiFetch, errorMessage } from "@/lib/client";

/** 회원 등록. */
export default function NewMemberPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (values: MemberPayload) => {
    setBusy(true);
    setServerError(null);
    try {
      const { member } = await apiFetch<{ member: { id: string } }>("/api/members", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast(`${values.name} 회원을 등록했습니다.`);
      // 등록하자마자 할 일은 대개 첫 기록이라 상세로 바로 보낸다.
      router.replace(`/members/${member.id}`);
    } catch (e) {
      setServerError(errorMessage(e, "회원 등록에 실패했습니다."));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <Link
        href="/members"
        className="hidden w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink lg:flex"
      >
        <Icon name="arrowLeft" size={15} />
        회원 목록
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]">회원 등록</h1>
        <p className="text-sm text-muted-foreground">
          이름과 연락처만 있으면 됩니다. 나머지는 나중에 채워도 됩니다.
        </p>
      </div>

      <div>
        <MemberForm
          submitLabel="등록하기"
          busy={busy}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/members")}
        />
      </div>
    </div>
  );
}
