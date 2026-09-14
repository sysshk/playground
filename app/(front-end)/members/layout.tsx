import { requireTrainer } from "@/lib/session";

/** 회원 화면 접근 가드. */
export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTrainer();

  return <>{children}</>;
}
