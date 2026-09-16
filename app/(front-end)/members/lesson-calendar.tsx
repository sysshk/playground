/*
  회원 목록 화면 — 수업 달력 (날짜마다 수업한 회원과 시각, 수업 예약·수정 창)
  날짜는 한국 시각으로 가름. 보는 기기의 시간대에 따라 밤 수업이 다음 날로 넘어가지 않게 함

  @date : 2026-09-14
*/

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { DatePicker } from "@/components/custom/date-picker";
import { Field } from "@/components/custom/form-field";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, errorMessage } from "@/lib/client";
import { holidayName } from "@/lib/holidays";
import { kstDay, kstIso, kstMinuteOfDay, kstTimeLabel, shiftMonth } from "@/lib/kst";
import type { CalendarAppointment, MemberSummary, MonthCalendar } from "@/lib/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 예약끼리 비워 둘 간격 */
const GAP = 60 * 60 * 1000;

/** 예약은 30분 단위로 잡음. 자정부터 분으로 센 칸들 (0, 30, … 1410) */
const SLOTS = Array.from({ length: 48 }, (_, i) => i * 30);

type MemberOption = Pick<MemberSummary, "id" | "name" | "remainingSessions">;

/** 달력 칸에 한 줄로 놓이는 수업 */
interface Entry {
  /** done: 완료, booked: 예약, missed: 시간이 지났는데 기록이 없는 예약 */
  kind: "done" | "booked" | "missed";
  id: string;
  at: string;
  memberName: string;
  /** 예약이면 원래 예약 — 누르면 수정 창에 채움 */
  appointment?: CalendarAppointment;
}

function toEntries(calendar: MonthCalendar, now: number): Entry[] {
  const done: Entry[] = calendar.sessions.map((s) => ({
    kind: "done",
    id: s.id,
    at: s.completedAt,
    memberName: s.memberName,
  }));
  const booked: Entry[] = calendar.appointments.map((a) => ({
    kind: new Date(a.startsAt).getTime() < now ? "missed" : "booked",
    id: a.id,
    at: a.startsAt,
    memberName: a.memberName,
    appointment: a,
  }));
  return [...done, ...booked].sort((a, b) => a.at.localeCompare(b.at));
}

const CHIP: Record<Entry["kind"], string> = {
  done: "bg-raised text-ink",
  booked: "border border-dashed border-primary/60 text-primary-dark dark:text-primary-bright",
  missed: "border border-dashed border-warning/70 text-warning",
};

const LEGEND: [Entry["kind"], string][] = [
  ["done", "완료"],
  ["booked", "예약"],
  ["missed", "확인 필요"],
];

/** 열려 있는 예약 창. appointment가 있으면 수정 창임 */
type BookingDialog = { day: string; appointment?: CalendarAppointment } | null;

