/*
  회원 상세·내 기록 화면 — 체중 그래프 박스 (현재·목표 체중 요약, 목표 체중 수정, 그래프 수치 계산)

  @date : 2026-09-14
*/

"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/custom/icons";
import { useTheme } from "@/components/custom/theme";
import type { WeightRecord } from "@/lib/types";
import { isValidWeight, WEIGHT_RANGE_MESSAGE } from "@/lib/weight";

// 캔버스는 브라우저에서만 그리고, 그래프 라이브러리는 화면이 뜬 뒤에 받는다.
const ChartCanvas = dynamic(() => import("./weight-chart-canvas"), {
  ssr: false,
  loading: () => <div className="h-48 w-full md:h-56" />,
});

/** 체중 기록이 있으면 보이는 박스. 기록은 최신순으로 받는다. */
export function WeightChartCard({
  weights,
  targetWeight,
  busy,
  onSaveGoal,
}: {
  weights: WeightRecord[];
  targetWeight: number | null;
  busy?: boolean;
  /** 없으면 목표를 보여 주기만 한다 (회원 본인 화면). */
  onSaveGoal?: (targetWeight: number | null) => void;
}) {
  const stats = useMemo(() => getStats(weights, targetWeight), [weights, targetWeight]);
  const { dark } = useTheme();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        {/* 현재 체중 */}
        <div className="min-w-0">
          <p className="text-2xs font-bold text-subtle">현재 체중</p>
          <p className="text-3xl font-extrabold tracking-[-0.03em] tabular-nums">
            {stats.last.weight}
            <span className="ml-0.5 text-base font-bold text-muted-foreground">kg</span>
          </p>
          <p className="text-xs text-muted-foreground">
            처음보다 <span className="font-bold text-primary">{signed(stats.change)}kg</span>
          </p>
        </div>

        {/* 목표 체중 */}
        {onSaveGoal ? (
          <GoalControl goal={stats.goal} busy={busy ?? false} onSave={onSaveGoal} />
        ) : (
          stats.goal && (
            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="text-2xs font-bold text-subtle">목표 체중</span>
              <span className="text-lg font-extrabold tabular-nums text-goal">
                {stats.goal.target}
                <span className="ml-0.5 text-sm font-bold text-muted-foreground">kg</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {stats.goal.reached ? (
                  <span className="font-bold text-goal">달성</span>
                ) : (
                  <>
                    <span className="font-bold text-ink">{stats.goal.remaining}kg</span> 남음
                  </>
                )}
              </span>
            </div>
          )
        )}
      </div>

      {/* 그래프 — 테마가 바뀌면 새로 만들어 CSS 변수 색을 다시 읽는다 */}
      <ChartCanvas key={dark ? "dark" : "light"} stats={stats} />
    </div>
  );
}

/** 평소엔 "목표 78kg"로 보이고, 누르면 그 자리에서 숫자 칸과 저장 버튼이 된다. 모바일에서 주로 쓴다. */
function GoalControl({
  goal,
  busy,
  onSave,
}: {
  goal: Goal | null;
  busy: boolean;
  onSave: (targetWeight: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const open = () => {
    setValue(goal ? String(goal.target) : "");
    setEditing(true);
  };

  const save = (next: number | null) => {
    setEditing(false);
    if (next !== (goal?.target ?? null)) onSave(next);
  };

  // 폼으로 감싸서 모바일 키패드의 완료 키로도 저장된다.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(value.trim());
    if (value.trim() === "" || !isValidWeight(parsed)) {
      toast(WEIGHT_RANGE_MESSAGE);
      return;
    }
    save(parsed);
  };

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex shrink-0 flex-col items-end gap-1">
        <label htmlFor="weight-goal" className="text-2xs font-bold text-subtle">
          목표 체중
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="weight-goal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            enterKeyHint="done"
            autoFocus
            className="h-10 w-20 rounded-lg border border-goal bg-surface px-2 text-right text-lg font-extrabold tabular-nums text-goal outline-none"
          />
          <span className="text-sm font-bold text-muted-foreground">kg</span>
        </div>
        <div className="-mr-2 flex items-center text-sm font-bold">
          {goal && (
            <button
              type="button"
              onClick={() => save(null)}
              disabled={busy}
              className="h-8 px-2 text-danger disabled:opacity-50"
            >
              지우기
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-8 px-2 text-muted-foreground"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-8 px-2 text-primary disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </form>
    );
  }

  if (!goal) {
    return (
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="flex h-8 shrink-0 items-center gap-1 text-sm font-bold text-goal transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <Icon name="target" size={16} />
        목표 체중
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      aria-label={`목표 체중 ${goal.target}kg 수정`}
      className="group flex shrink-0 flex-col items-end rounded-lg px-2 py-1 -mr-2 -mt-1 text-right transition-colors hover:bg-raised disabled:opacity-50"
    >
      <span className="flex items-center gap-1 text-2xs font-bold text-subtle">
        목표 체중
        <Icon name="pencil" size={11} className="transition-colors group-hover:text-ink" />
      </span>
      <span className="text-lg font-extrabold tabular-nums text-goal">
        {goal.target}
        <span className="ml-0.5 text-sm font-bold text-muted-foreground">kg</span>
      </span>
      <span className="text-xs text-muted-foreground">
        {goal.reached ? (
          <span className="font-bold text-goal">달성</span>
        ) : (
          <>
            <span className="font-bold text-ink">{goal.remaining}kg</span> 남음
          </>
        )}
      </span>
    </button>
  );
}

// ── 계산 ─────────────────────────────────────

export type Point = {
  time: number;
  weight: number;
  date: string;
  /** 바로 앞 기록 대비. 첫 기록은 null. */
  delta: number | null;
};

export type Goal = {
  target: number;
  /** 목표까지 남은 kg (절댓값) */
  remaining: number;
  reached: boolean;
};

export type Stats = {
  points: Point[];
  first: Point;
  last: Point;
  change: number;
  min: number;
  max: number;
  goal: Goal | null;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** −1.2 / +0.4 / ±0 */
export function signed(value: number) {
  if (value === 0) return "±0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}

/** 최신순 기록을 날짜순 점으로 바꾸고 요약 수치를 뽑는다. */
function getStats(weights: WeightRecord[], targetWeight: number | null): Stats {
  const sorted = weights
    .map((record) => ({
      time: new Date(`${record.date}T00:00:00`).getTime(),
      weight: record.weight,
      date: record.date,
    }))
    .sort((a, b) => a.time - b.time);

  const points = sorted.map((point, index) => ({
    ...point,
    delta: index === 0 ? null : round1(point.weight - sorted[index - 1].weight),
  }));

  const first = points[0];
  const last = points[points.length - 1];
  const values = points.map((point) => point.weight);

  return {
    points,
    first,
    last,
    change: round1(last.weight - first.weight),
    min: Math.min(...values),
    max: Math.max(...values),
    goal:
      targetWeight == null
        ? null
        : {
            target: targetWeight,
            remaining: Math.abs(round1(last.weight - targetWeight)),
            // 빼는 목표면 목표 이하, 찌우는 목표면 목표 이상에서 달성이다.
            reached:
              first.weight >= targetWeight
                ? last.weight <= targetWeight
                : last.weight >= targetWeight,
          },
  };
}
