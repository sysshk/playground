/*
  회원 상세·내 기록 화면 — 탭이 함께 쓰는 틀
  섹션 머리, 탭 버튼, 아이콘 버튼, 저장 후 다시 받기, 메모 칸, 숫자 글`

  @date : 2026-09-19
*/

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Icon, type IconName } from "@/components/custom/icons";
import { apiFetch, errorMessage } from "@/lib/client";
import { MEMBER_TABS, type MemberTab } from "@/lib/types";

// ── 섹션 틀 ───────────────────────────────

/** 회원 상세의 한 덩어리(운동 기록, 체중, 코칭 메모 …). 제목 옆에 보조 동작을 둠 */
export function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  /** 히어로의 버튼이 이 섹션으로 스크롤할 때 씀 */
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3.5">
      <div className="flex items-end justify-between gap-3 border-b border-line pb-2.5">
        <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-0.5">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
          {subtitle && <p className="text-xs text-subtle">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 섹션 머리의 보조 동작 */
export function SectionAction({
  icon,
  label,
  onClick,
  href,
  active = false,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  /** 주면 링크로 그림. 작성 화면이 페이지인 섹션이 씀 */
  href?: string;
  active?: boolean;
}) {
  const className = `flex h-8 shrink-0 items-center gap-1 rounded-lg text-sm font-bold transition-colors ${
    active ? "text-ink" : "text-primary hover:text-primary-dark"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon name={icon} size={16} />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={className}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

/** 목록 항목의 수정·삭제처럼 글자 없이 아이콘만 두는 동작. */
export function IconButton({
  icon,
  label,
  onClick,
  href,
  danger = false,
  active = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  /** 주면 링크로 그림 */
  href?: string;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = `grid size-9 shrink-0 place-items-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40 ${
    active
      ? "bg-primary-light text-primary-dark dark:text-primary-bright"
      : danger
        ? "text-subtle hover:bg-danger/8 hover:text-danger"
        : "text-subtle hover:bg-raised hover:text-ink"
  }`;

  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={className}>
        <Icon name={icon} size={15} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={className}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

// ── 탭 ───────────────────────────────────

const TAB_LABEL: Record<MemberTab, string> = {
  lessons: "PT",
  body: "InBody",
  diet: "식단",
  personal: "개인 운동",
  qna: "Q&A",
};

/**
 * 회원 상세·내 기록의 탭. 고른 탭은 주소(?tab=)에만 남기고 서버에 다시 묻지 않음
 * 새로고침하거나 작성 화면에서 돌아와도 그 탭이 열림
 */
export function MemberTabs({
  initial,
  badges = {},
  panels,
}: {
  initial: MemberTab;
  /** 탭 이름 옆 숫자 — 답을 기다리는 질문 수 등 */
  badges?: Partial<Record<MemberTab, number>>;
  panels: Record<MemberTab, ReactNode>;
}) {
  const [tab, setTab] = useState(initial);

  const select = (next: MemberTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "lessons") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="회원 기록"
        className="flex w-full border-b border-line"
      >
        {MEMBER_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => select(key)}
            className={`-mb-px flex h-12 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 text-base font-bold transition-colors ${
              tab === key
                ? "border-primary text-ink"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {TAB_LABEL[key]}
            {!!badges[key] && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-2xs font-extrabold text-white">
                {badges[key]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        aria-label={TAB_LABEL[tab]}
        className="flex flex-col gap-9"
      >
        {panels[tab]}
      </div>
    </div>
  );
}

/** 저장·삭제하고 화면을 서버에서 다시 받음. 섹션 안에서 바로 쓰는 동작용 */
export function useSave() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  const run = async (
    url: string,
    init: RequestInit,
    ok: string,
    fail: string,
  ) => {
    setSaving(true);
    try {
      await apiFetch(url, init);
      startRefresh(() => router.refresh());
      toast(ok);
      return true;
    } catch (e) {
      toast(errorMessage(e, fail));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { run, busy: saving || refreshing };
}


export function Memo({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap rounded-r-lg border-l-[3px] border-primary bg-primary-light/40 py-1.5 pr-3 pl-3 text-xs leading-relaxed text-ink">
      {text}
    </p>
  );
}

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** −1.2 / +0.4 / ±0 */
export function signed(value: number) {
  if (value === 0) return "±0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}
