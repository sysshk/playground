"use client";

import { ReactNode, useEffect, useId } from "react";

// ── Modal ─────────────────────────────────────

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  // 열려 있는 동안 Esc로 닫고 배경 스크롤을 막는다.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col rounded-t-2xl bg-white shadow-float sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-[16px] font-bold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate-100 hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm ───────────────────────────────────

export function ConfirmDialog({
  open,
  title,
  message,
  hint,
  confirmLabel = "삭제하기",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  hint?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-[14px] leading-relaxed text-ink">{message}</p>
      {hint && (
        <p className="mt-2 text-[13px] text-muted">{hint}</p>
      )}
      <div className="mt-6 flex gap-2.5">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          loading={busy}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ── Button ────────────────────────────────────

type ButtonVariant = "primary" | "ghost" | "danger" | "outline";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark shadow-sm",
  outline:
    "border border-primary text-primary-dark bg-white hover:bg-primary-light",
  ghost:
    "border border-line bg-white text-ink hover:bg-slate-50",
  danger: "bg-danger text-white hover:bg-red-600 shadow-sm",
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={loading || rest.disabled}
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_STYLES[variant]} ${className}`}
    >
      {loading ? (
        <span className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
      ) : (
        children
      )}
    </button>
  );
}

// ── Form field ────────────────────────────────

export function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[12px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-light";

// ── Section ───────────────────────────────────

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-muted">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-5 py-9 text-center">
      <span className="text-[28px]" aria-hidden="true">
        {icon}
      </span>
      <p className="text-[14px] font-semibold">{title}</p>
      {description && (
        <p className="max-w-[320px] text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── Toast ─────────────────────────────────────

export function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[88px] z-[60] mx-auto max-w-[420px] rounded-xl bg-slate-900 px-4 py-3 text-center text-[13px] font-semibold text-white shadow-float sm:bottom-6"
    >
      {message}
    </div>
  );
}
