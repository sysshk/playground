/*
  내 정보 화면 — 이름·연락처 입력 폼. 저장하거나 취소하면 역할에 맞는 첫 화면으로 돌아감

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
import { apiFetch, errorMessage } from "@/lib/client";
import { ROLE_HOME, toRole } from "@/lib/types";

export function ProfileForm({
  name: initialName,
  phone: initialPhone,
  phoneRequired,
}: {
  name: string;
  phone: string;
  phoneRequired: boolean; // 회원 기록이 연결된 계정은 트레이너가 연락해야 해서 필수
}) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const home = ROLE_HOME[toRole(session?.user?.role)];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (phoneRequired && !phone.trim()) {
      setError("연락처를 입력해 주세요.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });
      // 세션에 담긴 이름을 DB 값으로 다시 받음
      await update();
      toast("저장했습니다.");
      router.push(home);
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

      <Field
        label="연락처"
        required={phoneRequired}
        hint={phoneRequired ? "트레이너에게도 이 번호가 보입니다" : undefined}
      >
        <Input
          id="profile-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          placeholder="010-0000-0000"
          autoComplete="tel"
          required={phoneRequired}
        />
      </Field>

      {error && <p className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">{error}</p>}

      {/* 뒤로 가기 대신 첫 화면으로. 주소로 바로 들어왔으면 뒤가 사이트 밖일 수 있음 */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.push(home)}
        >
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1">
          저장
        </Button>
      </div>
    </form>
  );
}
