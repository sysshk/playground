"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/custom/icons";
import { LogoMark } from "@/components/custom/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/custom/form-field";
import { SIGNUP_ENABLED } from "@/lib/config";

import { Input } from "@/components/ui/input";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        // 쿠키 만료는 app/api/auth/[...nextauth]/route.ts에서 이 값을 보고 정한다.
        remember: String(remember),
        redirect: false,
      });

      if (result?.error) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      } else {
        router.push("/home");
        router.refresh();
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-surface px-5 sm:px-8">
      {/* 밋밋하지 않게 폼 뒤로 옅은 파란 빛을 깐다. 홈의 파란 악센트와 같은 계열. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_30%,#dce9fd_0%,rgb(234_242_254/0.55)_45%,transparent_100%)]"
      />
      <header className="mx-auto flex w-full max-w-[1200px] py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 py-1.5 text-base font-semibold text-muted-foreground transition-colors hover:text-ink"
        >
          <Icon name="arrowLeft" size={17} />
          홈으로
        </Link>
      </header>

      {/* 화면 한가운데에 폼 하나만 둔다. 카드 테두리 없이 흰 바탕 위에 바로 올린다. */}
      <main className="flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-[360px]">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={48} />
            <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.025em]">
              PT 매니저에 로그인
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              트레이너 계정으로 로그인하세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Field label="아이디" required>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trainer@example.com"
                autoComplete="username"
                required
              />
            </Field>

            <Field label="비밀번호" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>

            <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              로그인 유지
            </label>

            {error && (
              <p className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              로그인
            </Button>
          </form>

          {SIGNUP_ENABLED ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link
                href="/join"
                className="font-bold text-primary-dark hover:underline"
              >
                회원가입
              </Link>
            </p>
          ) : (
            <p className="mt-6 rounded-xl bg-raised px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
              현재는 테스트 계정으로만 이용할 수 있습니다.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
