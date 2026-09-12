"use client";

import MemberForm, { type MemberPayload } from "../../_components/member-form";
import { Icon } from "@/components/custom/icons";
import { formatDay } from "@/lib/client";
import type { MemberDetail } from "@/lib/types";
import { IconButton } from "./section";

/**
 * 회원 상세의 머리.
 *
 * 이 화면에서 제일 먼저 봐야 하는 숫자는 "남은 수업"이다. 그래서 다른
 * 카드와 같은 흰 카드에 섞지 않고 먹색 블록으로 따로 세운다. 수업 직후에
 * 누르는 동작(운동 기록·직접 차감)도 여기 붙여서, 아래까지 내려가지
 * 않아도 손에 닿게 한다.
 */
export function MemberSummary({
  member,
  latestWeight,
  totalSessions,
  lastCompletedAt,
  editing,
  busy,
  serverError,
  onToggleEdit,
  onSubmit,
  onCancel,
  onDelete,
  onRecordWorkout,
  onDeductSession,
}: {
  member: MemberDetail;
  latestWeight: number | null;
  /** 등록한 전체 횟수 (남은 것 + 쓴 것) */
  totalSessions: number;
  /** 가장 최근 차감 시각. 없으면 null */
  lastCompletedAt: string | null;
  editing: boolean;
  busy: boolean;
  serverError: string | null;
  onToggleEdit: () => void;
  onSubmit: (values: MemberPayload) => void;
  onCancel: () => void;
  onDelete: () => void;
  onRecordWorkout: () => void;
  onDeductSession: () => void;
}) {
  const { remainingSessions: left } = member;
  const used = totalSessions - left;
  const percent = totalSessions === 0 ? 0 : Math.round((used / totalSessions) * 100);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-[-0.03em]">
              {member.name}
            </h1>
            {member.goal && (
              <span className="rounded-full bg-raised px-2.5 py-1 text-2xs font-bold text-muted-foreground">
                {member.goal}
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Icon name="phone" size={14} />
            {member.phone}
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
        <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-5">
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
          {/* 남은 수업 — 이 화면의 주인공. 테마와 상관없이 늘 어둡다. */}
          <div className="flex flex-col gap-4 rounded-2xl bg-hero p-5 text-hero-foreground">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-baseline gap-2.5">
                <span className="text-2xs font-extrabold uppercase tracking-widest text-white/45">
                  남은 수업
                </span>
                <span className="text-5xl font-extrabold leading-none tracking-[-0.05em] text-primary-bright">
                  {left}
                </span>
                <span className="text-md font-bold text-white/60">회</span>
              </p>

              <div className="flex w-full gap-2.5 sm:w-auto">
                <button
                  type="button"
                  onClick={onDeductSession}
                  className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 text-md font-bold transition-colors hover:bg-white/18 sm:flex-none"
                >
                  <Icon name="minus" size={17} />
                  직접 차감
                </button>
                <button
                  type="button"
                  onClick={onRecordWorkout}
                  className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-md font-extrabold text-white transition-colors hover:bg-primary-dark sm:flex-none"
                >
                  <Icon name="plus" size={18} />
                  운동 기록
                </button>
              </div>
            </div>

            {/* 막대는 블록 전체를 가로지른다. 왼쪽 반만 차지하면 잘린 것처럼 보인다. */}
            <div className="flex flex-col gap-2">
              <div
                className="h-[7px] overflow-hidden rounded-full bg-white/12"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="수업 사용 정도"
              >
                <div
                  className="h-full rounded-full bg-primary-bright"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="text-xs font-medium text-white/45">
                {totalSessions > 0
                  ? `등록 ${totalSessions}회 중 ${used}회 사용`
                  : "등록된 수업이 없습니다"}
                {lastCompletedAt && ` · 최근 수업 ${formatDay(lastCompletedAt)}`}
              </p>

              {left === 0 && totalSessions > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-bold text-primary-bright">
                  <Icon name="alert" size={14} />
                  남은 수업을 다 썼습니다. 재등록이 필요합니다.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="최신 체중"
              value={latestWeight !== null ? `${latestWeight}` : "—"}
              unit={latestWeight !== null ? "kg" : ""}
            />
            <Stat label="운동 기록" value={`${member.workouts.length}`} unit="건" />
            <Stat label="총 등록" value={`${totalSessions}`} unit="회" />
          </div>

          {member.memo && (
            <p className="whitespace-pre-wrap rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-3.5 text-sm leading-relaxed">
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
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-3.5">
      <p className="text-2xs font-extrabold uppercase tracking-widest text-subtle">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold leading-none tracking-[-0.03em]">
        {value}
        {unit && (
          <span className="ml-1 text-2xs font-bold text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  );
}
