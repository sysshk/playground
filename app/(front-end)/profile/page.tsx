/*
  내 정보 화면 (서버) — 로그인한 누구나 자기 이름·비밀번호를 바꿈
  회원 계정은 트레이너가 등록한 연락처도 직접 고침

  @date : 2026-09-16
*/

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { prismaRead } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/types";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const user = await prismaRead.user.findUnique({
    where: { id: viewer.id },
    select: {
      name: true,
      email: true,
      createdAt: true,
      password: true,
      memberRecord: { select: { phone: true } },
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em]">내 정보</h1>
        <p className="text-sm text-muted-foreground">잘못 들어간 정보는 여기서 바로 고칠 수 있습니다.</p>
      </div>

      {/* 계정 요약 */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl border border-edge bg-surface px-5 py-4 text-sm">
        <dt className="text-muted-foreground">이메일</dt>
        <dd className="min-w-0 truncate font-semibold">{user.email}</dd>
        <dt className="text-muted-foreground">권한</dt>
        <dd className="font-semibold">{ROLE_LABEL[viewer.role]}</dd>
        <dt className="text-muted-foreground">가입일</dt>
        <dd className="font-semibold tabular-nums">
          {user.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
        </dd>
      </dl>

      {/* 비밀번호 해시는 화면으로 넘기지 않고 있는지만 알려 줌 */}
      <ProfileForm
        name={user.name ?? ""}
        phone={user.memberRecord?.phone ?? null}
        hasPassword={Boolean(user.password)}
      />
    </div>
  );
}
