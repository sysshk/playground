/*
  공통 — 경로 표시 (회원 ‹ 회원 상세 ‹ 식단 기록)
  앞 단계는 눌러서 돌아가고, 마지막은 지금 화면

  @date : 2026-09-19
*/

import Link from "next/link";
import { Fragment } from "react";
import { Icon } from "@/components/custom/icons";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string; // 없으면 글자만
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="현재 위치"
      className={cn("flex min-w-0 items-center gap-0.5 text-base font-bold", className)}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;

        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <Icon name="chevronLeft" size={14} className="shrink-0 text-subtle" aria-hidden />
            )}
            {item.href && !last ? (
              <Link
                href={item.href}
                className="max-w-[9rem] shrink-0 truncate rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={last ? "page" : undefined}
                className={cn(
                  "truncate px-1.5 py-1",
                  last ? "font-extrabold text-ink" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
