import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/auth-config";

/** 회원 화면 접근 가드. */
export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <>{children}</>;
}
