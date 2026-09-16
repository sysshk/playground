/*
  공통 — 사이드바, 폰 상단 바, 서랍 메뉴, 푸터

  @date : 2026-09-12
*/

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { Icon, type IconName } from "@/components/custom/icons";
import { LogoMark } from "@/components/custom/logo";
import { useTheme } from "@/components/custom/theme";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BASE_PATH } from "@/lib/client";
import { ROLE_HOME, type Role } from "@/lib/types";

/** 역할별 메뉴. 회원(client)은 자기 기록 하나만 본다. */
const NAV: { href: string; label: string; icon: IconName; roles: Role[] }[] = [
  { href: "/members", label: "회원", icon: "users", roles: ["admin", "trainer"] },
  { href: "/accounts", label: "계정 관리", icon: "settings", roles: ["admin"] },
  { href: "/me", label: "내 기록", icon: "trend", roles: ["client"] },
];

const OPEN_WIDTH = 287;

const INNER_WIDTH = OPEN_WIDTH - 24;

const BACK =
  "flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-base font-bold text-muted-foreground transition-colors hover:bg-raised hover:text-ink";

/** 폰 상단 바 내용. 뒤로 가기는 한 단계 위로만 보낸다. */
function topBar(pathname: string) {
  if (pathname === "/members") return { label: "회원" };
  if (pathname === "/accounts") return { label: "계정 관리" };
  if (pathname === "/me") return { label: "내 기록" };

  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] !== "members") return { label: "PT 매니저" };

  // /members/new, /members/:id → 목록으로
  if (seg.length === 2) return { href: "/members", label: "회원 목록" };

  // /members/:id/... → 그 회원으로
  return { href: `/members/${seg[1]}`, label: "회원" };
}

