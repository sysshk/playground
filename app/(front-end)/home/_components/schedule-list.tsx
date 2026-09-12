"use client";

import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { formatHour } from "@/lib/client";
import type { Appointment } from "@/lib/types";

/**
 * 하루치 일정.
 *
 * 끝난 수업도 지우지 않고 흐리게 남긴다. "오늘 몇 건 했나"가 바로 보여야 하고,
 * 잘못 눌렀을 때 되돌릴 자리도 여기여야 한다.
 */
export function ScheduleList({
  appointments,
  busy,
  onComplete,
  onDelete,
}: {
  appointments: Appointment[];
  busy: boolean;
  onComplete: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="잡아둔 수업이 없습니다"
        description="일정 추가를 눌러 오늘 만날 회원을 등록해 보세요."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {appointments.map((appointment) => {
        const done = appointment.completionId !== null;
        const { member } = appointment;

        return (
          <li
            key={appointment.id}
            className={`flex flex-col gap-3 rounded-2xl border-[1.5px] bg-surface p-4 sm:flex-row sm:items-center sm:gap-4 ${
              done ? "border-line" : "border-edge"
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span
                className={`w-[68px] shrink-0 text-md font-extrabold tabular-nums ${
                  done ? "text-subtle" : "text-ink"
                }`}
              >
                {formatHour(appointment.startsAt)}
              </span>

              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/members/${member.id}`}
                    className={`truncate text-base font-extrabold tracking-[-0.02em] transition-colors hover:text-primary ${
                      done ? "text-muted-foreground" : ""
                    }`}
                  >
                    {member.name}
                  </Link>
                  {done ? (
                    <span className="rounded-full bg-raised px-2 py-0.5 text-2xs font-bold text-muted-foreground">
                      완료
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                        member.remainingSessions === 0
                          ? "bg-danger/10 text-danger"
                          : "bg-primary-light text-primary-dark"
                      }`}
                    >
                      남은 {member.remainingSessions}회
                    </span>
                  )}
                </span>
                {appointment.memo && (
                  <span className="truncate text-xs text-subtle">
                    {appointment.memo}
                  </span>
                )}
              </span>
            </div>

            {!done && (
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" className="flex-1 sm:flex-none">
                  <Link
                    href={`/members/${member.id}/workouts/new?appointment=${appointment.id}`}
                  >
                    <Icon name="plus" size={15} />
                    운동 기록
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onComplete(appointment)}
                  className="flex-1 sm:flex-none"
                >
                  <Icon name="check" size={15} />
                  기록 없이 완료
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="일정 삭제"
                  title="일정 삭제"
                  disabled={busy}
                  onClick={() => onDelete(appointment)}
                  className="text-subtle hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
