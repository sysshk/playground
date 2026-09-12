"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/custom/form-field";
import { DatePicker } from "@/components/custom/date-picker";
import { today } from "@/lib/client";
import type { CoachingNote } from "@/lib/types";

import { Textarea } from "@/components/ui/textarea";
export interface CoachingNotePayload {
  date: string;
  pain: string | null;
  posture: string | null;
  movement: string | null;
  homework: string | null;
}

const FIELDS = [
  {
    key: "pain",
    label: "통증",
    placeholder: "통증 부위, 강도, 발생 상황",
  },
  {
    key: "posture",
    label: "자세 문제",
    placeholder: "골반, 어깨, 척추 정렬 등",
  },
  {
    key: "movement",
    label: "움직임 평가",
    placeholder: "스쿼트, 힙힌지, 보행 등 움직임 관찰",
  },
  {
    key: "homework",
    label: "숙제",
    placeholder: "다음 수업 전 수행할 운동이나 습관",
  },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function CoachingNoteForm({
  note,
  busy = false,
  serverError,
  onSubmit,
  onCancel,
}: {
  note?: CoachingNote;
  busy?: boolean;
  serverError?: string | null;
  onSubmit: (payload: CoachingNotePayload) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(() => note?.date ?? today());
  const [values, setValues] = useState<Record<FieldKey, string>>(() => ({
    pain: note?.pain ?? "",
    posture: note?.posture ?? "",
    movement: note?.movement ?? "",
    homework: note?.homework ?? "",
  }));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      setError("날짜를 선택해 주세요.");
      return;
    }

    const trimmed = Object.fromEntries(
      FIELDS.map(({ key }) => [key, values[key].trim() || null]),
    ) as Record<FieldKey, string | null>;

    if (FIELDS.every(({ key }) => trimmed[key] === null)) {
      setError("코칭 항목을 하나 이상 입력해 주세요.");
      return;
    }

    onSubmit({ date, ...trimmed });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold">
          날짜
        </span>
        <DatePicker value={date} onChange={setDate} max={today()} />
      </div>

      {FIELDS.map(({ key, label, placeholder }) => (
        <Field key={key} label={label}>
          <Textarea
            className="h-24 resize-none"
            value={values[key]}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [key]: e.target.value }));
              setError(null);
            }}
            placeholder={placeholder}
          />
        </Field>
      ))}

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <div className="mt-2 flex gap-2.5">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button type="submit" loading={busy} className="flex-1">
          {note ? "수정하기" : "저장하기"}
        </Button>
      </div>
    </form>
  );
}
