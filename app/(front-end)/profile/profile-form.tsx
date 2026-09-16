/*
  내 정보 화면 — 이름·비밀번호 입력 폼. 저장하면 사이드바 이름도 바로 바뀜

  @date : 2026-09-16
*/

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Field } from "@/components/custom/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN } from "@/lib/account";
import { apiFetch, errorMessage } from "@/lib/client";

export function ProfileForm({ name: initialName }: { name: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (next || current) {
      if (!current) return setError("지금 비밀번호를 입력해 주세요.");
      if (next.length < PASSWORD_MIN) return setError(`새 비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.`);
      if (next !== confirm) return setError("새 비밀번호가 서로 다릅니다.");
    }

    setBusy(true);
    try {
      const { passwordChanged } = await apiFetch<{ passwordChanged: boolean }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), currentPassword: current, newPassword: next }),
      });
      // 세션에 담긴 이름을 DB 값으로 다시 받음
      await update();
      setCurrent("");
      setNext("");
      setConfirm("");
      toast(passwordChanged ? "이름과 비밀번호를 저장했습니다." : "저장했습니다.");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="이름" required>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoComplete="name"
          required
        />
      </Field>

      {/* 비밀번호 변경 — 비워 두면 그대로 */}
      <fieldset className="mt-2 flex flex-col gap-4 border-t border-line pt-5">
        <legend className="sr-only">비밀번호 변경</legend>
        <div className="flex flex-col gap-0.5">
          <span className="text-md font-extrabold tracking-[-0.02em]">비밀번호 변경</span>
          <span className="text-xs text-muted-foreground">바꾸지 않으려면 비워 두세요.</span>
        </div>
        <Field label="지금 비밀번호">
          <Input
            id="profile-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="새 비밀번호" hint={`${PASSWORD_MIN}자 이상`}>
          <Input
            id="profile-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="새 비밀번호 확인">
          <Input
            id="profile-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </fieldset>

      {error && <p className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">{error}</p>}

      <Button type="submit" loading={busy} className="w-full">
        저장
      </Button>
    </form>
  );
}
