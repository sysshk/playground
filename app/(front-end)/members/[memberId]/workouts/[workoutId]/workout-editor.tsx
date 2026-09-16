/*
  수업 기록 작성·수정 화면 — 종목·세트 입력과 저장

  @date : 2026-09-12
*/

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { DatePicker, HourPicker } from "@/components/custom/date-picker";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { apiFetch, completedAtFrom, errorMessage, formatDate, today } from "@/lib/client";
import { kstHour } from "@/lib/kst";
import type { Workout } from "@/lib/types";
import { EditorFrame } from "../../editor-frame";
import type { ExerciseRow, SetRow, WorkoutPayload } from "./types";

/** 무게 −/+ 한 번에 움직이는 양. 원판 한 쌍(1.25kg × 2) 기준. */
const WEIGHT_STEP = 2.5;

/** 종목 없이 수업만 남길 때 고르는 사유. 폰에서 키보드를 올리지 않고 넣는다. */
const QUICK_REASONS = ["상담", "체형 평가", "노쇼"];

const emptySet = (from?: SetRow): SetRow => ({
  reps: from?.reps ?? "10",
  weight: from?.weight ?? "",
  bodyweight: from?.bodyweight ?? false,
});

/** 세트 한 줄이 제대로 찼는지. 덜 찼으면 보여 줄 문구를 돌려준다. */
function setProblem(set: SetRow, label: string) {
  const reps = Number(set.reps);
  if (set.reps.trim() === "" || !Number.isInteger(reps) || reps < 1) {
    return `${label}: 횟수는 1 이상 입력해 주세요.`;
  }
  if (set.bodyweight) return null;

  const weight = Number(set.weight.trim());
  if (set.weight.trim() === "" || !Number.isFinite(weight) || weight < 0) {
    return `${label}: 무게를 입력하거나 바디웨이트를 눌러 주세요.`;
  }
  return null;
}

/** 접어 둔 세트에 적는 글 — "60kg × 12회", 바디웨이트면 "바디웨이트 12회" */
function setLabel(set: SetRow) {
  return set.bodyweight ? `바디웨이트 ${set.reps}회` : `${set.weight}kg × ${set.reps}회`;
}

const emptyExercise = (): ExerciseRow => ({
  name: "",
  sets: [emptySet()],
  editing: true,
});

/** 저장된 기록을 폼 입력 상태(전부 문자열)로 되돌린다. */
function toRows(workout: Workout | null): ExerciseRow[] {
  if (!workout || workout.exercises.length === 0) return [emptyExercise()];
  return workout.exercises.map((e) => ({
    name: e.name,
    sets: e.sets.map((s) => ({
      reps: String(s.reps),
      weight: s.weight === null ? "" : String(s.weight),
      bodyweight: s.unit === "bodyweight",
    })),
    // 저장해 둔 종목은 접은 채로 연다. 수정을 눌러야 펼쳐진다.
    editing: false,
  }));
}

/** 소수점 한 자리까지만 남긴다 (2.5kg 단위 계산에서 생기는 부동소수 오차 제거). */
const round1 = (n: number) => Math.round(n * 10) / 10;

