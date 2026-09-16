/*
  초대 링크 화면 — 이메일·비밀번호 입력 폼. 만들고 나면 바로 로그인해 내 기록으로 감

  @date : 2026-09-15
*/

"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/custom/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isEmail, PASSWORD_MIN } from "@/lib/account";
import { apiFetch, errorMessage } from "@/lib/client";

export function InviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isEmail(email.trim())) {
      setError("이메일 주소를 정확히 입력해 주세요.");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.`);
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/invite/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        remember: "true",
        redirect: false,
      });
      if (result?.error) {
        // 계정은 만들어졌으니 로그인 화면에서 다시 시도하면 됨
        router.push("/login");
        return;
      }
      router.push("/me");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "계정을 만들지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <Field label="이메일" required hint="로그인할 때 이 이메일을 씁니다">
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          autoCapitalize="none"
          required
        />
      </Field>

      <Field label="비밀번호" required hint={`${PASSWORD_MIN}자 이상`}>
        <Input
          id="invite-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>

      <Field label="비밀번호 확인" required>
        <Input
          id="invite-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>

      {error && (
        <p className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        시작하기
      </Button>
    </form>
  );
}
