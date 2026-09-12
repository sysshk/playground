"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, type ReactNode } from "react";
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
import { useStoredFlag } from "@/lib/stored-flag";

/**
 * 로그인한 트레이너가 쓰는 앱 셸.
 *
 * 사이드바는 폭에 따라 자리만 바뀌고 내용은 같다.
 * - lg 이상: 왼쪽에 펼쳐 둔다. 접으면 아이콘만 남는 좁은 바가 된다.
 * - lg 미만: 햄버거로 여는 서랍. 폰에서는 화면을 다 덮는다 — 좁은 폭에서
 *   반쯤 걸친 서랍은 뒤가 비쳐 산만하고 누를 곳도 좁다.
 *
 * 메뉴에는 실제로 있는 화면만 넣는다. 없는 화면을 미리 걸어 두면
 * 눌렀을 때 404가 난다.
 */

/** 상단 바의 뒤로 가기 — 링크든 버튼이든 같은 모양이어야 한다. */
const BACK =
  "flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-base font-bold text-muted-foreground transition-colors hover:bg-raised hover:text-ink";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "홈", icon: "calendar" },
  { href: "/members", label: "회원", icon: "users" },
];

/**
 * 폰 상단 바에 무엇을 띄울지 경로에서 정한다.
 *
 * 화면마다 따로 알려주게 만들 수도 있지만, 경로만 보면 알 수 있는 것을
 * 굳이 배선할 이유가 없다.
 *
 * 하위 화면에서는 돌아갈 곳을 바로 띄운다.
 */
function topBar(pathname: string) {
  if (pathname === "/home") return { label: "홈" };
  if (pathname === "/members") return { label: "회원" };
  if (pathname.startsWith("/members/")) {
    return { href: "/members", label: "회원 목록" };
  }
  return { label: "PT 매니저" };
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useStoredFlag("pt.sidebar-collapsed");
  const bar = topBar(pathname);

  const loggedIn = status === "authenticated";
  const name =
    session?.user?.name || session?.user?.email?.split("@")[0] || "트레이너";

  const nav = (compact: boolean) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={compact ? item.label : undefined}
            onClick={() => setDrawerOpen(false)}
            className={`flex h-11 items-center rounded-xl text-base font-bold transition-colors ${
              compact ? "justify-center px-0" : "gap-3 px-3"
            } ${
              active
                ? "bg-primary-light text-ink"
                : "text-muted-foreground hover:bg-raised hover:text-ink"
            }`}
          >
            <Icon name={item.icon} size={18} />
            {!compact && item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (compact: boolean, onClose?: () => void) => (
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="flex flex-col gap-6">
        {/* 로고와 닫기/접기를 한 줄에 둔다. 접으면 로고는 빼고 버튼만 남긴다. */}
        <div
          className={`flex items-center ${
            compact ? "flex-col gap-2" : "justify-between gap-2"
          }`}
        >
          {!compact && (
            <Link
              href={loggedIn ? "/home" : "/"}
              onClick={() => setDrawerOpen(false)}
              className="flex min-w-0 items-center gap-2.5 px-1 py-1"
            >
              <LogoMark
                size={30}
                gradientId={onClose ? "pt-logo-gradient-drawer" : undefined}
              />
              <span className="truncate text-lg font-extrabold tracking-[-0.02em]">
                PT 매니저
              </span>
            </Link>
          )}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="메뉴 닫기"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-ink"
            >
              <Icon name="close" size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              className="hidden size-9 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-ink lg:grid"
            >
              <Icon name={collapsed ? "panelOpen" : "panelClose"} size={18} />
            </button>
          )}
        </div>

        {nav(compact)}
      </div>

      {loggedIn && (
        <AccountMenu
          compact={compact}
          name={name}
          email={session?.user?.email}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      {/* 데스크톱 — 펼치면 240px, 접으면 아이콘만 남는 76px */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r-[1.5px] border-edge bg-surface p-4 lg:block ${
          collapsed ? "w-[76px]" : "w-60"
        }`}
      >
        {sidebar(collapsed)}
      </aside>

      {/* 폰·태블릿 — 햄버거로 여는 서랍. 폰에서는 화면을 다 덮는다. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 hidden bg-black/50 sm:block"
          />
          <aside className="absolute inset-y-0 left-0 flex w-full flex-col bg-surface p-4 sm:w-[300px] sm:border-r-[1.5px] sm:border-edge">
            {sidebar(false, () => setDrawerOpen(false))}
          </aside>
        </div>
      )}

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

              {/* 하위 화면이면 돌아갈 곳을, 아니면 지금 화면 이름을 띄운다. */}
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

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6 lg:px-8">
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

/**
 * 사이드바 맨 아래의 계정 줄. 눌러서 화면 모드를 바꾸고 로그아웃한다.
 *
 * 항목이 두어 개뿐이라 화면을 따로 두지 않는다. 늘어나면 그때 옮긴다.
 */
function AccountMenu({
  name,
  email,
  compact = false,
}: {
  name: string;
  email?: string | null;
  /** 사이드바를 접었을 때 — 동그라미만 남긴다 */
  compact?: boolean;
}) {
  const { dark, setDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

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
            title={compact ? name : undefined}
            className={`flex items-center rounded-xl text-left transition-colors hover:bg-raised ${
              compact
                ? "size-11 justify-center self-center"
                : "w-full gap-2.5 px-2.5 py-2.5"
            }`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-2xs font-extrabold text-canvas">
              {name.slice(0, 1)}
            </span>
            {!compact && (
              <>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-extrabold">{name}</span>
                  <span className="truncate text-2xs text-subtle">{email}</span>
                </span>
                <Icon name="settings" size={16} className="ml-auto text-subtle" />
              </>
            )}
          </button>
        </PopoverTrigger>

        {/* 서랍(z-50) 위에 떠야 한다 */}
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="z-[60] w-[252px] p-1.5"
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
                // 확인 창과 팝오버가 겹치면 포커스가 서로를 뺏는다.
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
        icon="logout"
        onConfirm={logout}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** 켜고 끄는 스위치. 손가락으로 누르는 곳이라 넉넉하게 잡는다. */
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
