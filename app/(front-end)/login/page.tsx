"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, inputClass } from "@/components/pt/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        redirect: false,
      });

      if (result?.error) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      } else {
        router.push("/members");
        router.refresh();
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-raised">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
            </svg>
          </span>
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight">PT 매니저</h1>
            <p className="mt-1 text-[14px] text-muted">
              개인 트레이너를 위한 회원 및 운동기록 관리
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <Field label="아이디" required>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trainer@example.com"
              className={inputClass}
              autoComplete="username"
              required
            />
          </Field>

          <Field label="비밀번호" required>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </Field>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-danger">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="mt-1 w-full">
            로그인
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-muted">
          계정이 없으신가요?{" "}
          <Link href="/join" className="font-bold text-primary-dark hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
