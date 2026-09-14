/*
  회원 상세·내 기록 화면 — 수업 기록 섹션 (수업 이력 + 종목×세트 표)
  수업 하나가 한 줄 — 종목을 남긴 수업은 표를, 운동 없이 차감한 수업은 사유를 보여준다.

  @date : 2026-09-12
*/

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/custom/empty-state";
import { formatDateShort, formatDayShort, formatHour } from "@/lib/client";
import type {
  Exercise,
  ExerciseSet,
  SessionCompletion,
  Workout,
} from "@/lib/types";
import { IconButton, Section, SectionAction } from "./section";

/** 처음 펼쳐 두는 수 */
const VISIBLE = 6;

/** 더 보기 한 번에 늘리는 수 (lib/queries LESSON_PAGE와 같다) */
const PAGE = 20;

/** 목록에 그리는 수업 한 건. 둘 중 하나는 반드시 있다. */
interface SessionEntry {
  key: string;
  /** 정렬용 시각 */
  at: number;
  label: string;
  /** 몇 번째 수업인지. 완료 내역이 붙은 것만 센다. */
  no?: number;
  /** 완료 시각. 운동 기록만 있는 옛 자료에는 없다. */
  hour?: string;
  completion?: SessionCompletion;
  workout?: Workout;
}

/** 완료 내역과 운동 기록을 시간순 한 줄기로 엮는다. */
function buildEntries(
  completions: SessionCompletion[],
  workouts: Workout[],
  completionTotal: number,
  limit: number,
): SessionEntry[] {
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const used = new Set<string>();

  const entries: SessionEntry[] = completions.map((completion) => {
    const workout = completion.workoutId
      ? byId.get(completion.workoutId)
      : undefined;
    if (workout) used.add(workout.id);
    return {
      key: `c-${completion.id}`,
      at: new Date(completion.completedAt).getTime(),
      label: formatDayShort(completion.completedAt),
      hour: formatHour(completion.completedAt),
      completion,
      workout,
    };
  });

  // 남은 수업이 없을 때 저장한 기록은 완료 내역 없이 홀로 남는다.
  for (const workout of workouts) {
    if (used.has(workout.id)) continue;
    entries.push({
      key: `w-${workout.id}`,
      at: new Date(`${workout.date}T12:00`).getTime(),
      label: formatDateShort(workout.date),
      workout,
    });
  }

  entries.sort((a, b) => b.at - a.at);
  // 두 목록을 각각 최근 limit건씩 받았으므로 합친 뒤 앞의 limit건만 정확하다.
  entries.splice(limit);

  // 회차는 오래된 것부터 1번이다. 최신순 목록이라 전체 수에서 거꾸로 매긴다.
  let no = completionTotal;
  for (const entry of entries) {
    if (!entry.completion) continue;
    entry.no = no;
    no -= 1;
  }

  return entries;
}

export function LessonHistory({
  id,
  memberId,
  completions,
  workouts,
  completionTotal,
  lessonTotal,
  lessonLimit,
  busy = false,
  readOnly = false,
  onDeleteWorkout,
  onDeleteCompletion,
}: {
  id?: string;
  memberId: string;
  completions: SessionCompletion[];
  workouts: Workout[];
  completionTotal: number;
  lessonTotal: number;
  /** 서버에서 받아 온 수업 기록 수 */
  lessonLimit: number;
  busy?: boolean;
  /** 회원 본인 화면 — 추가·수정·삭제 버튼을 숨긴다. */
  readOnly?: boolean;
  onDeleteWorkout?: (workout: Workout, completionId?: string) => void;
  onDeleteCompletion?: (completion: SessionCompletion) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, startLoading] = useTransition();
  const [shown, setShown] = useState(VISIBLE);

  const entries = buildEntries(completions, workouts, completionTotal, lessonLimit);
  const rows = entries.slice(0, shown);
  const hidden = lessonTotal - rows.length;

  const showMore = () => {
    const next = shown + PAGE;
    setShown(next);
    // 받아 온 것을 넘어서면 다음 묶음을 서버에서 받는다.
    if (next > entries.length && lessonTotal > entries.length) {
      startLoading(() =>
        router.replace(`${pathname}?lessons=${lessonLimit + PAGE}`, { scroll: false }),
      );
    }
  };

  return (
    <Section
      id={id}
      title="수업 기록"
      subtitle={
        lessonTotal > 0
          ? `총 ${lessonTotal}회 · 최신순`
          : "세트마다 횟수와 무게를 따로 기록합니다."
      }
      action={
        readOnly ? undefined : (
          <SectionAction
            icon="plus"
            label="기록 추가"
            href={`/members/${memberId}/workouts/new`}
          />
        )
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="기록한 수업이 없습니다"
          description={
            readOnly
              ? "수업을 받으면 여기에 기록이 쌓입니다."
              : "기록 추가를 눌러 오늘 진행한 종목을 남겨보세요."
          }
        />
      ) : (
        <>
          <ul className="flex flex-col">
            {rows.map((entry) => (
              <SessionRow
                key={entry.key}
                entry={entry}
                memberId={memberId}
                busy={busy}
                readOnly={readOnly}
                onDeleteWorkout={onDeleteWorkout}
                onDeleteCompletion={onDeleteCompletion}
              />
            ))}
          </ul>

          {(hidden > 0 || shown > VISIBLE) && (
            <button
              type="button"
              onClick={hidden > 0 ? showMore : () => setShown(VISIBLE)}
              disabled={loading}
              className="mt-1 w-full rounded-lg py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
            >
              {loading ? "불러오는 중…" : hidden > 0 ? `더 보기 (${hidden}회)` : "접기"}
            </button>
          )}
        </>
      )}
    </Section>
  );
}

