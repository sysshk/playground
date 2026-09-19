/*
  수업 기록 작성·수정 화면 — 종목·세트 입력과 저장
  회원 본인의 개인 운동 화면(/me/workouts)도 이 화면을 personal로 씀

  @date : 2026-09-12
*/

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { DatePicker, HourPicker } from "@/components/custom/date-picker";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { apiFetch, completedAtFrom, errorMessage, formatDate, today } from "@/lib/client";
import { kstHour } from "@/lib/kst";
import { formatRest, formatSet, type WeightUnit, type Workout } from "@/types";
import { EditorPage } from "@/components/custom/editor-page";
import { round1 } from "@/lib/utils";

/** 세트 한 줄. 입력 중에는 전부 문자열로 들고 있다가 저장할 때 숫자로 바꿈 */
interface SetRow {
  unit: WeightUnit; // 입력 방식 탭 — 무게, 바디웨이트, 좌우
  reps: string; // 횟수
  weight: string; // 무게 kg, 좌우면 왼쪽
  weightRight: string; // 좌우일 때 오른쪽 무게 kg
}

/** 종목 한 덩어리 */
interface ExerciseRow {
  name: string; // 종목명, 비우면 저장할 때 빠짐
  restSeconds: number | null; // 마지막으로 누른 휴식 타이머 초 — 종목의 휴식 시간으로 저장
  sets: SetRow[];
  editing: boolean; // 펼친 종목 — 끄면 글자만 보여 잘못 눌러도 값이 안 바뀜
}

/** API로 보낼 값 */
interface WorkoutPayload {
  date: string; // 수업한 날 YYYY-MM-DD
  memo: string | null;
  completedAt: string; // 수업 시각 — 수정하면 연결된 수업의 시각도 따라감
  exercises: {
    name: string;
    restSeconds: number | null;
    sets: { reps: number; weight: number | null; weightRight: number | null; unit: WeightUnit }[]; // 세트마다 방식·무게가 다를 수 있음
  }[];
}

/** 무게 −/+ 한 번에 움직이는 양. 원판 한 쌍(1.25kg × 2) 기준. */
const WEIGHT_STEP = 2.5;

/** 날짜·운동·메모 영역 제목 */
const SECTION_TITLE = "text-sm font-bold";

/** 세트 사이 쉬는 시간의 이름 — 바꾸려면 여기만 */
const REST_LABEL = "세트 간 휴식";

/** 휴식 시간 빠른 고르기 (초) */
const REST_OPTIONS = [30, 60, 90, 120, 180];

/** 휴식 −/+ 10초. 10초 아래로 내리면 "없음", 없음에서 +면 30초부터, 최대 10분 */
function stepRest(current: number | null, delta: number) {
  if (current === null) return delta > 0 ? 30 : null;
  const next = current + delta;
  if (next < 10) return null;
  return Math.min(next, 600);
}

/** 세트 입력 방식 탭 */
const UNIT_TABS: [WeightUnit, string][] = [
  ["bodyweight", "바디웨이트"],
  ["kg", "무게"],
  ["sides", "좌우 따로"],
];

/** 새 세트는 바로 위 세트의 방식·수치를 이어받음 */
const emptySet = (from?: SetRow): SetRow => ({
  unit: from?.unit ?? "kg",
  reps: from?.reps ?? "10",
  weight: from?.weight ?? "",
  weightRight: from?.weightRight ?? "",
});

const validWeight = (value: string) =>
  value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;

/** 세트 한 줄이 제대로 찼는지. 덜 찼으면 보여 줄 문구를 돌려줌 */
function setProblem(set: SetRow, label: string) {
  const reps = Number(set.reps);
  if (set.reps.trim() === "" || !Number.isInteger(reps) || reps < 1) {
    return `${label}: 횟수는 1 이상 입력해 주세요.`;
  }
  if (set.unit === "bodyweight") return null;

  if (!validWeight(set.weight)) {
    return set.unit === "sides"
      ? `${label}: 왼쪽 무게를 0 이상 숫자로 입력해 주세요.`
      : `${label}: 무게를 0 이상 숫자로 입력하거나 바디웨이트를 고르세요.`;
  }
  if (set.unit === "sides" && !validWeight(set.weightRight)) {
    return `${label}: 오른쪽 무게를 0 이상 숫자로 입력해 주세요.`;
  }
  return null;
}

