/*
  내 정보 화면 — 이름·연락처. 평소엔 글자로 보이고, 수정을 눌러야 입력칸과 취소·저장이 나옴

  @date : 2026-09-16
*/

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Field } from "@/components/custom/form-field";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client";
import { formatPhone, validatePhone, PHONE_ERROR } from "@/lib/phone";

export function ProfileForm({
  name: savedName,
  phone: savedPhone,
  phoneRequired,
}: {
  name: string;
  phone: string;
  phoneRequired: boolean; // 회원 기록이 연결된 계정은 트레이너가 연락해야 해서 필수
}) {
  const router = useRouter();
  const { update } = useSession();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(savedName);
  const [phone, setPhone] = useState(() => formatPhone(savedPhone));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setName(savedName);
    setPhone(formatPhone(savedPhone));
    setError("");
    setEditing(true);
  };

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
    if (phone.trim() && !validatePhone(phone)) {
      setError(PHONE_ERROR);
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      // 세션에 담긴 이름을 DB 값으로 다시 받음
      await update();
      toast("저장했습니다.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">기본 정보</h2>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-bold text-primary transition-colors hover:bg-primary-light"
          >
            <Icon name="pencil" size={14} />
            수정
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="이름" required>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoComplete="name"
              autoFocus
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
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              maxLength={13}
              placeholder="010-0000-0000"
              autoComplete="tel"
              required={phoneRequired}
            />
          </Field>

          {error && <p className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              취소
            </Button>
            <Button type="submit" loading={busy} className="flex-1">
              저장
            </Button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl border border-edge bg-surface px-5 py-4 text-sm">
          <dt className="text-muted-foreground">이름</dt>
          <dd className="min-w-0 truncate font-semibold">{savedName || "없음"}</dd>
          <dt className="text-muted-foreground">연락처</dt>
          <dd className={`font-semibold tabular-nums ${savedPhone ? "" : "text-subtle"}`}>
            {savedPhone ? formatPhone(savedPhone) : "등록 안 됨"}
          </dd>
        </dl>
      )}
    </section>
  );
}
