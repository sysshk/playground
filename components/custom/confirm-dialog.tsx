"use client";

import { Icon, type IconName } from "@/components/custom/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * 되돌릴 수 없는 동작(삭제, 수업 차감)만 확인한다. 입력은 전부 화면 안에서 한다.
 * 처리 중에는 닫히지 않게 막는다 — 요청이 끝난 뒤 부모가 open을 내린다.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  hint,
  confirmLabel = "삭제하기",
  tone = "danger",
  icon,
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
  /** 무슨 동작인지 한눈에 알리는 아이콘. 없으면 성격에 맞는 기본값을 쓴다. */
  icon?: IconName;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const danger = tone === "danger";
  const mark: IconName = icon ?? (danger ? "alert" : "check");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader className="place-items-start gap-3 text-left">
          <span
            className={`grid size-10 place-items-center rounded-xl ${
              danger ? "bg-danger/10 text-danger" : "bg-primary-light text-primary"
            }`}
          >
            <Icon name={mark} size={20} />
          </span>

          <div className="flex flex-col gap-1.5 text-left">
            <AlertDialogTitle className="text-lg font-extrabold tracking-[-0.02em]">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed text-foreground">
              {message}
            </AlertDialogDescription>
            {hint && (
              <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
            )}
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} className="h-11 flex-1 sm:flex-none sm:px-5">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            variant={danger ? "destructive" : "default"}
            disabled={busy}
            className={`h-11 flex-1 sm:flex-none sm:px-5 ${
              danger ? "bg-danger text-white hover:bg-danger-dark" : ""
            }`}
            onClick={(e) => {
              // 기본 동작은 즉시 닫는 것이라, 요청이 끝날 때까지 열어 둔다.
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