/** 입력 칸 글자를 저장할 숫자로 바꿈. 고른 방식에서 안 쓰는 칸은 null */
const toSet = (set: SetRow): WorkoutPayload["exercises"][number]["sets"][number] => ({
  reps: Number(set.reps),
  weight: set.unit === "bodyweight" ? null : Number(set.weight),
  weightRight: set.unit === "sides" ? Number(set.weightRight) : null,
  unit: set.unit,
});

/** 저장된 숫자를 입력 칸 글자로. 없으면 빈 칸 (weightRight가 생기기 전 기록은 값이 없음) */
const text = (n: number | null | undefined) => (n == null ? "" : String(n));

const emptyExercise = (): ExerciseRow => ({
  name: "",
  restSeconds: null,
  sets: [emptySet()],
  editing: true,
});

/** 저장된 기록을 폼 입력 상태(전부 문자열)로 되돌림 */
function toRows(workout: Workout | null): ExerciseRow[] {
  if (!workout || workout.exercises.length === 0) return [emptyExercise()];
  return workout.exercises.map((e) => ({
    name: e.name,
    restSeconds: e.restSeconds ?? null,
    sets: e.sets.map((s) => ({
      unit: s.unit,
      reps: String(s.reps),
      weight: text(s.weight),
      weightRight: text(s.weightRight),
    })),
    // 저장해 둔 종목은 접은 채로 열어 둠. 수정을 눌러야 펼쳐짐
    editing: false,
  }));
}