function SessionRow({
  entry,
  memberId,
  busy,
  readOnly,
  onDeleteWorkout,
  onDeleteCompletion,
}: {
  entry: SessionEntry;
  memberId: string;
  busy: boolean;
  readOnly: boolean;
  onDeleteWorkout?: (workout: Workout, completionId?: string) => void;
  onDeleteCompletion?: (completion: SessionCompletion) => void;
}) {
  const { workout, completion } = entry;

  const actions = readOnly ? null : (
    <span className="flex shrink-0 gap-1">
      {workout && (
        <IconButton
          icon="pencil"
          label="수업 기록 수정"
          href={`/members/${memberId}/workouts/${workout.id}`}
        />
      )}
      <IconButton
        icon="trash"
        label="수업 기록 삭제"
        danger
        disabled={busy}
        onClick={() =>
          workout
            ? onDeleteWorkout?.(workout, completion?.id)
            : completion && onDeleteCompletion?.(completion)
        }
      />
    </span>
  );

  const sets = workout
    ? workout.exercises.reduce((n, e) => n + e.sets.length, 0)
    : 0;

  const meta = [
    entry.hour,
    workout && `종목 ${workout.exercises.length}개`,
    workout && `${sets}세트`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-col gap-2.5 border-b border-line py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="w-14 shrink-0 text-sm font-extrabold tabular-nums text-primary">
            {entry.no !== undefined ? `${entry.no}회차` : ""}
          </span>
          <p className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-extrabold">{entry.label}</span>
            {meta && (
              <span className="text-2xs font-semibold text-subtle">{meta}</span>
            )}
          </p>
        </div>
        {actions}
      </div>

      {workout && (
        <div className="flex min-w-0 flex-col gap-3">
          <SetGrid exercises={workout.exercises} />
          {workout.memo && <Memo text={workout.memo} />}
        </div>
      )}

      {!workout && completion?.reason && (
        <p className="text-sm font-semibold text-muted-foreground">
          {completion.reason}
        </p>
      )}
    </li>
  );
}

function Memo({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap rounded-r-lg border-l-[3px] border-primary bg-primary-light/40 py-1.5 pr-3 pl-3 text-xs leading-relaxed text-ink">
      {text}
    </p>
  );
}

/** 종목 × 세트 표 */
function SetGrid({ exercises }: { exercises: Exercise[] }) {
  const columns = Math.max(0, ...exercises.map((e) => e.sets.length));
  const head = "border-line pb-1.5 text-2xs font-semibold whitespace-nowrap text-subtle";
  const body = "border-t border-line py-2 whitespace-nowrap";
  const pinNo = "sticky left-0 z-10 border-r bg-canvas";
  const pinName = "sticky left-7 z-10 border-r bg-canvas";
  const divider = (i: number) => (i < columns - 1 ? "border-r" : "");

  return (
    <div className="overflow-x-auto">
      <div
        className="grid w-max grid-cols-[1.75rem_max-content_repeat(var(--sets),minmax(4rem,max-content))] tabular-nums"
        style={{ "--sets": columns } as React.CSSProperties}
      >
        {/* 머리 */}
        <div className="contents">
          <span className={`${head} ${pinNo} text-center`}>No</span>
          <span className={`${head} ${pinName} px-3`}>종목</span>
          {Array.from({ length: columns }, (_, i) => (
            <span key={i} className={`${head} ${divider(i)} px-2.5 text-center`}>
              {i + 1}세트
            </span>
          ))}
        </div>

        {exercises.map((exercise, index) => {
          const bodyweightOnly = exercise.sets.every(
            (s) => s.unit === "bodyweight",
          );

          return (
            <div key={exercise.id} className="contents">
              <span className={`${body} ${pinNo} text-center text-xs font-semibold text-subtle`}>
                {index + 1}
              </span>
              <span
                className={`${body} ${pinName} flex items-center gap-2 px-3 text-sm font-semibold`}
              >
                <span>{exercise.name}</span>
                {bodyweightOnly && <BodyweightBadge />}
              </span>

              {Array.from({ length: columns }, (_, i) => {
                const set = exercise.sets[i];
                return (
                  <span
                    key={set?.id ?? i}
                    className={`${body} ${divider(i)} flex items-center justify-center px-2.5`}
                  >
                    {set && <SetChip set={set} bodyweightOnly={bodyweightOnly} />}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 세트 하나 — "60kg × 12회", 바디웨이트면 "12회" */
function SetChip({
  set,
  bodyweightOnly,
}: {
  set: ExerciseSet;
  bodyweightOnly: boolean;
}) {
  return (
    <span className="inline-flex items-baseline rounded-md bg-raised px-1.5 py-0.5">
      {bodyweightOnly ? (
        <>
          <Num>{set.reps}</Num>
          <Unit>회</Unit>
        </>
      ) : (
        <>
          {set.unit === "bodyweight" ? (
            <span className="mr-1 text-2xs font-semibold text-subtle">바디웨이트</span>
          ) : (
            <>
              <Num>{set.weight}</Num>
              <Unit>kg</Unit>
              <span className="mx-0.5 text-2xs text-subtle">×</span>
            </>
          )}
          <span className="text-xs font-semibold text-muted-foreground">
            {set.reps}
            <Unit>회</Unit>
          </span>
        </>
      )}
    </span>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-ink">{children}</span>;
}

function Unit({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-px text-2xs font-semibold text-subtle">{children}</span>
  );
}

function BodyweightBadge() {
  return (
    <span className="rounded-full bg-raised px-2 py-0.5 text-2xs font-bold whitespace-nowrap text-muted-foreground">
      바디웨이트
    </span>
  );
}
