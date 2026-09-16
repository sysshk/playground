/*
  회원 등록·수정 폼 — 회원 등록 화면과 회원 상세 머리가 함께 씀

  @date : 2026-09-12
*/

"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPhone, validatePhone, PHONE_ERROR } from "@/lib/phone";
import { Field } from "@/components/custom/form-field";
import type { Member } from "@/lib/types";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
/** 폼 입력 상태 (전부 문자열) */
interface MemberFormValues {
  name: string;
  phone: string;
  goal: string;
  remainingSessions: string;
  memo: string;
}

/** 검증을 통과해 API로 보낼 값 */
export interface MemberPayload {
  name: string;
  phone: string;
  goal: string | null;
  remainingSessions: number;
  memo: string | null;
}

function toFormValues(member?: Member): MemberFormValues {
  return {
    name: member?.name ?? "",
    phone: formatPhone(member?.phone ?? ""),
    goal: member?.goal ?? "",
    remainingSessions: String(member?.remainingSessions ?? 0),
    memo: member?.memo ?? "",
  };
}

export default function MemberForm({
  member,
  submitLabel,
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  member?: Member;
  submitLabel: string;
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (values: MemberPayload) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<MemberFormValues>(() => toFormValues(member));
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormValues, string>>>(
    {},
  );

  const set = (key: keyof MemberFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const name = values.name.trim();
    const phone = values.phone.trim();
    const sessions = Number(values.remainingSessions);

    const nextErrors: typeof errors = {};
    if (!name) nextErrors.name = "이름을 입력해 주세요.";
    if (!phone) nextErrors.phone = "연락처를 입력해 주세요.";
    else if (!validatePhone(phone)) nextErrors.phone = PHONE_ERROR;
    if (
      values.remainingSessions === "" ||
      !Number.isInteger(sessions) ||
      sessions < 0
    ) {
      nextErrors.remainingSessions = "0 이상의 숫자를 입력해 주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      name,
      phone,
      goal: values.goal.trim() || null,
      remainingSessions: sessions,
      memo: values.memo.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="이름" required error={errors.name}>
        <Input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="홍길동"
          autoFocus
        />
      </Field>

      <Field label="연락처" required error={errors.phone}>
        <Input
          value={values.phone}
          onChange={(e) => set("phone", formatPhone(e.target.value))}
          placeholder="010-1234-5678"
          inputMode="tel"
        />
      </Field>

      <Field label="목표">
        <Input
          value={values.goal}
          onChange={(e) => set("goal", e.target.value)}
          placeholder="체중 감량, 근력 향상 등"
        />
      </Field>

      <Field label="남은 수업" required error={errors.remainingSessions}>
        <Input
          value={values.remainingSessions}
          onChange={(e) => set("remainingSessions", e.target.value)}
          inputMode="numeric"
          placeholder="0"
        />
      </Field>

      <Field label="특이사항">
        <Textarea
          className="h-24 resize-none"
          value={values.memo}
          onChange={(e) => set("memo", e.target.value)}
          placeholder="컨디션, 일정, 주의사항 등"
        />
      </Field>

      {serverError && (
        <p className="text-sm text-danger">{serverError}</p>
      )}

      <div className="mt-2 flex gap-2.5">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
