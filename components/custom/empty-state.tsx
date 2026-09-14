/*
  공통 — 빈 목록 안내

  @date : 2026-09-12
*/

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/custom/icons";

/** 목록이 비었을 때 보여주는 안내. 무엇을 하면 채워지는지까지 말해준다. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-5 py-9 text-center">
      <span className="mb-1 grid size-10 place-items-center rounded-xl bg-muted text-subtle">
        <Icon name={icon} size={19} />
      </span>
      <p className="text-base font-semibold">{title}</p>
      {description && (
        <p className="max-w-[320px] text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
