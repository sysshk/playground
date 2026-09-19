/*
  공통 — 날짜 선택기, 시각 선택기
  값은 "YYYY-MM-DD" 문자열임

  @date : 2026-09-12
*/

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateShort, formatHourLabel } from "@/lib/client";
import { kstDay, kstHour } from "@/lib/kst";

const pad = (n: number) => String(n).padStart(2, "0");

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function shiftDays(key: string, days: number) {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** 입력칸과 같은 높이·테두리·바탕 */
const TRIGGER = "h-11 gap-2 border-[1.5px] bg-field px-3 font-semibold dark:border-edge dark:bg-field";

type DayCalendarProps = {
  value: string;
  /** 이 날짜(YYYY-MM-DD) 이후는 고를 수 없음 */
  max?: string;
  onSelect: (key: string) => void;
};

// 달력 라이브러리는 팝업을 처음 열 때 받음
const DayCalendar = dynamic<DayCalendarProps>(
  async () => {
    const [{ Calendar }, { ko }] = await Promise.all([
      import("@/components/ui/calendar"),
      import("react-day-picker/locale/ko"),
    ]);
    return function DayCalendar({ value, max, onSelect }: DayCalendarProps) {
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
    };
  },
  { ssr: false, loading: () => <div className="h-[304px] w-[252px]" /> },
);

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
  const today = kstDay();
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
          aria-label={`${ariaLabel}: ${formatDateShort(value)}`}
        >
          <Icon name="calendar" className="text-muted-foreground" />
          {formatDateShort(value)}
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

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 오전·오후로 나눠 두 줄에 담음 */
const HOUR_GROUPS = [
  { label: "오전", hours: ALL_HOURS.filter((h) => h < 12) },
  { label: "오후", hours: ALL_HOURS.filter((h) => h >= 12) },
];

/** 0~23 → 시계에 적힌 숫자 */
function hourDigit(hour: number) {
  return hour > 12 ? hour - 12 : hour;
}

/** 시 단위 시각 선택기 (한국 시각). */
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
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[248px] p-2.5"
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-2xs font-bold text-subtle">시간</span>
          <button
            type="button"
            onClick={() => pick(kstHour(new Date()))}
            className="rounded-md px-1.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-raised"
          >
            지금
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {HOUR_GROUPS.map((group) => (
            <div key={group.label} className="flex items-start gap-2">
              <span className="w-6 shrink-0 pt-2 text-2xs font-bold text-subtle">
                {group.label}
              </span>
              <div className="grid flex-1 grid-cols-6 gap-1">
                {group.hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={h === value}
                    aria-label={formatHourLabel(h)}
                    onClick={() => pick(h)}
                    className={`h-8 rounded-md text-sm tabular-nums transition-colors ${
                      h === value
                        ? "font-extrabold text-primary"
                        : "font-medium text-muted-foreground hover:bg-raised hover:text-ink"
                    }`}
                  >
                    {hourDigit(h)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
