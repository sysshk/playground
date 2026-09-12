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
 * 되돌릴 수 없는 동작만 확인한다. 입력은 전부 화면 안에서 한다.
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
  const danger = tone === "danger";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <AlertDialogContent className="flex w-[calc(100vw-2rem)] max-w-md flex-col gap-5 p-6 shadow-float sm:max-w-md">
        <AlertDialogHeader className="flex flex-col place-items-start gap-2 text-left sm:place-items-start sm:text-left">
          <AlertDialogTitle className="text-lg font-extrabold tracking-[-0.02em]">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-ink">
            {message}
          </AlertDialogDescription>
          {hint && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {hint}
            </p>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="mx-0 mt-0 mb-0 flex-row justify-end gap-2.5 rounded-none border-0 bg-transparent p-0">
          <AlertDialogCancel disabled={busy} className="h-10 px-5">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            variant={danger ? "destructive" : "default"}
            disabled={busy}
            className={`h-10 px-5 ${
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
