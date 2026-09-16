/*
  작성 화면 틀 — 수업 기록·코칭 메모·영양 계산 화면이 함께 쓴다

  @date : 2026-09-12
*/

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";

/** 회원 아래 작성 화면(운동 기록·코칭 메모·영양 계산)이 함께 쓰는 껍데기. */
export function EditorFrame({
  back,
  title,
  name,
  subtitle,
  aside,
  children,
}: {
  back: string;
  title: string;
  name?: string;
  subtitle?: string;
  /** 제목 오른쪽에 두는 보조 표시 */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <Link
        href={back}
        className="hidden w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink lg:flex"
      >
        <Icon name="arrowLeft" size={15} />
        {name ?? "회원"}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-extrabold tracking-[-0.03em]">
            {title}
            {name && (
              <span className="rounded-full bg-raised px-2.5 py-1 text-2xs font-bold text-muted-foreground">
                {name}
              </span>
            )}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {aside}
      </div>

      {children}
    </div>
  );
}

/** 없는 회원이나 기록으로 들어왔을 때 작성 화면 자리에 띄운다. */
export function EditorMissing({
  back,
  title,
  name,
  message,
}: {
  back: string;
  title: string;
  name?: string;
  message: string;
}) {
  return (
    <EditorFrame back={back} title={title} name={name}>
      <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
        <p className="text-base font-bold">{message}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={back}>회원으로 돌아가기</Link>
        </Button>
      </div>
    </EditorFrame>
  );
}
