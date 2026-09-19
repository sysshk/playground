/*
  공통 — 로그인 세션에 담는 값의 타입 (id, 역할)

  @date : 2026-09-15
*/

import type { DefaultSession } from "next-auth";
import type { Role } from "@/types";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}
