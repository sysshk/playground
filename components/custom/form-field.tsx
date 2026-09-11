import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 라벨 + 입력칸 + 도움말/오류를 한 묶음으로 둔다.
 * <label>로 감싸서 라벨 글자를 눌러도 입력칸에 포커스가 간다.
 */
export function Field({
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
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
    </label>
  );
}
