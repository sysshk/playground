"use client";

import { FormEvent, useState } from "react";
import { DatePicker, HourPicker } from "@/components/custom/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { today } from "@/lib/client";
import type { MemberSummary } from "@/lib/types";

export interface AppointmentPayload {
  memberId: string;
  /** YYYY-MM-DD */
  date: string;
  /** 0~23 */
  hour: number;
  memo: string | null;
}

/**
 * 일정 등록.
 *
 * 입력이 네 개뿐이라 화면을 따로 두지 않고 목록 위에서 편다. 운동 기록처럼
 * 화면을 통째로 쓰는 폼만 별도 화면으로 뺀다.
 */
export default function AppointmentForm({
  members,
  defaultDate,
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  members: MemberSummary[];
  /** 지금 보고 있는 날짜를 기본값으로 받는다 */
  defaultDate?: string;
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: AppointmentPayload) => void;
  onCancel: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState(defaultDate ?? today());
  const [hour, setHour] = useState(() => new Date().getHours() + 1);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!memberId) {
      setError("회원을 선택해 주세요.");
      return;
    }

    onSubmit({ memberId, date, hour, memo: memo.trim() || null });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-edge bg-surface p-4"
    >
      <Select
        value={memberId}
        onValueChange={(next) => {
          setMemberId(next);
          setError(null);
        }}
      >
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder="회원 선택" />
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name} · 남은 {member.remainingSessions}회
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 폰에서는 한 줄에 두 개가 안 들어간다. 좁으면 세로로 쌓는다. */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <DatePicker value={date} onChange={setDate} ariaLabel="수업 날짜" />
        <HourPicker value={hour} onChange={setHour} ariaLabel="수업 시간" />
      </div>

      <Input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 — 하체 위주, 상담 포함 등 (선택)"
        aria-label="일정 메모"
        maxLength={60}
      />

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <div className="flex gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1">
          일정 추가
        </Button>
      </div>
    </form>
  );
}
