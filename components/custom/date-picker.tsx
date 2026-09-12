"use client";

// 날짜·시각 선택기 — shadcn Popover + Calendar
//
// 값은 브라우저 기본 입력과 같은 문자열("YYYY-MM-DD", "YYYY-MM-DDTHH:mm")을 그대로 쓴다.
// 팝오버는 포털로 띄워서, 넘치는 부분을 자르는 카드 안에 있어도 잘리지 않는다.

import { useEffect, useRef, useState } from "react";
import { ko } from "react-day-picker/locale";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (n: number) => String(n).padStart(2, "0");

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function todayKey() {
  return toKey(new Date());
}

function shiftDays(key: string, days: number) {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

function nowLocal() {
  const d = new Date();
  return `${toKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "9월 12일 (금)" — 올해가 아니면 연도를 붙인다. */
function formatDateLabel(key: string) {
  const d = fromKey(key);
  const year = d.getFullYear() === new Date().getFullYear() ? "" : `${d.getFullYear()}년 `;
  return `${year}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

/** "오후 3:05" */
function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${hour12}:${pad(m)}`;
}

const TRIGGER = "h-10 gap-2 px-3 font-semibold";

function DayCalendar({
  value,
  max,
  onSelect,
}: {
  value: string;
  /** 이 날짜(YYYY-MM-DD) 이후는 고를 수 없다. */
  max?: string;
  onSelect: (key: string) => void;
}) {
  const selected = fromKey(value);
  return (
    <Calendar
      mode="single"
      locale={ko}
      selected={selected}
      defaultMonth={selected}
      onSelect={(d) => d && onSelect(toKey(d))}
      disabled={max ? { after: fromKey(max) } : undefined}
      className="p-0 [--cell-size:--spacing(9)]"
    />
  );
}

export function DatePicker({
  value,
  onChange,
  max,
  ariaLabel = "날짜 선택",
}: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = todayKey();
  const quick: [string, string][] = [
    ["오늘", today],
    ["어제", shiftDays(today, -1)],
  ];

  const pick = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={TRIGGER}
          aria-label={`${ariaLabel}: ${formatDateLabel(value)}`}
        >
          <Icon name="calendar" className="text-muted-foreground" />
          {formatDateLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <DayCalendar value={value} max={max} onSelect={pick} />
        <div className="flex gap-1.5 border-t pt-2.5">
          {quick.map(([label, key]) => (
            <Button
              key={label}
              type="button"
              variant="secondary"
              size="sm"
              disabled={max ? key > max : false}
              onClick={() => pick(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** 수업이 있을 만한 시간대만 고른다. 새벽 3시를 누를 일은 없다. */
const GYM_HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

/** 0~23 → "오전 9시" / "정오" / "오후 2시" */
export function formatHourLabel(hour: number) {
  if (hour === 12) return "정오";
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour - 12}시`;
}

/** 시 단위 시각 선택기. */
export function HourPicker({
  value,
  onChange,
  ariaLabel = "시간 선택",
}: {
  /** 0~23 */
  value: number;
  onChange: (hour: number) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const pick = (hour: number) => {
    onChange(hour);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={TRIGGER}
          aria-label={`${ariaLabel}: ${formatHourLabel(value)}`}
        >
          <Icon name="clock" className="text-muted-foreground" />
          {formatHourLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[268px] p-3">
        <div className="flex items-center justify-between pb-2.5">
          <span className="text-2xs font-bold text-subtle">시간</span>
          <Button
            type="button"
            size="sm"
            onClick={() => pick(new Date().getHours())}
          >
            지금
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {GYM_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={h === value}
              onClick={() => pick(h)}
              className={`h-10 rounded-lg text-sm font-bold transition-colors ${
                h === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-raised text-ink hover:bg-line"
              }`}
            >
              {formatHourLabel(h)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeColumn({
  label,
  values,
  selected,
  onPick,
}: {
  label: string;
  values: number[];
  selected: number;
  onPick: (value: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // 열었을 때 선택된 값이 목록 가운데 오도록 스크롤한다.
  // scrollIntoView는 페이지까지 같이 스크롤하므로 목록 자체의 scrollTop만 옮긴다.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (list && item) {
      list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2;
    }
  }, []);

  return (
    <div className="flex w-14 flex-col">
      <span className="pb-1 text-center text-2xs font-semibold text-subtle">{label}</span>
      <div
        ref={listRef}
        className="relative flex h-36 flex-col gap-0.5 overflow-y-auto sm:h-[272px]"
      >
        {values.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === selected}
            onClick={() => onPick(v)}
            className={`shrink-0 rounded-md py-1.5 text-sm tabular-nums transition-colors ${
              v === selected
                ? "bg-primary font-bold text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {pad(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateTimePicker({
  value,
  onChange,
  max,
}: {
  /** "YYYY-MM-DDTHH:mm" */
  value: string;
  onChange: (value: string) => void;
  /** 이 날짜(YYYY-MM-DD) 이후는 고를 수 없다. */
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, time = "00:00"] = value.split("T");
  const [hour, minute] = time.split(":").map(Number);

  const set = (d: string, h: number, m: number) => onChange(`${d}T${pad(h)}:${pad(m)}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={TRIGGER}
          aria-label={`시각 선택: ${formatDateLabel(date)} ${formatTimeLabel(time)}`}
        >
          <Icon name="clock" className="text-muted-foreground" />
          {formatDateLabel(date)}
          <span className="font-normal text-muted-foreground">{formatTimeLabel(time)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <DayCalendar value={date} max={max} onSelect={(d) => set(d, hour, minute)} />
          <div className="flex justify-center gap-1.5 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
            <TimeColumn
              label="시"
              values={HOURS}
              selected={hour}
              onPick={(h) => set(date, h, minute)}
            />
            <TimeColumn
              label="분"
              values={MINUTES}
              selected={minute}
              onPick={(m) => set(date, hour, m)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={() => onChange(nowLocal())}>
            지금
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            확인
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
