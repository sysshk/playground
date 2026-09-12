"use client";

import MemberForm, { type MemberPayload } from "../../_components/member-form";
import type { MemberDetail } from "@/lib/types";
import { IconButton } from "./section";

/** 회원 이름·연락처와 한눈에 볼 숫자들. 수정할 때는 같은 자리에서 폼을 펼친다. */
export function MemberSummary({
  member,
  latestWeight,
  editing,
  busy,
  serverError,
  onToggleEdit,
  onSubmit,
  onCancel,
  onDelete,
}: {
  member: MemberDetail;
  latestWeight: number | null;
  editing: boolean;
  busy: boolean;
  serverError: string | null;
  onToggleEdit: () => void;
  onSubmit: (values: MemberPayload) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">{member.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {member.phone}
            {member.goal && <> · {member.goal}</>}
          </p>
        </div>
        <div className="flex gap-1.5">
          <IconButton
            icon="pencil"
            label="회원 정보 수정"
            onClick={onToggleEdit}
            active={editing}
          />
          <IconButton icon="trash" label="회원 삭제" danger onClick={onDelete} />
        </div>
      </div>

      {editing ? (
        <div className="mt-4 rounded-xl border border-line bg-raised p-4">
          <MemberForm
            member={member}
            submitLabel="수정하기"
            busy={busy}
            serverError={serverError}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <Stat
              label="남은 수업"
              value={`${member.remainingSessions}`}
              unit="회"
              highlight={member.remainingSessions > 0}
            />
            <Stat
              label="최신 체중"
              value={latestWeight !== null ? `${latestWeight}` : "—"}
              unit={latestWeight !== null ? "kg" : ""}
            />
            <Stat label="운동 기록" value={`${member.workouts.length}`} unit="건" />
          </div>

          {member.memo && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-raised px-4 py-3 text-sm leading-relaxed">
              {member.memo}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        highlight ? "border-primary bg-primary-light" : "border-line bg-raised"
      }`}
    >
      <p
        className={`text-2xs font-semibold ${
          highlight ? "text-primary-dark" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold leading-none tracking-[-0.02em]">
        {value}
        {unit && (
          <span className="ml-1 text-2xs font-bold text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  );
}
