"use client";

import MemberForm, { type MemberPayload } from "../../_components/member-form";
import { Icon } from "@/components/custom/icons";
import { formatDay } from "@/lib/client";
import type { MemberDetail } from "@/lib/types";
import { IconButton } from "./section";

/** 회원 상세의 머리. */
export function MemberSummary({
  member,
  totalSessions,
  lastCompletedAt,
  editing,
  busy,
  serverError,
  onToggleEdit,
  onSubmit,
  onCancel,
}: {
  member: MemberDetail;
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
}) {
  const { remainingSessions: left } = member;
  const used = totalSessions - left;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-extrabold tracking-[-0.03em]">
              {member.name}
            </h1>
            {member.goal && (
              <span className="rounded-full bg-raised px-2.5 py-1 text-2xs font-bold text-muted-foreground">
                {member.goal}
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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
          {/* 남은 수업 */}
          <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-4">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">
                  남은 수업
                </span>
                <span
                  className={`text-xl font-extrabold leading-none tracking-[-0.03em] ${
                    left === 0 ? "text-subtle" : "text-primary"
                  }`}
                >
                  {left}
                </span>
                <span className="text-xs font-bold text-muted-foreground">회</span>
              </p>
              <p className="text-xs text-subtle">
                {totalSessions > 0
                  ? `등록 ${totalSessions}회 중 ${used}회 사용`
                  : "등록된 수업이 없습니다"}
                {lastCompletedAt && ` · 최근 수업 ${formatDay(lastCompletedAt)}`}
              </p>
              {left === 0 && totalSessions > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-bold text-danger">
                  <Icon name="alert" size={14} />
                  남은 수업을 다 썼습니다. 재등록이 필요합니다.
                </p>
              )}
            </div>
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