/** 로그인한 사람이 쓰는 셸 — 사이드바·상단 바·본문 자리·푸터까지 함께 그린다. */
export default function FrontSidebar({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useStoredFlag("pt.sidebar-collapsed");

  const bar = topBar(pathname);
  const loggedIn = status === "authenticated";

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      {/* 사이드바 */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 overflow-hidden p-3 transition-all duration-300 ease-in-out lg:block ${
          collapsed
            ? "w-[72px]"
            : "w-[287px] border-r-[1.5px] border-edge bg-surface"
        }`}
      >
        <div
          className="flex h-full flex-col justify-between gap-6"
          style={{ width: INNER_WIDTH }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
                title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-raised"
              >
                <Icon name="menu" size={20} />
              </button>
              <Fade hidden={collapsed}>
                <Brand />
              </Fade>
            </div>

            <Fade hidden={collapsed}>
              <Nav />
            </Fade>
          </div>

          <Fade hidden={collapsed}>
            <Account />
          </Fade>
        </div>
      </aside>

      {/* 서랍 */}
      <div
        inert={!drawerOpen}
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
      >
        <button
          type="button"
          aria-label="메뉴 닫기"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 hidden bg-black/50 transition-opacity duration-300 sm:block ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-full flex-col justify-between gap-6 bg-surface pb-4 transition-transform duration-300 ease-out sm:w-[287px] sm:border-r-[1.5px] sm:border-edge ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col gap-4">
            {/* 서랍 머리 */}
            <div className="flex h-14 items-center gap-1 px-4 sm:h-16 sm:px-6">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="메뉴 닫기"
                aria-expanded
                className="-ml-2 grid size-10 shrink-0 place-items-center rounded-lg text-ink transition-colors hover:bg-raised"
              >
                <Icon name="menu" size={20} />
              </button>
              <Brand
                onNavigate={() => setDrawerOpen(false)}
                gradientId="pt-logo-gradient-drawer"
              />
            </div>

            <div className="px-4">
              <Nav onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>

          <div className="px-4">
            <Account />
          </div>
        </aside>
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b-[1.5px] border-edge bg-surface lg:hidden">
          <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-1">
              {loggedIn && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="메뉴 열기"
                  aria-expanded={drawerOpen}
                  className="-ml-2 grid size-10 shrink-0 place-items-center rounded-lg text-ink transition-colors hover:bg-raised"
                >
                  <Icon name="menu" size={20} />
                </button>
              )}

              {bar.href ? (
                <Link href={bar.href} className={BACK}>
                  <Icon name="arrowLeft" size={17} />
                  <span className="truncate">{bar.label}</span>
                </Link>
              ) : (
                <span className="truncate px-2 text-base font-extrabold tracking-[-0.02em]">
                  {bar.label}
                </span>
              )}
            </div>

            {!loggedIn && status !== "loading" && (
              <Link
                href="/login"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
              >
                로그인
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6 lg:px-8">
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
    </div>
  );
}

/** 사이드바를 접으면 숨는 자리 */
function Fade({
  hidden,
  children,
}: {
  hidden: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={hidden}
      className={`min-w-0 transition-opacity duration-200 ease-out ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100 delay-100"
      }`}
    >
      {children}
    </div>
  );
}

function Brand({
  onNavigate,
  gradientId,
}: {
  onNavigate?: () => void;
  /** 같은 마크가 둘이면 그라데이션 id가 겹친다. */
  gradientId?: string;
}) {
  const { data: session } = useSession();
  const role = session?.user.role;

  return (
    <Link
      href={role ? ROLE_HOME[role] : "/"}
      onClick={onNavigate}
      className="flex min-w-0 items-center gap-2.5 px-1 py-1"
    >
      <LogoMark size={30} gradientId={gradientId} />
      <span className="truncate text-lg font-extrabold tracking-[-0.02em]">
        PT 매니저
      </span>
    </Link>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user.role;

  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => role && item.roles.includes(role)).map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex h-11 items-center gap-3 rounded-xl px-3 text-base font-bold transition-colors ${
              active
                ? "bg-primary-light text-ink"
                : "text-muted-foreground hover:bg-raised hover:text-ink"
            }`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** 사이드바 맨 아래 계정 줄 — 화면 모드와 로그아웃. */
function Account() {
  const { data: session } = useSession();
  const { dark, setDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!session?.user) return null;

  const email = session.user.email;
  const name = session.user.name || email?.split("@")[0] || "트레이너";

  const logout = () => {
    setBusy(true);
    void signOut({ callbackUrl: `${BASE_PATH}/login` });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="계정 및 설정"
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-raised"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-2xs font-extrabold text-canvas">
              {name.slice(0, 1)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-extrabold">{name}</span>
              <span className="truncate text-2xs text-subtle">{email}</span>
            </span>
            <Icon name="settings" size={16} className="ml-auto text-subtle" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="z-60 w-[252px] p-1.5"
        >
          <div className="flex flex-col gap-0.5 px-2.5 pb-2 pt-1.5">
            <span className="truncate text-sm font-extrabold">{name}</span>
            <span className="truncate text-2xs text-subtle">{email}</span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2">
            <span className="text-sm font-bold">다크 모드</span>
            <Switch checked={dark} onChange={setDark} label="다크 모드" />
          </div>

          <div className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              onClick={() => {
                // 팝오버와 확인 창이 겹치면 포커스를 서로 뺏는다.
                setOpen(false);
                setConfirming(true);
              }}
              className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-danger/8 hover:text-danger"
            >
              <Icon name="logout" size={16} />
              로그아웃
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={confirming}
        busy={busy}
        title="로그아웃"
        message="로그아웃하시겠습니까?"
        hint="다시 쓰려면 아이디와 비밀번호를 다시 입력해야 합니다."
        confirmLabel="로그아웃"
        onConfirm={logout}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** 켜고 끄는 스위치. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-white shadow-raised transition-[left] ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

// ── 접힘 상태 저장 ─────────────────────────

/** 이 브라우저에만 남기는 켜짐/꺼짐 값 (사이드바 접힘) */
const listeners = new Map<string, Set<() => void>>();

function subscribe(key: string, notify: () => void) {
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(notify);
  listeners.set(key, set);
  // 다른 탭에서 바꾼 경우
  window.addEventListener("storage", notify);
  return () => {
    set.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

function useStoredFlag(key: string, fallback = false) {
  const value = useSyncExternalStore(
    useCallback((notify: () => void) => subscribe(key, notify), [key]),
    useCallback(() => {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : saved === "1";
      } catch {
        // 저장소가 막힌 환경
        return fallback;
      }
    }, [key, fallback]),
    // 서버에는 저장값이 없다. 붙고 나서 진짜 값으로 다시 그린다.
    useCallback(() => fallback, [fallback]),
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // 저장이 막혀 있으면 이번 세션에만 적용된다.
      }
      listeners.get(key)?.forEach((notify) => notify());
    },
    [key],
  );

  return [value, setValue] as const;
}
