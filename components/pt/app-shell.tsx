"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ReactNode } from "react";

const NAV = [
  { href: "/", label: "홈", icon: IconHome },
  { href: "/members", label: "회원", icon: IconUsers },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name =
    session?.user?.name || session?.user?.email?.split("@")[0] || "트레이너";

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
              <IconDumbbell />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-bold tracking-tight">
                PT 매니저
              </span>
              <span className="block truncate text-[11px] text-muted">
                회원 · 운동 기록 관리
              </span>
            </span>
          </Link>

          {/* 데스크톱 내비 */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[14px] font-semibold transition-colors ${
                    active
                      ? "bg-primary-light text-primary-dark"
                      : "text-muted hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-[140px] truncate text-[13px] font-semibold sm:inline">
              {name}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="로그아웃"
              aria-label="로그아웃"
              className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-danger"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pb-10 sm:pt-7">
        {children}
      </main>

      {/* 모바일 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        <div className="flex h-[72px] items-stretch">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "text-primary-dark"
                    : "text-muted"
                }`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ── icons ─────────────────────────────────────
function IconDumbbell() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
