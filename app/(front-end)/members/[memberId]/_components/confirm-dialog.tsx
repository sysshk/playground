"use client";

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
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-md font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground">
            {message}
          </AlertDialogDescription>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>취소</AlertDialogCancel>
          <AlertDialogAction
            variant={tone === "danger" ? "destructive" : "default"}
            disabled={busy}
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
