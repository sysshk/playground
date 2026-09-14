/*
  회원 화면 공통 레이아웃 — 로그인 가드

  @date : 2026-09-12
*/

import { requireTrainer } from "@/lib/auth";

/** 회원 화면 접근 가드. */
export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTrainer();

  return <>{children}</>;
}
