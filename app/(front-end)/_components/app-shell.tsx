"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ReactNode } from "react";
import { Icon } from "@/components/custom/icons";
import Logo from "@/components/custom/logo";
import { BASE_PATH } from "@/lib/client";

/**
 * 로그인한 트레이너가 쓰는 앱 셸.
 *
 * 앱의 홈은 회원 목록이다. 소개 페이지("/")는 로그인 전 방문자를 위한
 * 마케팅 화면이라 내비게이션이 아니라 footer 링크로만 남긴다.
 * 화면이 하나뿐이라 탭 바 대신 로고를 홈 링크로 쓴다.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated";
  const name =
    session?.user?.name || session?.user?.email?.split("@")[0] || "트레이너";

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link href={loggedIn ? "/members" : "/"} className="flex min-w-0">
            <Logo />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {status === "loading" ? (
              <span className="h-8 w-8" aria-hidden="true" />
            ) : loggedIn ? (
              <>
                <span className="hidden max-w-[140px] truncate text-sm font-semibold sm:inline">
                  {name}
                </span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: `${BASE_PATH}/login` })}
                  title="로그아웃"
                  aria-label="로그아웃"
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger"
                >
                  <Icon name="logout" size={17} />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-6 sm:py-7">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <span className="text-xs text-subtle">
            © {new Date().getFullYear()} PT 매니저
          </span>
          <Link
            href="/"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-ink"
          >
            서비스 소개
          </Link>
        </div>
      </footer>
    </div>
  );
}
