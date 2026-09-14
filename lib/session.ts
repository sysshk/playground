import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/auth-config";

/**
 * 서버 화면에서 로그인한 트레이너를 꺼낸다. 없으면 로그인으로 보낸다.
 * 레이아웃과 페이지가 같은 요청에서 함께 불러도 한 번만 푼다.
 */
export const requireTrainer = cache(async () => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login");

  return {
    id: user.id,
    name: user.name || user.email?.split("@")[0] || "트레이너",
  };
});
