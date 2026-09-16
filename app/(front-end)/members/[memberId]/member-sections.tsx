/*
  회원 상세·내 기록 화면 — 기록 섹션 (섹션 틀, 수업 기록, 코칭 메모, 체중·그래프, 영양)
  트레이너가 보는 회원 상세와 회원 본인이 보는 내 기록이 함께 쓴다.
  회원 본인 화면은 readOnly로 넘겨 추가·수정·삭제 버튼을 숨긴다.

  @date : 2026-09-16
*/

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/custom/date-picker";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon, type IconName } from "@/components/custom/icons";
import { useTheme } from "@/components/custom/theme";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatDateShort, formatDayShort, formatHour, today } from "@/lib/client";
import { kstDay } from "@/lib/kst";
import { ACTIVITY_HINT, GOAL_LABEL } from "@/lib/nutrition";
import type {
  CoachingNote,
  Exercise,
  ExerciseSet,
  NutritionProfile,
  SessionCompletion,
  WeightRecord,
  Workout,
} from "@/lib/types";
import { isValidWeight, WEIGHT_RANGE_MESSAGE } from "@/lib/weight";

// ── 섹션 틀 ───────────────────────────────

/** 회원 상세의 한 덩어리(운동 기록, 체중, 코칭 메모 …). 제목 옆에 보조 동작을 둔다. */
export function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  /** 히어로의 버튼이 이 섹션으로 스크롤할 때 쓴다. */
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3.5">
      <div className="flex items-end justify-between gap-3 border-b border-line pb-2.5">
        <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-0.5">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
          {subtitle && (
            <p className="text-xs text-subtle">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 섹션 머리의 보조 동작 */
export function SectionAction({
  icon,
  label,
  onClick,
  href,
  active = false,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  /** 주면 링크로 그린다. 작성 화면이 페이지인 섹션이 쓴다. */
  href?: string;
  active?: boolean;
}) {
  const className = `flex h-8 shrink-0 items-center gap-1 rounded-lg text-sm font-bold transition-colors ${
    active ? "text-ink" : "text-primary hover:text-primary-dark"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon name={icon} size={16} />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={className}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

/** 목록 항목의 수정·삭제처럼 글자 없이 아이콘만 두는 동작. */
export function IconButton({
  icon,
  label,
  onClick,
  href,
  danger = false,
  active = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  /** 주면 링크로 그린다. */
  href?: string;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = `grid size-9 shrink-0 place-items-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40 ${
    active
      ? "bg-primary-light text-primary-dark dark:text-primary-bright"
      : danger
        ? "text-subtle hover:bg-danger/8 hover:text-danger"
        : "text-subtle hover:bg-raised hover:text-ink"
  }`;

  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={className}>
        <Icon name={icon} size={15} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={className}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

// ── 수업 기록 ──────────────────────────────

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

// ── 코칭 메모 ──────────────────────────────

const FIELDS = [
  ["통증", "pain"],
  ["자세 문제", "posture"],
  ["움직임 평가", "movement"],
  ["숙제", "homework"],
] as const;

/** 통증·자세·움직임·숙제를 남겨 다음 수업으로 이어간다. */
export function NoteSection({
  memberId,
  notes,
  readOnly = false,
  onDelete,
}: {
  memberId: string;
  notes: CoachingNote[];
  /** 회원 본인 화면 — 작성·수정·삭제 버튼을 숨긴다. */
  readOnly?: boolean;
  onDelete?: (note: CoachingNote) => void;
}) {
  const base = `/members/${memberId}/notes`;

  return (
    <Section
      title="코칭 메모"
      subtitle={
        notes.length > 0
          ? `총 ${notes.length}건 · 최신순`
          : "통증, 자세와 움직임 평가를 다음 수업에 활용하세요."
      }
      action={
        readOnly ? undefined : (
          <SectionAction icon="plus" label="메모 작성" href={`${base}/new`} />
        )
      }
    >
      {notes.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="코칭 메모가 없습니다"
          description={
            readOnly
              ? "트레이너가 남긴 코칭 메모가 여기에 보입니다."
              : "통증·자세·움직임·숙제를 남겨 다음 수업에 이어가세요."
          }
        />
      ) : (
        <ul className="flex flex-col">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-line py-4 last:border-0 last:pb-0 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{formatDateShort(note.date)}</p>
                <div className={readOnly ? "hidden" : "flex gap-1"}>
                  <IconButton
                    icon="pencil"
                    label="코칭 메모 수정"
                    href={`${base}/${note.id}`}
                  />
                  <IconButton
                    icon="trash"
                    label="코칭 메모 삭제"
                    danger
                    onClick={() => onDelete?.(note)}
                  />
                </div>
              </div>

              <dl className="mt-3 flex flex-col gap-2.5">
                {FIELDS.filter(([, key]) => note[key]).map(([label, key]) => (
                  <div key={key}>
                    <dt className="text-2xs font-bold uppercase tracking-wide text-subtle">
                      {label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                      {note[key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── 체중 ──────────────────────────────────

export interface WeightPayload {
  date: string;
  weight: number;
  memo: string | null;
}

/** 체중 기록. 맨 위가 최신이고, 그 값이 회원 요약의 최신 체중이 된다. */
export function WeightSection({
  weights,
  targetWeight,
  readOnly = false,
  formOpen = false,
  busy = false,
  serverError = null,
  onToggle,
  onSubmit,
  onSaveGoal,
  onCancel,
  onDelete,
}: {
  weights: WeightRecord[];
  targetWeight: number | null;
  /** 회원 본인 화면 — 기록·삭제·목표 수정을 숨긴다. 이때 아래 핸들러는 넘기지 않는다. */
  readOnly?: boolean;
  formOpen?: boolean;
  busy?: boolean;
  serverError?: string | null;
  onToggle?: () => void;
  onSubmit?: (payload: WeightPayload) => void;
  onSaveGoal?: (targetWeight: number | null) => void;
  onCancel?: () => void;
  onDelete?: (record: WeightRecord) => void;
}) {
  return (
    <Section
      title="체중 기록"
      subtitle={
        weights.length > 0
          ? `총 ${weights.length}건 · 최신순`
          : "체중 변화를 기록해 보세요."
      }
      action={
        readOnly ? undefined : (
          <SectionAction icon="plus" label="체중 기록" onClick={onToggle} />
        )
      }
    >
      {/* 입력 창 */}
      {!readOnly && onSubmit && onCancel && (
        <Dialog
          open={formOpen}
          onOpenChange={(next) => {
            if (!next) onCancel();
          }}
        >
          <DialogContent dismissOnOutsideClick>
            <DialogHeader>
              <DialogTitle>체중 기록</DialogTitle>
            </DialogHeader>
            <WeightForm busy={busy} serverError={serverError} onSubmit={onSubmit} />
          </DialogContent>
        </Dialog>
      )}

      {weights.length === 0 ? (
        <EmptyState
          icon="trend"
          title="체중 기록이 없습니다"
          description={
            readOnly
              ? "트레이너가 체중을 기록하면 여기에 그래프로 보입니다."
              : "첫 체중을 기록하고 변화를 확인해 보세요."
          }
        />
      ) : (
        <>
          {/* 그래프 */}
          <WeightChartCard
            weights={weights}
            targetWeight={targetWeight}
            busy={busy}
            onSaveGoal={readOnly ? undefined : onSaveGoal}
          />

          {/* 목록 */}
          <ul className="flex flex-col divide-y divide-line">
            {weights.map((record) => (
              <li
                key={record.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-base font-bold">
                    {record.weight}
                    <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
                      kg
                    </span>
                    <span className="ml-2.5 text-xs font-medium text-muted-foreground">
                      {formatDateShort(record.date)}
                    </span>
                  </p>
                  {record.memo && (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {record.memo}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <IconButton
                    icon="trash"
                    label={`${record.date} 체중 기록 삭제`}
                    danger
                    onClick={() => onDelete?.(record)}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

function WeightForm({
  busy,
  serverError,
  onSubmit,
}: {
  busy: boolean;
  serverError: string | null;
  onSubmit: (payload: WeightPayload) => void;
}) {
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      setError("날짜를 선택해 주세요.");
      return;
    }

    const parsed = Number(weight);
    if (weight.trim() === "" || !isValidWeight(parsed)) {
      setError(WEIGHT_RANGE_MESSAGE);
      return;
    }

    onSubmit({ date, weight: parsed, memo: memo.trim() || null });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <DatePicker
          value={date}
          onChange={setDate}
          max={today()}
          ariaLabel="측정 날짜"
        />
        <div className="flex items-center gap-1.5">
          <input
            className="w-24 rounded-xl border border-line bg-surface px-3 py-2 text-center text-md font-bold outline-none focus:border-primary"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            placeholder="72.5"
            aria-label="체중"
            autoFocus
          />
          <span className="text-sm font-semibold text-muted-foreground">kg</span>
        </div>
      </div>

      <Input
        className="bg-surface py-2"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 — 공복 측정, 운동 후 측정 등"
        aria-label="메모"
      />

      {(error || serverError) && (
        <p className="text-sm text-danger">{error ?? serverError}</p>
      )}

      <Button type="submit" loading={busy}>
        기록하기
      </Button>
    </form>
  );
}

// ── 영양 ──────────────────────────────────

/** 계산 결과를 읽는 자리. 계산 자체는 /members/:id/nutrition 화면에서 한다. */
export function NutritionPanel({
  memberId,
  nutrition,
  readOnly = false,
}: {
  memberId: string;
  nutrition: NutritionProfile | null;
  /** 회원 본인 화면 — 다시 계산 버튼을 숨긴다. */
  readOnly?: boolean;
}) {
  const href = `/members/${memberId}/nutrition`;

  return (
    <Section
      title="칼로리 및 영양 계산"
      subtitle={
        nutrition
          ? `${GOAL_LABEL[nutrition.goal]} 목표 · ${formatDate(kstDay(nutrition.updatedAt))} 계산`
          : "회원의 신체 정보와 목표에 맞춘 일일 섭취 기준입니다."
      }
      action={
        nutrition && !readOnly ? (
          <SectionAction icon="flame" label="다시 계산" href={href} />
        ) : null
      }
    >
      {!nutrition ? (
        <EmptyState
          icon="flame"
          title="영양 계산 시작"
          description="성별, 나이, 키, 체중과 활동량을 입력해 섭취 기준을 계산하세요."
          action={
            <Button asChild>
              <Link href={href}>영양 계산하기</Link>
            </Button>
          }
        />
      ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-light px-4 py-3">
              <p className="text-xs font-bold text-primary-dark dark:text-primary-bright">
                목표 섭취 칼로리
              </p>
              <p className="text-xl font-extrabold leading-none tracking-tight">
                {nutrition.targetCalories}
                <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
                  kcal
                </span>
              </p>
            </div>

            <dl className="rounded-xl bg-surface px-4 divide-y divide-line">
              <Row label="기초대사량" value={nutrition.bmr} unit="kcal" />
              <Row
                label="유지칼로리"
                value={nutrition.maintenanceCalories}
                unit="kcal"
              />
              <Row
                label="단백질"
                value={nutrition.protein}
                unit="g"
                hint={`${nutrition.proteinMin}~${nutrition.proteinMax}g`}
              />
              <Row label="탄수화물" value={nutrition.carbs} unit="g" />
              <Row label="지방" value={nutrition.fat} unit="g" />
            </dl>

            <div className="flex flex-wrap gap-1.5 text-xs">
              <Chip>
                {nutrition.gender === "male" ? "남성" : "여성"} · {nutrition.age}세
              </Chip>
              <Chip>
                {nutrition.height}cm · {nutrition.weight}kg
              </Chip>
              <Chip>{ACTIVITY_HINT[nutrition.activityLevel]}</Chip>
              <Chip>
                {nutrition.bodyFatPercentage
                  ? `체지방률 ${nutrition.bodyFatPercentage}%`
                  : "체지방률 미입력"}
              </Chip>
              {nutrition.skeletalMuscleMass && (
                <Chip>골격근량 {nutrition.skeletalMuscleMass}kg</Chip>
              )}
              {nutrition.calculatedLeanBodyMass && (
                <Chip>제지방량 {nutrition.calculatedLeanBodyMass}kg</Chip>
              )}
            </div>

            <CalculationBasis lines={nutrition.calculationBasis} />

            <p className="text-xs leading-relaxed text-muted-foreground">
              제지방량이 있으면 체성분 기반 기초대사량을 사용합니다. 결과는 코칭
              참고용 추정치이며 의료 또는 영양 처방을 대신하지 않습니다.
            </p>
        </div>
      )}
    </Section>
  );
}

/** 계산 기준 (접었다 펴기) */
function CalculationBasis({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-sm font-semibold"
      >
        <Icon
          name="chevronRight"
          size={16}
          className={`shrink-0 text-subtle transition-transform duration-300 ${
            open ? "rotate-90" : ""
          }`}
        />
        계산 기준
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {lines.map((line, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
              >
                <span aria-hidden="true">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-xs font-semibold text-muted-foreground">
        {label}
        {hint && <span className="ml-1.5 text-2xs text-subtle">{hint}</span>}
      </dt>
      <dd className="text-base font-extrabold tracking-tight">
        {value}
        <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
          {unit}
        </span>
      </dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1 font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

// ── 체중 그래프 ─────────────────────────────

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