export function WorkoutEditor({
  member,
  workout,
  completedAt,
  lastSets,
}: {
  member: { id: string; name: string; remainingSessions: number };
  /** 주면 수정, 없으면 새 기록 */
  workout: Workout | null;
  /** 수정할 기록에 연결된 수업 시각 */
  completedAt: string | null;
  /** 종목명 → 직전 기록 문구 ("60kg × 12회") */
  lastSets: Record<string, string>;
}) {
  const router = useRouter();
  const memberId = member.id;
  const back = `/members/${memberId}`;

  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(() => workout?.date ?? today());
  const [memo, setMemo] = useState(workout?.memo ?? "");
  const [rows, setRows] = useState<ExerciseRow[]>(() => toRows(workout));
  const [error, setError] = useState<string | null>(null);

  const [hour, setHour] = useState(() => kstHour(completedAt ?? new Date()));
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState<number | null>(null);

  // 이름을 적은 종목만 저장한다. 하나도 없으면 수업만 남기는 날이다.
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

  /** 종목의 세트가 다 찼는지 본다. 덜 찼으면 문구를 띄운다. */
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

  /** 종목을 펼치거나 접는다. 접을 때는 다 찼는지 보고 접는다. */
  const toggleExercise = (i: number) => {
    if (rows[i].editing && !checkSets(i)) return;
    patchExercise(i, { editing: !rows[i].editing });
  };

  /** 세트를 더 넣는다. */
  const addSet = (i: number) => {
    if (!checkSets(i)) return;
    const row = rows[i];
    patchExercise(i, { sets: [...row.sets, emptySet(row.sets[row.sets.length - 1])] });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (sessionOnly && workout) {
      setError("종목을 하나 이상 남겨 주세요. 기록을 지우려면 목록에서 삭제하세요.");
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

        // 1세트는 바디웨이트로 하고 2세트부터 무게를 다는 식으로 한 종목
        // 안에서 섞이므로 세트마다 따로 본다.
        sets.push(
          set.bodyweight
            ? { reps: Number(set.reps), weight: null, unit: "bodyweight" }
            : { reps: Number(set.reps), weight: Number(set.weight), unit: "kg" },
        );
      }

      exercises.push({ name, sets });
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
        // 종목이 없으면 남길 운동이 없던 날이다. 수업 완료만 남긴다.
        await apiFetch(`/api/members/${memberId}/complete`, {
          method: "POST",
          body: JSON.stringify({
            completedAt: payload.completedAt,
            reason: reason.trim() || null,
          }),
        });
      } else {
        await apiFetch(
          workout
            ? `/api/members/${memberId}/workouts/${workout.id}`
            : `/api/members/${memberId}/workouts`,
          {
            method: workout ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );
      }
      toast(workout ? "수업 기록을 수정했습니다." : "수업 1회를 기록했습니다.");
      router.replace(back);
    } catch (e) {
      setError(errorMessage(e, "수업 기록 저장에 실패했습니다."));
      setBusy(false);
    }
  };

  return (
    <EditorFrame
      back={back}
      title={workout ? "수업 기록 수정" : "수업 기록"}
      name={member.name}
      subtitle={
        workout
          ? `${formatDate(workout.date)} 기록을 고칩니다.`
          : "종목을 남기면 수업 1회가 함께 기록됩니다. 상담처럼 남길 운동이 없는 날은 종목 없이 저장하세요."
      }
      aside={
        !workout && (
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
        {!workout && member.remainingSessions === 0 && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold leading-relaxed text-danger">
            남은 수업이 없어 기록을 저장할 수 없습니다. 회원 정보에서 수업 횟수를 먼저 늘려 주세요.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 whitespace-nowrap text-sm font-semibold">날짜</span>
          <DatePicker value={date} onChange={setDate} max={today()} />
          <HourPicker value={hour} onChange={setHour} ariaLabel="수업 시각" />
        </div>

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
              {lastSets[row.name.trim()] && (
                <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-2xs font-bold text-primary-dark dark:text-primary-bright">
                  지난 {lastSets[row.name.trim()]}
                </span>
              )}
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
                        {setLabel(set)}
                      </span>
                    </li>
                  ) : (
                    <li
                      key={s}
                      className="grid grid-cols-2 items-center gap-2 rounded-lg p-1 sm:flex sm:min-w-0 sm:gap-3"
                    >
                      <div className="col-span-2 flex items-center justify-between sm:w-14 sm:shrink-0">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">{s + 1}세트</span>
                          <BodyweightToggle
                            on={set.bodyweight}
                            label={`${s + 1}세트 바디웨이트`}
                            onToggle={() => patchSet(i, s, { bodyweight: !set.bodyweight })}
                            className="flex h-9 sm:hidden"
                          />
                        </span>
                        {row.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              patchExercise(i, { sets: row.sets.filter((_, m) => m !== s) })
                            }
                            aria-label={`${s + 1}세트 삭제`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger sm:hidden"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        )}
                      </div>

                      <Stepper
                        label={`${s + 1}세트 횟수`}
                        unit="회"
                        value={set.reps}
                        step={1}
                        min={1}
                        inputMode="numeric"
                        wide={set.bodyweight}
                        onChange={(reps) => patchSet(i, s, { reps })}
                      />

                      {!set.bodyweight && (
                        <Stepper
                          label={`${s + 1}세트 무게`}
                          unit="kg"
                          value={set.weight}
                          step={WEIGHT_STEP}
                          min={0}
                          inputMode="decimal"
                          placeholder="무게"
                          onChange={(weight) => patchSet(i, s, { weight })}
                        />
                      )}

                      <BodyweightToggle
                        on={set.bodyweight}
                        label={`${s + 1}세트 바디웨이트`}
                        onToggle={() => patchSet(i, s, { bodyweight: !set.bodyweight })}
                        className="hidden h-11 sm:flex"
                      />

                      {row.sets.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            patchExercise(i, { sets: row.sets.filter((_, m) => m !== s) })
                          }
                          aria-label={`${s + 1}세트 삭제`}
                          className="hidden h-11 w-11 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-danger sm:grid"
                        >
                          <Icon name="close" size={17} />
                        </button>
                      )}
                    </li>
                  ),
                )}
              </ol>

              {row.editing && (
                <button
                  type="button"
                  onClick={() => addSet(i)}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-canvas text-sm font-bold text-ink transition-colors hover:bg-raised"
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

        {sessionOnly && !workout && (
          <div className="flex flex-col gap-2.5">
            <input
              className="h-12 w-full rounded-xl border-[1.5px] border-edge bg-surface px-3.5 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="사유 — 상담, 체형 평가 등 (선택)"
              aria-label="사유"
              maxLength={40}
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setReason(label)}
                  className="h-9 rounded-full border border-line bg-surface px-3.5 text-xs font-bold text-muted-foreground transition-colors hover:border-edge hover:text-ink"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          className="h-24 w-full resize-none rounded-xl border-[1.5px] border-edge bg-surface px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 — 폼 체크, 컨디션 등"
          aria-label="메모"
        />


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

        <div className="flex gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push(back)} className="px-5">
            취소
          </Button>
          <Button type="submit" loading={busy} className="flex-1 sm:flex-none sm:px-7">
            {workout ? "수정 저장" : sessionOnly ? "수업만 기록" : "저장"}
          </Button>
        </div>
      </form>
    </EditorFrame>
  );
}

/** 세트 바디웨이트 켜고 끄기 */
function BodyweightToggle({
  on,
  label,
  onToggle,
  className,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
      className={`shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-bold transition-colors ${className} ${
        on
          ? "bg-primary-light text-primary-dark dark:text-primary-bright"
          : "bg-canvas text-muted-foreground hover:bg-raised hover:text-ink"
      }`}
    >
      {on && <Icon name="check" size={14} />}
      바디웨이트
    </button>
  );
}

/** −/+ 버튼으로 숫자를 바꾸는 입력. 가운데 숫자를 누르면 직접 입력할 수 있다. */
function Stepper({
  label,
  unit,
  value,
  step,
  min,
  inputMode,
  placeholder = "0",
  wide = false,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  step: number;
  min: number;
  inputMode: "numeric" | "decimal";
  placeholder?: string;
  /** 옆 칸(무게)이 없을 때 */
  wide?: boolean;
  onChange: (value: string) => void;
}) {
  const current = Number(value) || 0;
  const bump = (delta: number) => onChange(String(Math.max(min, round1(current + delta))));

  return (
    <div
      className={`flex h-11 min-w-0 items-center overflow-hidden rounded-lg bg-canvas sm:flex-1 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={current <= min}
        aria-label={`${label} 줄이기`}
        className="grid h-full w-9 shrink-0 place-items-center rounded-l-lg sm:w-11 text-muted-foreground transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
      >
        <Icon name="minus" size={17} />
      </button>
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-right text-md font-bold tabular-nums outline-none placeholder:text-line-strong"
        />
        <span className="shrink-0 pr-1.5 text-xs font-semibold text-muted-foreground">
          {unit}
        </span>
      </label>
      <button
        type="button"
        onClick={() => bump(step)}
        aria-label={`${label} 늘리기`}
        className="grid h-full w-9 shrink-0 place-items-center rounded-r-lg sm:w-11 text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
      >
        <Icon name="plus" size={17} />
      </button>
    </div>
  );
}
