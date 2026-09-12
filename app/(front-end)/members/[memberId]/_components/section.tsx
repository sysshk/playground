import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/custom/icons";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card id={id} className="scroll-mt-20 gap-4 rounded-2xl [--card-spacing:--spacing(5)]">
      <CardHeader>
        <CardTitle className="text-md font-bold tracking-tight">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** 섹션 머리의 보조 동작. 옆의 아이콘 버튼과 같은 높이·무게로 맞춘다. */
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
  const className = `flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
    active
      ? "bg-raised text-ink"
      : "text-muted-foreground hover:bg-raised hover:text-ink"
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
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  /** 주면 링크로 그린다. */
  href?: string;
  danger?: boolean;
  active?: boolean;
}) {
  const className = `grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
    active
      ? "bg-primary-light text-primary-dark"
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
      title={label}
      aria-label={label}
      className={className}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
