/*
  회원 상세 화면 공통 — 섹션 틀, 섹션 머리 버튼, 아이콘 버튼

  @date : 2026-09-12
*/

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/custom/icons";

/** 회원 상세의 한 덩어리(운동 기록, 체중, 코칭 메모 …). 제목 옆에 보조 동작을 둔다. */
export function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  /** 히어로의 버튼이 이 섹션으로 스크롤할 때 쓴다. */
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
          {subtitle && (
            <p className="text-xs text-subtle">{subtitle}</p>
          )}
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
  /** 주면 링크로 그린다. 작성 화면이 페이지인 섹션이 쓴다. */
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
  /** 주면 링크로 그린다. */
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
