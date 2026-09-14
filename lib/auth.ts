/*
  서버 공통 — 로그인한 사람과 역할 꺼내기 (서버 화면용 가드, 볼 수 있는 회원 범위)

  @date : 2026-09-15
*/

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/auth-config";
import type { Role } from "@/lib/types";

export type Viewer = { id: string; name: string; role: Role };

/** 회원 where에 펼쳐 쓰는 조건. 단건 update의 where에도 들어가도록 모양을 좁혀 둔다. */
export type MemberScope = { trainerId?: string };

/** 관리자는 모든 회원, 트레이너는 자기가 등록한 회원만 본다. */
export function memberScope(viewer: { id: string; role: Role }): MemberScope {
  return viewer.role === "admin" ? {} : { trainerId: viewer.id };
}

/** 로그인한 사람. 없으면 null. 같은 요청에서 여러 번 불러도 한 번만 푼다. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;

  return {
    id: user.id,
    name: user.name || user.email?.split("@")[0] || "트레이너",
    role: user.role,
  };
});

/** 트레이너·관리자 화면 가드. 회원 계정은 내 기록으로 보낸다. */
export const requireTrainer = cache(async () => {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role === "client") redirect("/me");

  return { ...viewer, scope: memberScope(viewer) };
});

/** 관리자 화면 가드. */
export const requireAdmin = cache(async () => {
  const trainer = await requireTrainer();
  if (trainer.role !== "admin") redirect("/members");
  return trainer;
});

/** 회원 본인 화면 가드. 트레이너·관리자는 회원 목록으로 보낸다. */
export const requireClient = cache(async () => {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "client") redirect("/members");
  return viewer;
});