export function LessonCalendar({
  initialMonth,
  initial,
  members,
}: {
  /** 이번 달 (서버가 한국 시각으로 정함) */
  initialMonth: string;
  initial: MonthCalendar;
  /** 예약할 때 고르는 회원 */
  members: MemberOption[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  const today = kstDay();
  const [month, setMonth] = useState(initialMonth);
  const [loaded, setLoaded] = useState<Record<string, MonthCalendar>>({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<BookingDialog>(null);

  // 이번 달은 서버가 새로 그릴 때마다 최신임. 다른 달만 따로 받아 둠
  const calendar = month === initialMonth ? initial : loaded[month];

  const entries = useMemo(
    () => (calendar ? toEntries(calendar, Date.now()) : []),
    [calendar],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const day = kstDay(e.at);
      map.set(day, [...(map.get(day) ?? []), e]);
    }
    return map;
  }, [entries]);

  const loadMonth = async (target: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<MonthCalendar>(`/api/calendar?month=${target}`);
      setLoaded((prev) => ({ ...prev, [target]: data }));
    } catch (e) {
      toast(errorMessage(e, "수업 달력을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  const goTo = (next: string) => {
    setMonth(next);
    if (next !== initialMonth && !loaded[next]) void loadMonth(next);
  };

  /** 그날(한국 날짜) 이미 잡힌 수업·예약. 받아 둔 달만 알 수 있음 */
  const occupiedOn = (day: string) => {
    const target = day.slice(0, 7);
    const cal = target === initialMonth ? initial : loaded[target];
    if (!cal) return [];
    return [
      ...cal.sessions.map((s) => ({ id: s.id, at: s.completedAt })),
      ...cal.appointments.map((a) => ({ id: a.id, at: a.startsAt })),
    ].filter((x) => kstDay(x.at) === day);
  };

  /** 예약을 저장·취소한 뒤 — 그날이 있는 달로 옮겨 가서 다시 받음 */
  const afterSave = (day: string) => {
    setDialog(null);
    const target = day.slice(0, 7);
    // 수정으로 달이 바뀌었을 수 있으니 받아 둔 다른 달도 버림
    setLoaded({});
    setMonth(target);
    startRefresh(() => router.refresh());
    if (target !== initialMonth) void loadMonth(target);
  };

  const [year, mon] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const doneCount = entries.filter((e) => e.kind === "done").length;
  const bookedCount = entries.length - doneCount;

  return (
    <section className="flex flex-col gap-3">
      {/* 머리 */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">
          {year}년 {mon}월 수업
          <span className="ml-2 text-sm font-semibold text-subtle">
            {doneCount}회{bookedCount > 0 && ` · 예약 ${bookedCount}`}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDialog({ day: today })}
            className="mr-1 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-primary transition-colors hover:bg-raised"
          >
            <Icon name="plus" size={16} />
            수업 예약
          </button>
          {month !== initialMonth && (
            <button
              type="button"
              onClick={() => goTo(initialMonth)}
              className="h-9 rounded-lg px-3 text-sm font-bold text-primary transition-colors hover:bg-raised"
            >
              이번 달
            </button>
          )}
          <button
            type="button"
            onClick={() => goTo(shiftMonth(month, -1))}
            aria-label="지난달"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            type="button"
            onClick={() => goTo(shiftMonth(month, 1))}
            aria-label="다음 달"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex gap-3 text-2xs font-semibold text-subtle">
        {LEGEND.map(([kind, label]) => (
          <span key={kind} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-3.5 rounded-sm ${CHIP[kind]}`} />
            {label}
          </span>
        ))}
      </div>

      {/* 달력 */}
      <div
        className={`grid grid-cols-7 transition-opacity ${loading || refreshing ? "opacity-50" : ""}`}
        aria-busy={loading || refreshing}
      >
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={`pb-1.5 text-center text-2xs font-semibold ${
              i === 0 ? "text-danger" : "text-subtle"
            }`}
          >
            {w}
          </span>
        ))}

        {cells.map((date, i) => {
          const edge = `border-t border-line ${i % 7 === 0 ? "" : "border-l"}`;
          if (date === null) return <span key={`blank-${i}`} className={edge} />;

          const day = `${month}-${String(date).padStart(2, "0")}`;
          const holiday = holidayName(day);

          return (
            <div
              key={day}
              className={`${edge} flex min-h-14 min-w-0 flex-col gap-0.5 p-1 sm:min-h-22 sm:p-1.5`}
            >
              <span className="mb-0.5 flex min-w-0 flex-wrap items-center gap-x-1">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${
                    day === today
                      ? "bg-primary text-primary-foreground"
                      : i % 7 === 0 || holiday
                        ? "text-danger"
                        : "text-muted-foreground"
                  }`}
                >
                  {date}
                </span>
                {holiday && (
                  <span className="break-keep text-2xs font-semibold leading-tight text-danger">
                    {holiday}
                  </span>
                )}
              </span>
              {(byDay.get(day) ?? []).map((e) => {
                const chip = (
                  <>
                    <span className="break-keep">{e.memberName}</span>
                    <span className="whitespace-nowrap tabular-nums opacity-75">{kstTimeLabel(e.at)}</span>
                  </>
                );
                const className = `flex min-w-0 flex-wrap items-baseline gap-x-1 rounded px-1 py-px text-2xs font-semibold leading-tight ${CHIP[e.kind]}`;
                const title = `${e.memberName} ${kstTimeLabel(e.at)}`;

                return e.appointment ? (
                  <button
                    key={e.id}
                    type="button"
                    title={`${title} — 눌러서 수정`}
                    onClick={() => setDialog({ day, appointment: e.appointment })}
                    className={`${className} text-left transition-opacity hover:opacity-75`}
                  >
                    {chip}
                  </button>
                ) : (
                  <span key={e.id} title={title} className={className}>
                    {chip}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 수업 예약·수정 창 */}
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent dismissOnOutsideClick>
          <DialogHeader>
            <DialogTitle>{dialog?.appointment ? "예약 수정" : "수업 예약"}</DialogTitle>
            <DialogDescription>
              예약은 남은 수업을 차감하지 않습니다. 그날 수업을 기록하면 1회 차감되고 예약은 완료로 바뀝니다.
            </DialogDescription>
          </DialogHeader>
          {dialog && (
            <BookingForm
              key={dialog.appointment?.id ?? "new"}
              initialDay={dialog.day}
              appointment={dialog.appointment}
              today={today}
              members={members}
              occupiedOn={occupiedOn}
              onSaved={afterSave}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** 수업 예약 입력 (창 안). appointment가 있으면 수정하고 취소할 수 있음 */
function BookingForm({
  initialDay,
  appointment,
  today,
  members,
  occupiedOn,
  onSaved,
}: {
  initialDay: string;
  appointment?: CalendarAppointment;
  today: string;
  members: MemberOption[];
  /** 그날 이미 잡힌 수업·예약 */
  occupiedOn: (day: string) => { id: string; at: string }[];
  /** 저장·취소한 예약의 날짜 */
  onSaved: (day: string) => void;
}) {
  const slotTime = (d: string, minutes: number) =>
    new Date(kstIso(d, Math.floor(minutes / 60), minutes % 60)).getTime();

  /** 고를 수 없는 칸 — 오늘 이미 지난 칸, 다른 수업·예약과 1시간이 안 벌어지는 칸 */
  const blockedSlots = (d: string) => {
    const taken = occupiedOn(d)
      .filter((x) => x.id !== appointment?.id)
      .map((x) => new Date(x.at).getTime());
    const nowSlot = Math.floor(kstMinuteOfDay(new Date()) / 30) * 30;
    return SLOTS.filter(
      (s) =>
        (d === today && s < nowSlot) ||
        taken.some((t) => Math.abs(slotTime(d, s) - t) < GAP),
    );
  };

  /** preferred에서 가장 가까운 빈 칸 */
  const nearestFree = (d: string, preferred: number) => {
    const blocked = blockedSlots(d);
    for (let step = 0; step < 48; step++) {
      for (const s of [preferred + step * 30, preferred - step * 30]) {
        if (s >= 0 && s <= 1410 && !blocked.includes(s)) return s;
      }
    }
    return preferred;
  };

  const [day, setDay] = useState(initialDay);
  const [memberId, setMemberId] = useState(appointment?.memberId ?? "");
  // 수정이면 원래 시각, 새 예약이면 오늘은 다음 정각·다른 날은 저녁 7시에서 가장 가까운 빈 칸
  const [time, setTime] = useState(() =>
    appointment
      ? kstMinuteOfDay(appointment.startsAt)
      : nearestFree(
          initialDay,
          initialDay === today ? (Math.floor(kstMinuteOfDay(new Date()) / 60) + 1) * 60 : 19 * 60,
        ),
  );
  const [memo, setMemo] = useState(appointment?.memo ?? "");

  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = blockedSlots(day);
  const hour = Math.floor(time / 60);
  const minute = time % 60;

  // 시를 바꾸면 분은 그대로 두되, 막혀 있으면 같은 시의 다른 분으로 옮김
  const changeHour = (h: number) => {
    const same = h * 60 + minute;
    const other = h * 60 + (minute === 0 ? 30 : 0);
    setTime(!blocked.includes(same) || blocked.includes(other) ? same : other);
    setError(null);
  };

  // 종료한 회원(남은 수업 0회)은 예약할 일이 없음. 수정 중인 예약의 회원은 남김
  const options = members.filter(
    (m) => m.remainingSessions > 0 || m.id === appointment?.memberId,
  );

  const changeDay = (next: string) => {
    setDay(next);
    setTime((t) => nearestFree(next, t));
    setError(null);
  };

  const submit = async () => {
    if (day < today) {
      setError("지난 날짜에는 예약할 수 없습니다.");
      return;
    }
    if (!memberId) {
      setError("회원을 선택해 주세요.");
      return;
    }
    if (blocked.includes(time)) {
      setError("그 시간 앞뒤 1시간 안에 다른 수업이 있습니다. 다른 시간을 골라 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(appointment ? `/api/appointments/${appointment.id}` : "/api/appointments", {
        method: appointment ? "PATCH" : "POST",
        body: JSON.stringify({
          memberId,
          startsAt: kstIso(day, Math.floor(time / 60), time % 60),
          memo: memo.trim() || null,
        }),
      });
      toast(appointment ? "예약을 수정했습니다." : "수업을 예약했습니다.");
      onSaved(day);
    } catch (e) {
      setError(errorMessage(e, "예약을 저장하지 못했습니다."));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!appointment) return;
    setBusy(true);
    try {
      await apiFetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      toast("예약을 취소했습니다.");
      onSaved(kstDay(appointment.startsAt));
    } catch (e) {
      setConfirming(false);
      setError(errorMessage(e, "예약을 취소하지 못했습니다."));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="회원" required>
        <Select value={memberId} onValueChange={setMemberId} disabled={options.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={options.length === 0 ? "진행 중인 회원이 없습니다" : "회원 선택"}
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
                <span className="ml-1.5 text-xs text-subtle">남은 {m.remainingSessions}회</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          날짜·시각<span className="ml-0.5 text-destructive">*</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <DatePicker value={day} onChange={changeDay} ariaLabel="예약 날짜" />
          <Select value={String(hour)} onValueChange={(v) => changeHour(Number(v))}>
            <SelectTrigger className="w-24 font-semibold" aria-label="예약 시">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, h) => (
                <SelectItem
                  key={h}
                  value={String(h)}
                  disabled={blocked.includes(h * 60) && blocked.includes(h * 60 + 30)}
                >
                  {h}시
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(minute)}
            onValueChange={(v) => {
              setTime(hour * 60 + Number(v));
              setError(null);
            }}
          >
            <SelectTrigger className="w-24 font-semibold" aria-label="예약 분">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 30].map((m) => (
                <SelectItem key={m} value={String(m)} disabled={blocked.includes(hour * 60 + m)}>
                  {m === 0 ? "00" : "30"}분
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Field label="메모">
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 하체 위주, 인바디 측정"
          maxLength={40}
          className="h-11 w-full rounded-lg border-[1.5px] border-edge bg-field px-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-primary"
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        {appointment && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="flex-1 text-danger hover:text-danger"
          >
            예약 취소
          </Button>
        )}
        <Button type="button" loading={busy} onClick={() => void submit()} className="flex-1">
          {appointment ? "변경 저장" : "예약하기"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        busy={busy}
        title="예약 취소"
        message={
          appointment
            ? `${appointment.memberName} 님 ${kstTimeLabel(appointment.startsAt)} 예약을 취소할까요?`
            : ""
        }
        confirmLabel="예약 취소"
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
