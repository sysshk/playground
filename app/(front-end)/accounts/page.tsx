/*
  계정 관리 화면 (서버, 관리자 전용) — 모든 회원 기록과 로그인 계정을 읽는다

  @date : 2026-09-15
*/

import { requireAdmin } from "@/lib/auth";
import { getAccounts } from "@/lib/queries";
import { AccountManager } from "./account-manager";

export default async function AccountsPage() {
  const admin = await requireAdmin();
  const { members, users } = await getAccounts();

  return <AccountManager members={members} users={users} myId={admin.id} />;
}
