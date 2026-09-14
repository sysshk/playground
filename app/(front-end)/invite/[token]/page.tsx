/*
  초대 링크 화면 (서버) — 트레이너가 보낸 링크로 들어온 회원이 아이디를 만든다

  @date : 2026-09-15
*/

import Link from "next/link";
import { LogoMark } from "@/components/custom/logo";
import { getInvite } from "@/lib/queries";
import { InviteForm } from "./invite-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInvite(token);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-5 py-12">
      <div className="w-full max-w-[360px]">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={48} />
          {invite ? (
            <>
              <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.025em] text-balance">
                {invite.memberName}님, 반가워요
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                아이디를 만들면 수업 기록과 체중 변화를 언제든 볼 수 있어요.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.025em]">
                쓸 수 없는 링크입니다
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                만료됐거나 이미 사용한 링크예요. 트레이너에게 새 링크를 받아 주세요.
              </p>
            </>
          )}
        </div>

        {invite ? (
          <InviteForm token={token} />
        ) : (
          <Link
            href="/login"
            className="mt-8 flex h-10 items-center justify-center rounded-lg border border-edge text-sm font-bold transition-colors hover:bg-raised"
          >
            이미 아이디가 있으면 로그인
          </Link>
        )}
      </div>
    </div>
  );
}
