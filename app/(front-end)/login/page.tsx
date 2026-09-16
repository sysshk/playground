/*
  로그인 화면

  @date : 2025-12-10
*/

"use client";

import { getSession, signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Icon } from "@/components/custom/icons";
import { LogoMark } from "@/components/custom/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/custom/form-field";
import { SIGNUP_ENABLED } from "@/lib/config";
import { ROLE_HOME, toRole } from "@/lib/types";

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
        email: email.trim().toLowerCase(),
        password,
        // 쿠키 만료는 app/api/auth/[...nextauth]/route.ts에서 이 값을 보고 정함
        remember: String(remember),
        redirect: false,
      });

      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        // 역할에 맞는 첫 화면으로 바로 보냄. 회원이 트레이너 화면을 거쳐 가지 않게
        const session = await getSession();
        router.replace(ROLE_HOME[toRole(session?.user?.role)]);
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_30%,#dce9fd_0%,rgb(234_242_254/0.55)_45%,transparent_100%)] dark:bg-[radial-gradient(70%_55%_at_50%_30%,rgb(59_130_246/0.18)_0%,rgb(59_130_246/0.06)_45%,transparent_100%)]"
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

      <main className="flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-[360px]">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={48} />
            <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.025em]">
              PT 매니저에 로그인
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              가입한 이메일로 로그인하세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Field label="이메일" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="username"
                autoCapitalize="none"
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

            {/* 구글 로그인 — 연결 전이라 안내만 띄움 */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-line" />
              또는
              <span className="h-px flex-1 bg-line" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full font-semibold"
              onClick={() => toast.info("구글 로그인은 준비 중입니다. 지금은 이메일로 이용해 주세요.")}
            >
              <GoogleMark />
              구글로 계속하기
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

/** 구글 G 로고 (브랜드 가이드 색상) */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
