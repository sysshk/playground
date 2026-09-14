/*
  공통 — 폼 칸 (라벨·필수 표시·도움말/오류)

  @date : 2026-09-12
*/

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 라벨 + 입력칸 + 도움말/오류를 한 묶음으로 둔다.
 * <label>로 감싸서 라벨 글자를 눌러도 입력칸에 포커스가 간다.
 * 버튼 여러 개(성별·목표 고르기)를 감쌀 때는 group을 켠다 — label이면 글자를 누를 때 첫 버튼이 눌린다.
 */
export function Field({
  label,
  required = false,
  hint,
  error,
  group = false,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  group?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const Wrapper = group ? "div" : "label";

  return (
    <Wrapper
      role={group ? "group" : undefined}
      aria-label={group ? label : undefined}
      className={cn("flex flex-col gap-1.5", className)}
    >
      <span className="text-sm font-semibold">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </Wrapper>
  );
}
