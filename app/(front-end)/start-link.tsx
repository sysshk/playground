/*
  소개 화면 — 시작 버튼 (로그인했으면 회원 관리로)
  소개 화면은 서버에서 미리 그려 두고, 로그인 여부가 필요한 이 버튼만 브라우저에서 그린다.

  @date : 2026-09-15
*/

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/custom/icons";
import { SIGNUP_ENABLED } from "@/lib/config";

export function StartLink({ className }: { className: string }) {
  const { status } = useSession();
  const loggedIn = status === "authenticated";

  return (
    <Link href={loggedIn ? "/members" : SIGNUP_ENABLED ? "/join" : "/login"} className={className}>
      {loggedIn ? "회원 관리로 이동" : SIGNUP_ENABLED ? "무료로 시작하기" : "로그인하고 시작하기"}
      <Icon name="arrowRight" size={17} />
    </Link>
  );
}