/** 소수점 한 자리까지만 남김 (2.5kg 단위 계산에서 생기는 부동소수 오차 제거). */
export function WorkoutEditor({
  member,
  workout,
  completedAt,
  personal = false,
}: {
  member: { id: string; name: string; remainingSessions: number };
  /** 회원이 쓰는 개인 운동 — 남은 수업·수업 시각이 없고 /api/me로 저장함 */
  personal?: boolean;
  /** 주면 수정, 없으면 새 기록 */
  workout: Workout | null;
  /** 수정할 기록에 연결된 수업 시각 */
  completedAt: string | null;
}) {
  const router = useRouter();
  const memberId = member.id;
  const back = personal ? "/me?tab=personal" : `/members/${memberId}`;
  const api = personal ? "/api/me/workouts" : `/api/members/${memberId}/workouts`;

  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(() => workout?.date ?? today());
  const [memo, setMemo] = useState(workout?.memo ?? "");
  const [rows, setRows] = useState<ExerciseRow[]>(() => toRows(workout));
  const [error, setError] = useState<string | null>(null);

  const [hour, setHour] = useState(() => kstHour(completedAt ?? new Date()));
  const [removing, setRemoving] = useState<number | null>(null);
  // 휴식 타이머 — 저장하지 않고 화면에서만 셈
  const [timer, setTimer] = useState<RestTimerState | null>(null);
  // 타이머는 오늘 새로 적는 수업에서만 — 지난 기록을 고칠 때는 휴식 시간만 고름
  const live = !workout && date === today();
  const startRest = (index: number, seconds: number) => {
    unlockSound();
    setTimer({ index, total: seconds, endsAt: secondsFromNow(seconds) });
  };
  // ✕를 한 번 누른 세트 "종목-세트". 3초 안에 한 번 더 눌러야 지워짐
  const [armedSet, setArmedSet] = useState<string | null>(null);

  useEffect(() => {
    if (!armedSet) return;
    const timer = setTimeout(() => setArmedSet(null), 3000);
    return () => clearTimeout(timer);
  }, [armedSet]);

  // 이름을 적은 종목만 저장함. 하나도 없으면 수업만 남기는 날이고 메모가 사유가 됨
  const named = rows.filter((r) => r.name.trim() !== "");
  const sessionOnly = named.length === 0;

  const patchExercise = (i: number, patch: Partial<ExerciseRow>) => {
    setRows((prev) => prev.map((r, n) => (n === i ? { ...r, ...patch } : r)));
    setError(null);
  };

  const patchSet = (i: number, s: number, patch: Partial<SetRow>) => {
    setRows((prev) =>
      prev.map((r, n) =>
        n === i
          ? { ...r, sets: r.sets.map((v, m) => (m === s ? { ...v, ...patch } : v)) }
          : r,
      ),
    );
    setError(null);
  };

  /** 입력 방식 탭을 바꿈. 좌우로 처음 바꾸면 오른쪽 무게를 왼쪽과 같게 채움 */
  const selectUnit = (i: number, s: number, unit: WeightUnit) => {
    const set = rows[i].sets[s];
    patchSet(i, s, {
      unit,
      weightRight: unit === "sides" && set.weightRight === "" ? set.weight : set.weightRight,
    });
  };

  /** 종목의 세트가 다 찼는지 봄. 덜 찼으면 문구를 띄움 */
  const checkSets = (i: number) => {
    const row = rows[i];
    const name = row.name.trim() || `${i + 1}번째 종목`;
    for (const [s, set] of row.sets.entries()) {
      const problem = setProblem(set, `${name} ${s + 1}세트`);
      if (problem) {
        setError(problem);
        return false;
      }
    }
    return true;
  };

  /** 종목을 펼치거나 접음. 접을 때는 다 찼는지 보고 접음 */
  const toggleExercise = (i: number) => {
    if (rows[i].editing && !checkSets(i)) return;
    patchExercise(i, { editing: !rows[i].editing });
  };

  /** 세트 ✕ — 첫 번째는 [삭제]로 바꾸기만 하고 두 번째에 지움 */
  const removeSet = (i: number, s: number) => {
    const key = `${i}-${s}`;
    if (armedSet !== key) return setArmedSet(key);
    patchExercise(i, { sets: rows[i].sets.filter((_, m) => m !== s) });
    setArmedSet(null);
  };

  /** 세트를 더 넣음 */
  const addSet = (i: number) => {
    if (!checkSets(i)) return;
    const row = rows[i];
    patchExercise(i, { sets: [...row.sets, emptySet(row.sets[row.sets.length - 1])] });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (sessionOnly && (workout || personal)) {
      setError(
        workout
          ? "종목을 하나 이상 남겨 주세요. 기록을 지우려면 목록에서 삭제하세요."
          : "종목을 하나 이상 적어 주세요.",
      );
      return;
    }

    const exercises: WorkoutPayload["exercises"] = [];

    for (const row of named) {
      const name = row.name.trim();

      const sets: WorkoutPayload["exercises"][number]["sets"] = [];

      for (const [s, set] of row.sets.entries()) {
        const problem = setProblem(set, `${name} ${s + 1}세트`);
        if (problem) {
          setError(problem);
          return;
        }

        sets.push(toSet(set));
      }

      exercises.push({ name, restSeconds: row.restSeconds, sets });
    }

    const payload: WorkoutPayload = {
      date,
      memo: memo.trim() || null,
      exercises,
      completedAt: completedAtFrom(date, hour),
    };

    setBusy(true);
    setError(null);
    try {
      if (sessionOnly) {
        // 종목이 없으면 남길 운동이 없던 날임. 수업 완료만 남김
        await apiFetch(`/api/members/${memberId}/complete`, {
          method: "POST",
          body: JSON.stringify({
            completedAt: payload.completedAt,
            reason: memo.trim() || null,
          }),
        });
      } else {
        await apiFetch(
          workout ? `${api}/${workout.id}` : api,
          {
            method: workout ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );
      }
      toast(
        personal
          ? workout
            ? "개인 운동을 수정했습니다."
            : "개인 운동을 기록했습니다."
          : workout
            ? "수업 기록을 수정했습니다."
            : "수업 1회를 기록했습니다.",
      );
      router.replace(back);
    } catch (e) {
      setError(errorMessage(e, "수업 기록 저장에 실패했습니다."));
      setBusy(false);
    }
  };

  return (
    <EditorPage
      back={back}
      title={
        personal
          ? workout
            ? "개인 운동 수정"
            : "개인 운동 기록"
          : workout
            ? "수업 기록 수정"
            : "수업 기록"
      }
      name={personal ? "내 기록" : member.name}
      subtitle={
        workout
          ? `${formatDate(workout.date)} 기록을 고칩니다.`
          : personal
            ? "혼자 한 운동을 적어 두면 트레이너가 보고 수업에 반영합니다."
            : "저장하면 수업 1회가 기록됩니다. 상담·노쇼처럼 운동이 없던 날은 종목을 비우고 메모만 남기세요."
      }
      aside={
        !workout && !personal && (
          <p
            className={`flex shrink-0 items-baseline gap-1.5 rounded-xl px-3 py-2 ${
              member.remainingSessions === 0 ? "bg-danger/10" : "bg-primary-light"
            }`}
          >
            <span
              className={`text-xs font-bold ${
                member.remainingSessions === 0
                  ? "text-danger"
                  : "text-primary-dark dark:text-primary-bright"
              }`}
            >
              남은 수업
            </span>
            <span className="text-lg font-extrabold leading-none tracking-[-0.02em]">
              {member.remainingSessions}
            </span>
            <span className="text-xs font-bold text-muted-foreground">회</span>
          </p>
        )
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!workout && !personal && member.remainingSessions === 0 && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold leading-relaxed text-danger">
            남은 수업이 없어 기록을 저장할 수 없습니다. 회원 정보에서 수업 횟수를 먼저 늘려 주세요.
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className={SECTION_TITLE}>날짜</h2>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker value={date} onChange={setDate} max={today()} />
            {!personal && <HourPicker value={hour} onChange={setHour} ariaLabel="수업 시각" />}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={SECTION_TITLE}>운동</h2>
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl border-[1.5px] border-edge bg-surface">
              {/* 종목 */}
              <div className="flex items-center gap-2 border-b border-line py-1.5 pl-3 pr-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-canvas text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <input
                  className="h-11 min-w-0 flex-1 bg-transparent text-md font-bold outline-none placeholder:font-normal placeholder:text-subtle"
                  value={row.name}
                  onChange={(e) => patchExercise(i, { name: e.target.value })}
                  placeholder="종목명 (벤치프레스, 스쿼트 등)"
                  aria-label={`${i + 1}번째 종목명`}
                />
                <button
                  type="button"
                  onClick={() => toggleExercise(i)}
                  aria-label={`${i + 1}번째 종목 ${row.editing ? "완료" : "수정"}`}
                  className={`flex h-11 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm font-bold transition-colors ${
                    row.editing
                      ? "text-primary hover:bg-primary-light"
                      : "text-subtle hover:bg-raised hover:text-ink"
                  }`}
                >
                  <Icon name={row.editing ? "check" : "pencil"} size={16} />
                  {row.editing ? "완료" : "수정"}
                </button>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRemoving(i)}
                    aria-label={`${i + 1}번째 종목 삭제`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger"
                  >
                    <Icon name="trash" size={18} />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 p-3">
                {/* 세트 */}
                <ol className="flex flex-col gap-2">
                  {row.sets.map((set, s) =>
                    !row.editing ? (
                      <li
                        key={s}
                        className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2"
                      >
                        <span className="w-12 shrink-0 text-sm font-bold text-muted-foreground">
                          {s + 1}세트
                        </span>
                        <span className="min-w-0 flex-1 text-md font-bold tabular-nums">
                          {formatSet(toSet(set))}
                        </span>
                      </li>
                    ) : (
                      <li key={s} className="@container flex flex-col gap-2 rounded-lg p-1">
                        {/* 세트 번호·입력 방식 탭 */}
                        <div className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-sm font-bold text-muted-foreground">
                            {s + 1}세트
                          </span>
                          <div
                            role="radiogroup"
                            aria-label={`${s + 1}세트 입력 방식`}
                            className="flex gap-0.5 rounded-lg bg-canvas p-0.5"
                          >
                            {UNIT_TABS.map(([unit, label]) => (
                              <button
                                key={unit}
                                type="button"
                                role="radio"
                                aria-checked={set.unit === unit}
                                onClick={() => selectUnit(i, s, unit)}
                                className={`h-7 rounded-md px-2.5 text-xs font-bold transition-colors ${
                                  set.unit === unit
                                    ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                                    : "text-muted-foreground hover:text-ink"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {row.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSet(i, s)}
                              onBlur={() => setArmedSet(null)}
                              aria-label={`${s + 1}세트 삭제`}
                              className={`ml-auto flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                armedSet === `${i}-${s}`
                                  ? "bg-danger/15 px-2.5 text-danger"
                                  : "text-subtle hover:bg-raised hover:text-ink"
                              }`}
                            >
                              {armedSet === `${i}-${s}` ? "삭제" : <Icon name="close" size={16} />}
                            </button>
                          )}
                        </div>

                        {/* 횟수·무게 — 전체 폭은 그대로, 좌우 따로면 셋으로 나눔 */}
                        <div
                          className={`grid gap-2 ${set.unit === "sides" ? "grid-cols-3" : "grid-cols-2"}`}
                        >
                          <Stepper
                            label={`${s + 1}세트 횟수`}
                            unit="회"
                            value={set.reps}
                            step={1}
                            min={1}
                            inputMode="numeric"
                            compact={set.unit === "sides"}
                            onChange={(reps) => patchSet(i, s, { reps })}
                          />
                          {set.unit === "bodyweight" && (
                            <span className="grid h-9 place-items-center rounded-lg border border-dashed border-line-strong text-xs font-bold text-subtle">
                              바디웨이트
                            </span>
                          )}
                          {set.unit !== "bodyweight" && (
                            <Stepper
                              label={`${s + 1}세트 ${set.unit === "sides" ? "왼쪽 " : ""}무게`}
                              prefix={set.unit === "sides" ? "좌" : undefined}
                              unit="kg"
                              value={set.weight}
                              step={WEIGHT_STEP}
                              min={0}
                              inputMode="decimal"
                              compact={set.unit === "sides"}
                              onChange={(weight) => patchSet(i, s, { weight })}
                            />
                          )}
                          {set.unit === "sides" && (
                            <Stepper
                              label={`${s + 1}세트 오른쪽 무게`}
                              prefix="우"
                              unit="kg"
                              value={set.weightRight}
                              step={WEIGHT_STEP}
                              min={0}
                              inputMode="decimal"
                              compact
                              onChange={(weightRight) => patchSet(i, s, { weightRight })}
                            />
                          )}
                        </div>
                      </li>
                    ),
                  )}
                </ol>

                {/* 세트 간 휴식 — 세트 추가 바로 위. 시간을 정하고, 오늘 수업 중이면 [시작]으로 셈 */}
                {row.editing && (
                  <div className="flex flex-col gap-2 px-1">
                    <div className="flex items-center justify-end gap-2">
                      <span className="shrink-0 text-sm font-bold text-muted-foreground">{REST_LABEL}</span>
                      {timer?.index === i ? (
                        <RestTimer timer={timer} onClose={() => setTimer(null)} />
                      ) : (
                        <>
                          {/* 10초씩 조절 — 세트 칸처럼 숫자 오른쪽에 −/+ */}
                          <div className="flex h-9 items-center overflow-hidden rounded-lg bg-canvas">
                            <span className="min-w-18 px-3 text-right text-sm font-extrabold tabular-nums">
                              {row.restSeconds === null ? (
                                <span className="font-semibold text-subtle">없음</span>
                              ) : (
                                formatRest(row.restSeconds)
                              )}
                            </span>
                            <span className="flex h-full border-l border-line">
                              <button
                                type="button"
                                onClick={() => patchExercise(i, { restSeconds: stepRest(row.restSeconds, -10) })}
                                disabled={row.restSeconds === null}
                                aria-label={`${REST_LABEL} 10초 줄이기`}
                                className="grid h-full w-9 place-items-center text-muted-foreground transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
                              >
                                <Icon name="minus" size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => patchExercise(i, { restSeconds: stepRest(row.restSeconds, 10) })}
                                aria-label={`${REST_LABEL} 10초 늘리기`}
                                className="grid h-full w-9 place-items-center text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
                              >
                                <Icon name="plus" size={16} />
                              </button>
                            </span>
                          </div>
                          {/* 오늘 수업 중일 때만 타이머 */}
                          {live && (
                            <button
                              type="button"
                              onClick={() => row.restSeconds && startRest(i, row.restSeconds)}
                              disabled={row.restSeconds === null}
                              className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-primary px-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-35"
                            >
                              <Icon name="clock" size={15} />
                              시작
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {timer?.index !== i && (
                      <>
                        {/* 빠른 고르기 */}
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {REST_OPTIONS.map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              aria-pressed={row.restSeconds === sec}
                              onClick={() => patchExercise(i, { restSeconds: row.restSeconds === sec ? null : sec })}
                              className={`h-9 rounded-lg px-3 text-sm font-bold transition-colors ${
                                row.restSeconds === sec
                                  ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                                  : "bg-canvas text-muted-foreground hover:text-ink"
                              }`}
                            >
                              {formatRest(sec)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {row.editing && (
                  <button
                    type="button"
                    onClick={() => addSet(i)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-canvas text-sm font-bold text-ink transition-colors hover:bg-raised"
                  >
                    <Icon name="plus" size={16} />
                    세트 추가
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setRows((p) => [...p, emptyExercise()])}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-line-strong bg-surface text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name="plus" size={16} />
            종목 추가
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className={SECTION_TITLE}>메모</h2>
          <textarea
            className="h-24 w-full resize-none rounded-xl border-[1.5px] border-edge bg-field px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={sessionOnly && !workout && !personal ? 200 : undefined}
            placeholder={personal ? "컨디션, 느낀 점, 트레이너에게 남길 말" : "폼 체크, 컨디션, 상담·노쇼 사유 등"}
            aria-label="메모"
          />
        </section>


        {error && <p className="text-sm text-danger">{error}</p>}

        <ConfirmDialog
          open={removing !== null}
          title="종목 삭제"
          message={`${rows[removing ?? 0]?.name.trim() || `${(removing ?? 0) + 1}번째 종목`}을(를) 지울까요?`}
          hint="입력한 세트도 함께 사라집니다."
          onConfirm={() => {
            setRows((p) => p.filter((_, n) => n !== removing));
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />

        <div className="flex gap-2 tablet:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push(back)} className="flex-1 tablet:flex-none tablet:px-5">
            취소
          </Button>
          <Button type="submit" loading={busy} className="flex-1 tablet:flex-none tablet:px-7">
            {workout ? "수정 저장" : "저장"}
          </Button>
        </div>
      </form>

    </EditorPage>
  );
}

// ── 휴식 타이머 ─────────────────────────────

type RestTimerState = { index: number; total: number; endsAt: number }; // index — 몇 번째 종목의 휴식인지

/** 지금부터 몇 초 뒤의 시각 (ms) */
const secondsFromNow = (seconds: number) => Date.now() + seconds * 1000;

let audio: AudioContext | null = null;

/** 아이폰은 사용자가 누른 순간에만 소리를 열어 줌. 타이머를 시작할 때 미리 열어 둠 */
function unlockSound() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }
}

/** 삐삐삐 — 휴식 끝 */
function ring() {
  if (audio) {
    [0, 0.35, 0.7].forEach((at) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, audio!.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.001, audio!.currentTime + at + 0.25);
      osc.connect(gain).connect(audio!.destination);
      osc.start(audio!.currentTime + at);
      osc.stop(audio!.currentTime + at + 0.26);
    });
  }
  // 안드로이드만 진동함. 아이폰·아이패드 브라우저는 막아 둠
  navigator.vibrate?.([200, 100, 200, 100, 200]);
}

/** 휴식 타이머 — [시작] 자리에서 시간만 셈. 배경이 줄어들고, 누르면 멈춤. 끝나면 소리·진동·깜빡임 */
function RestTimer({ timer, onClose }: { timer: RestTimerState; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const rang = useRef(false);
  const left = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
  const done = left === 0;

  useEffect(() => {
    rang.current = false;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [timer.endsAt]);

  useEffect(() => {
    if (!done || rang.current) return;
    rang.current = true;
    ring();
    // 끝나고 조금 보여 준 뒤 닫음
    const id = setTimeout(onClose, 6000);
    return () => clearTimeout(id);
  }, [done, onClose]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <button
      type="button"
      role="timer"
      aria-live="polite"
      aria-label={done ? "휴식 끝, 닫기" : `남은 휴식 ${mm}분 ${ss}초, 누르면 멈춤`}
      onClick={onClose}
      className={`relative flex h-9 min-w-28 items-center gap-1.5 overflow-hidden rounded-lg bg-primary-light pl-3 pr-2.5 text-primary-dark dark:text-primary-bright ${
        done ? "animate-pulse" : ""
      }`}
    >
      {/* 남은 시간만큼 배경이 차 있다가 줄어듦 */}
      <span
        className="absolute inset-y-0 left-0 bg-primary/25 transition-[width] duration-200 ease-linear"
        style={{ width: `${done ? 0 : (left / timer.total) * 100}%` }}
      />
      <Icon name="clock" size={15} className="relative" />
      <span className="relative flex-1 text-left text-base font-extrabold tabular-nums">
        {done ? "끝!" : `${mm}:${ss}`}
      </span>
      <Icon name="close" size={14} className="relative opacity-60" />
    </button>
  );
}

/** −/+ 버튼으로 숫자를 바꾸는 입력. 가운데 숫자를 누르면 직접 입력할 수 있음 */
function Stepper({
  label,
  prefix,
  unit,
  value,
  step,
  min,
  inputMode,
  compact = false,
  onChange,
}: {
  label: string;
  prefix?: string; // 칸 왼쪽 글 — 좌우 무게의 "좌"·"우"
  unit: string;
  value: string;
  step: number;
  min: number;
  inputMode: "numeric" | "decimal";
  compact?: boolean; // 한 칸 폭 — 좁으면 −/+를 숨기고 직접 입력
  onChange: (value: string) => void;
}) {
  const current = Number(value) || 0;
  const bump = (delta: number) => onChange(String(Math.max(min, round1(current + delta))));

  return (
    <div
      className="flex h-9 min-w-0 items-center overflow-hidden rounded-lg bg-canvas"
    >
      <label className="flex min-w-0 flex-1 items-baseline justify-end gap-0.5 pl-2 tablet:pl-3">
        {prefix && (
          <span className="shrink-0 text-xs font-bold text-muted-foreground">{prefix}</span>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder="0"
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-right text-md font-bold tabular-nums outline-none placeholder:text-line-strong"
        />
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{unit}</span>
        <span className="w-2 shrink-0" />
      </label>
      {/* 엄지 한 번에 오가도록 −/+를 오른쪽에 붙여 둠 */}
      <div className={`flex h-full shrink-0 border-l border-line ${compact ? "@max-md:hidden" : ""}`}>
        <button
          type="button"
          onClick={() => bump(-step)}
          disabled={current <= min}
          aria-label={`${label} 줄이기`}
          className="grid h-full w-8 place-items-center text-muted-foreground transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
        >
          <Icon name="minus" size={15} />
        </button>
        <button
          type="button"
          onClick={() => bump(step)}
          aria-label={`${label} 늘리기`}
          className="grid h-full w-8 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
        >
          <Icon name="plus" size={15} />
        </button>
      </div>
    </div>
  );
}
