import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/auth-config";

/**
 * 회원 화면 접근 가드.
 *
 * 데이터 보호는 이미 API 쪽 requireTrainerId/requireOwnedMember가 하고 있다.
 * 여기는 비로그인 방문자가 /members/:id를 직접 열었을 때 "불러오지 못했습니다"
 * 에러 대신 로그인 화면을 보게 하려는 것이다.
 *
 * Next 16에서 middleware(proxy) 인증 체크는 권장되지 않아 레이아웃에서 확인한다.
 */
export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <>{children}</>;
}
