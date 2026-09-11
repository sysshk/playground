"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, inputClass } from "@/components/pt/ui";
import { BASE_PATH } from "@/lib/client";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_PATH}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "회원가입 중 오류가 발생했습니다.");
      } else {
        router.push("/login");
      }
    } catch {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="flex items-center gap-3 px-5 py-4">
        {/* 링크로 둔다. router.back()은 /join으로 바로 들어온 경우 사이트 밖으로 나간다. */}
        <Link
          href="/"
          aria-label="홈으로"
          className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-ink"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h2 className="text-[17px] font-bold tracking-tight">회원가입</h2>
      </div>

      <div className="flex flex-1 justify-center px-5 pb-10">
        <div className="w-full max-w-[400px]">
          <div className="flex flex-col gap-1.5 pt-3">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              트레이너 계정 만들기
            </h1>
            <p className="text-[14px] text-muted">
              회원과 운동 기록을 관리할 계정을 등록하세요.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card"
          >
            <Field label="이름">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className={inputClass}
                autoComplete="name"
              />
            </Field>

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
                placeholder="6자 이상 입력하세요"
                className={inputClass}
                autoComplete="new-password"
                required
              />
            </Field>

            <Field label="비밀번호 확인" required>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className={inputClass}
                autoComplete="new-password"
                required
              />
            </Field>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-danger">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="mt-1 w-full">
              가입하기
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-bold text-primary-dark hover:underline"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
