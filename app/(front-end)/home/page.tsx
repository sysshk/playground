"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AppointmentForm, {
  type AppointmentPayload,
} from "./_components/appointment-form";
import { ScheduleList } from "./_components/schedule-list";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage, today } from "@/lib/client";
import type { Appointment, MemberStats, MemberSummary } from "@/lib/types";

/**
 * 홈.
 *
 * 하루를 시작할 때 보는 화면이다. "오늘 누가 오는지"가 전부라서 일정이
 * 맨 위에 오고, 지표는 그 아래에 둔다. 회원을 찾는 일은 회원 탭이 맡는다.
 */

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** "9월 12일 (토)" — 올해가 아니면 연도를 붙인다. */
function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const year = y === new Date().getFullYear() ? "" : `${y}년 `;
  return `${year}${m}월 ${d}일 (${WEEK[date.getDay()]})`;
}

function shiftDay(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type Pending =
  | { type: "complete"; appointment: Appointment }
  | { type: "delete"; appointment: Appointment }
  | null;

export default function HomePage() {
  const { data: session } = useSession();
  const trainerName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "트레이너";

  const [date, setDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadDay = useCallback(async (key: string) => {
    try {
      const data = await apiFetch<{ appointments: Appointment[] }>(
        `/api/appointments?from=${key}`,
      );
      setAppointments(data.appointments);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "일정을 불러오지 못했습니다."));
    }
  }, []);

  // 회원과 지표는 날짜와 무관하니 한 번만 받는다.
  useEffect(() => {
    let alive = true;
    apiFetch<{ members: MemberSummary[]; stats: MemberStats }>(
      "/api/members",
    ).then(
      (data) => {
        if (!alive) return;
        setMembers(data.members);
        setStats(data.stats);
      },
      () => {
        // 지표를 못 받아도 일정은 보여야 한다.
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setAppointments(null);
    apiFetch<{ appointments: Appointment[] }>(`/api/appointments?from=${date}`).then(
      (data) => {
        if (alive) setAppointments(data.appointments);
      },
      (e) => {
        if (alive) setLoadError(errorMessage(e, "일정을 불러오지 못했습니다."));
      },
    );
    return () => {
      alive = false;
    };
  }, [date]);

  const left = useMemo(
    () => (appointments ?? []).filter((a) => a.completionId === null).length,
    [appointments],
  );

  const handleAdd = async (payload: AppointmentPayload) => {
    setBusy(true);
    setFormError(null);
    try {
      const [y, m, d] = payload.date.split("-").map(Number);
      const startsAt = new Date(y, m - 1, d, payload.hour).toISOString();
      await apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          memberId: payload.memberId,
          startsAt,
          memo: payload.memo,
        }),
      });
      toast("일정을 추가했습니다.");
      setFormOpen(false);
      // 다른 날짜로 잡았으면 그날로 옮겨가 방금 넣은 것을 보여준다.
      if (payload.date !== date) setDate(payload.date);
      else await loadDay(date);
    } catch (e) {
      setFormError(errorMessage(e, "일정 추가에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const { appointment } = pending;
    setBusy(true);
    try {
      if (pending.type === "complete") {
        await apiFetch(`/api/appointments/${appointment.id}/complete`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        toast(`${appointment.member.name} 회원의 수업 1회를 차감했습니다.`);
      } else {
        await apiFetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
        toast("일정을 삭제했습니다.");
      }
      await loadDay(date);
      setPending(null);
    } catch (e) {
      toast(errorMessage(e, "처리에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const isToday = date === today();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">
            오늘도 수고하셨어요, {trainerName} 님
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {appointments === null
              ? "일정을 불러오는 중입니다"
              : left > 0
                ? `${isToday ? "오늘" : dayLabel(date)} 남은 수업 ${left}건`
                : `${isToday ? "오늘" : dayLabel(date)} 남은 수업이 없습니다`}
          </p>
        </div>
        {!formOpen && (
          <Button
            onClick={() => {
              setFormError(null);
              setFormOpen(true);
            }}
          >
            <Icon name="plus" size={16} />
            일정 추가
          </Button>
        )}
      </div>

      {formOpen && (
        <AppointmentForm
          members={members}
          defaultDate={date}
          busy={busy}
          serverError={formError}
          onSubmit={handleAdd}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {/* ── 일정 ───────────────────────────── */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">
            {dayLabel(date)}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="이전 날"
              onClick={() => setDate(shiftDay(date, -1))}
            >
              <Icon name="chevronLeft" size={17} />
            </Button>
            {!isToday && (
              <Button variant="secondary" size="sm" onClick={() => setDate(today())}>
                오늘
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="다음 날"
              onClick={() => setDate(shiftDay(date, 1))}
            >
              <Icon name="chevronRight" size={17} />
            </Button>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-6 text-center">
            <p className="text-base font-bold">{loadError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void loadDay(date)}
            >
              다시 시도
            </Button>
          </div>
        ) : appointments === null ? (
          <div className="flex flex-col gap-2.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface"
              />
            ))}
          </div>
        ) : (
          <ScheduleList
            appointments={appointments}
            busy={busy}
            onComplete={(appointment) => setPending({ type: "complete", appointment })}
            onDelete={(appointment) => setPending({ type: "delete", appointment })}
          />
        )}
      </section>

      {/* ── 지표 ───────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Kpi label="전체 회원" value={stats.total} unit="명" hint="등록된 회원" />
          <Kpi
            label="최근 7일 수업"
            value={stats.recentCompletions}
            unit="회"
            hint="완료 처리한 수업"
          />
          <Kpi
            label="수업 소진 임박"
            value={stats.runningLow}
            unit="명"
            hint="3회 이하 남음"
            warn={stats.runningLow > 0}
          />
          <Kpi
            label="최근 7일 기록"
            value={stats.recentWorkouts}
            unit="건"
            hint="작성한 운동 기록"
          />
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        {...confirmCopy(pending)}
      />
    </div>
  );
}

function confirmCopy(pending: Pending) {
  if (pending?.type === "complete") {
    return {
      title: "수업 완료",
      message: `${pending.appointment.member.name} 회원의 수업을 끝낼까요?`,
      hint: "남은 수업이 1회 줄고 이력에 남습니다. 운동을 기록하려면 운동 기록을 눌러 저장하세요.",
      confirmLabel: "완료하기",
      tone: "primary" as const,
      icon: "check" as const,
    };
  }
  if (pending?.type === "delete") {
    return {
      title: "일정 삭제",
      message: `${pending.appointment.member.name} 회원의 일정을 삭제할까요?`,
      hint: "잡아둔 약속만 지워집니다. 이미 차감한 수업은 그대로 남습니다.",
    };
  }
  return { title: "", message: "" };
}

function Kpi({
  label,
  value,
  unit,
  hint,
  warn = false,
}: {
  label: string;
  value: number;
  unit: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-4">
      <p className="text-2xs font-extrabold uppercase tracking-widest text-subtle">
        {label}
      </p>
      <p className="mt-2 flex items-end gap-1">
        <span
          className={`text-3xl font-extrabold leading-none tracking-[-0.03em] ${
            warn ? "text-primary" : ""
          }`}
        >
          {value}
        </span>
        <span className="pb-0.5 text-xs font-bold text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-1.5 text-2xs text-subtle">{hint}</p>
    </div>
  );
}
