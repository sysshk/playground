/*
  코칭 메모 작성·수정 화면 — 입력 폼과 저장

  @date : 2026-09-12
*/

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/custom/date-picker";
import { Field } from "@/components/custom/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, errorMessage, formatDate, today } from "@/lib/client";
import type { CoachingNote } from "@/types";
import { EditorPage } from "@/components/custom/editor-page";

const FIELDS = [
  { key: "pain", label: "통증", placeholder: "통증 부위, 강도, 발생 상황" },
  { key: "posture", label: "자세 문제", placeholder: "골반, 어깨, 척추 정렬 등" },
  { key: "movement", label: "움직임 평가", placeholder: "스쿼트, 힙힌지, 보행 등 움직임 관찰" },
  { key: "homework", label: "숙제", placeholder: "다음 수업 전 수행할 운동이나 습관" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function NoteEditor({
  member,
  note,
}: {
  member: { id: string; name: string };
  /** 주면 수정, 없으면 새 메모 */
  note: CoachingNote | null;
}) {
  const router = useRouter();
  const back = `/members/${member.id}`;

  const [date, setDate] = useState(() => note?.date ?? today());
  const [values, setValues] = useState<Record<FieldKey, string>>(() => ({
    pain: note?.pain ?? "",
    posture: note?.posture ?? "",
    movement: note?.movement ?? "",
    homework: note?.homework ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

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

    setBusy(true);
    setError(null);
    try {
      await apiFetch(
        note
          ? `/api/members/${member.id}/notes/${note.id}`
          : `/api/members/${member.id}/notes`,
        { method: note ? "PATCH" : "POST", body: JSON.stringify({ date, ...trimmed }) },
      );
      toast(note ? "코칭 메모를 수정했습니다." : "코칭 메모를 저장했습니다.");
      router.replace(back);
    } catch (e) {
      setError(errorMessage(e, "코칭 메모 저장에 실패했습니다."));
      setBusy(false);
    }
  };

  return (
    <EditorPage
      back={back}
      title={note ? "코칭 메모 수정" : "코칭 메모"}
      name={member.name}
      subtitle={
        note
          ? `${formatDate(note.date)} 메모를 고칩니다.`
          : "통증, 자세와 움직임 평가를 다음 수업에 활용하세요."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 whitespace-nowrap text-sm font-semibold">날짜</span>
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

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(back)}
            className="flex-1"
          >
            취소
          </Button>
          <Button type="submit" loading={busy} className="flex-1">
            {note ? "수정하기" : "저장하기"}
          </Button>
        </div>
      </form>
    </EditorPage>
  );
}
