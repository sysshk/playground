/*
  회원 상세·내 기록 화면 — 탭과 기록 섹션 (수업 기록, 코칭 메모, 개인 운동, Q&A, 체중·인바디·그래프, 식단)
  트레이너가 보는 회원 상세와 회원 본인이 보는 내 기록이 함께 씀
  회원 본인 화면은 readOnly로 넘겨 추가·수정·삭제 버튼을 숨김

  @date : 2026-09-16
*/

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { DatePicker, HourPicker } from "@/components/custom/date-picker";
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
import {
  apiFetch,
  errorMessage,
  formatDate,
  formatDateShort,
  formatDayShort,
  formatHour,
  formatHourLabel,
  today,
} from "@/lib/client";
import { holidayName } from "@/lib/holidays";
import { kstDay, kstHour, shiftDay, shiftMonth } from "@/lib/kst";
import { ACTIVITY_HINT, GOAL_LABEL, type Gender } from "@/lib/nutrition";
import {
  ANSWER_MAX,
  BALANCE_LABEL,
  formatRest,
  isInbody,
  MEAL_DAYS,
  MEAL_SLOT_LABEL,
  MEAL_SLOTS,
  MEMBER_TABS,
  QUESTION_MAX,
  type Balance,
  type CoachingNote,
  type Exercise,
  type ExerciseSet,
  type Meal,
  type MemberTab,
  type NutritionProfile,
  type Question,
  type SessionCompletion,
  type WeightRecord,
  type Workout,
} from "@/lib/types";
import { isValidWeight, WEIGHT_RANGE_MESSAGE } from "@/lib/weight";

// ── 섹션 틀 ───────────────────────────────

/** 회원 상세의 한 덩어리(운동 기록, 체중, 코칭 메모 …). 제목 옆에 보조 동작을 둠 */
export function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  /** 히어로의 버튼이 이 섹션으로 스크롤할 때 씀 */
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
          {subtitle && <p className="text-xs text-subtle">{subtitle}</p>}
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
  /** 주면 링크로 그림. 작성 화면이 페이지인 섹션이 씀 */
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
  /** 주면 링크로 그림 */
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

// ── 탭 ───────────────────────────────────

const TAB_LABEL: Record<MemberTab, string> = {
  lessons: "PT",
  body: "InBody",
  diet: "식단",
  personal: "개인 운동",
  qna: "Q&A",
};

/**
 * 회원 상세·내 기록의 탭. 고른 탭은 주소(?tab=)에만 남기고 서버에 다시 묻지 않음
 * 새로고침하거나 작성 화면에서 돌아와도 그 탭이 열림
 */
export function MemberTabs({
  initial,
  badges = {},
  panels,
}: {
  initial: MemberTab;
  /** 탭 이름 옆 숫자 — 답을 기다리는 질문 수 등 */
  badges?: Partial<Record<MemberTab, number>>;
  panels: Record<MemberTab, ReactNode>;
}) {
  const [tab, setTab] = useState(initial);

  const select = (next: MemberTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "lessons") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="회원 기록"
        className="flex w-full border-b border-line"
      >
        {MEMBER_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => select(key)}
            className={`-mb-px flex h-12 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 text-base font-bold transition-colors ${
              tab === key
                ? "border-primary text-ink"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {TAB_LABEL[key]}
            {!!badges[key] && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-2xs font-extrabold text-white">
                {badges[key]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        aria-label={TAB_LABEL[tab]}
        className="flex flex-col gap-9"
      >
        {panels[tab]}
      </div>
    </div>
  );
}

/** 저장·삭제하고 화면을 서버에서 다시 받음. 섹션 안에서 바로 쓰는 동작용 */
function useSave() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  const run = async (
    url: string,
    init: RequestInit,
    ok: string,
    fail: string,
  ) => {
    setSaving(true);
    try {
      await apiFetch(url, init);
      startRefresh(() => router.refresh());
      toast(ok);
      return true;
    } catch (e) {
      toast(errorMessage(e, fail));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { run, busy: saving || refreshing };
}

// ── 수업 기록 ──────────────────────────────

/** 처음 펼쳐 두는 수 */
const VISIBLE = 6;

/** 더 보기 한 번에 늘리는 수 (lib/queries LESSON_PAGE와 같음) */
const PAGE = 20;

/** 목록에 그리는 수업 한 건. 둘 중 하나는 반드시 있음 */
interface SessionEntry {
  key: string;
  /** 정렬용 시각 */
  at: number;
  label: string;
  /** 몇 번째 수업인지. 완료 내역이 붙은 것만 셈 */
  no?: number;
  /** 완료 시각. 운동 기록만 있는 옛 자료에는 없음 */
  hour?: string;
  completion?: SessionCompletion;
  workout?: Workout;
}

/** 완료 내역과 운동 기록을 시간순 한 줄기로 엮음 */
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

  // 남은 수업이 없을 때 저장한 기록은 완료 내역 없이 홀로 남음
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
  // 두 목록을 각각 최근 limit건씩 받았으므로 합친 뒤 앞의 limit건만 정확함
  entries.splice(limit);

  // 회차는 오래된 것부터 1번임. 최신순 목록이라 전체 수에서 거꾸로 매김
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
  /** 회원 본인 화면 — 추가·수정·삭제 버튼을 숨김 */
  readOnly?: boolean;
  onDeleteWorkout?: (workout: Workout, completionId?: string) => void;
  onDeleteCompletion?: (completion: SessionCompletion) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, startLoading] = useTransition();
  const [shown, setShown] = useState(VISIBLE);

  const entries = buildEntries(
    completions,
    workouts,
    completionTotal,
    lessonLimit,
  );
  const rows = entries.slice(0, shown);
  const hidden = lessonTotal - rows.length;

  const showMore = () => {
    const next = shown + PAGE;
    setShown(next);
    // 받아 온 것을 넘어서면 다음 묶음을 서버에서 받음
    if (next > entries.length && lessonTotal > entries.length) {
      startLoading(() =>
        router.replace(`${pathname}?lessons=${lessonLimit + PAGE}`, {
          scroll: false,
        }),
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
              {loading
                ? "불러오는 중…"
                : hidden > 0
                  ? `더 보기 (${hidden}회)`
                  : "접기"}
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

      {!workout && completion?.reason && <Memo text={completion.reason} />}
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
  // 세트 간 휴식을 적은 종목이 있을 때만 맨 오른쪽에 휴식 칸
  const hasRest = exercises.some((e) => e.restSeconds != null);
  const head =
    "border-line pb-1.5 text-2xs font-semibold whitespace-nowrap text-subtle";
  const body = "border-t border-line py-2 whitespace-nowrap";
  const pinNo = "sticky left-0 z-10 border-r bg-canvas";
  const pinName = "sticky left-7 z-10 border-r bg-canvas";
  const divider = (i: number) => (i < columns - 1 || hasRest ? "border-r" : "");

  return (
    <div className="overflow-x-auto">
      <div
        className={`grid w-max tabular-nums ${
          hasRest
            ? "grid-cols-[1.75rem_max-content_repeat(var(--sets),minmax(4rem,max-content))_max-content]"
            : "grid-cols-[1.75rem_max-content_repeat(var(--sets),minmax(4rem,max-content))]"
        }`}
        style={{ "--sets": columns } as React.CSSProperties}
      >
        {/* 머리 */}
        <div className="contents">
          <span className={`${head} ${pinNo} text-center`}>No</span>
          <span className={`${head} ${pinName} pl-3 pr-2`}>종목</span>
          {Array.from({ length: columns }, (_, i) => (
            <span
              key={i}
              className={`${head} ${divider(i)} px-2.5 text-center`}
            >
              {i + 1}세트
            </span>
          ))}
          {hasRest && <span className={`${head} px-2.5 text-center`}>휴식</span>}
        </div>

        {exercises.map((exercise, index) => {
          const bodyweightOnly = exercise.sets.every(
            (s) => s.unit === "bodyweight",
          );

          return (
            <div key={exercise.id} className="contents">
              <span
                className={`${body} ${pinNo} text-center text-xs font-semibold text-subtle`}
              >
                {index + 1}
              </span>
              {/* 폰에서는 이름과 배지를 두 줄로 쌓아 종목 칸 폭을 줄임 */}
              <span
                className={`${body} ${pinName} flex max-w-36 flex-col items-start justify-center gap-1 pl-3 pr-2 text-sm font-semibold md:max-w-none md:flex-row md:items-center md:justify-start md:gap-2`}
              >
                <span className="whitespace-normal md:whitespace-nowrap">
                  {exercise.name}
                </span>
                {bodyweightOnly && <BodyweightBadge />}
              </span>

              {Array.from({ length: columns }, (_, i) => {
                const set = exercise.sets[i];
                return (
                  <span
                    key={set?.id ?? i}
                    className={`${body} ${divider(i)} flex items-center justify-center px-2.5`}
                  >
                    {set && (
                      <SetChip set={set} bodyweightOnly={bodyweightOnly} />
                    )}
                  </span>
                );
              })}
              {hasRest && (
                <span className={`${body} flex items-center justify-center px-2.5 text-xs font-bold text-muted-foreground`}>
                  {exercise.restSeconds != null ? formatRest(exercise.restSeconds) : <span className="text-line-strong">—</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 세트 하나 — "60kg × 12회", 좌우면 "좌 10 우 12.5kg × 12회", 바디웨이트면 "12회" */
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
            <span className="mr-1 text-xs font-bold text-ink">바디웨이트</span>
          ) : set.unit === "sides" ? (
            <>
              <Side>좌</Side>
              <Num>{set.weight}</Num>
              <Side className="ml-1">우</Side>
              <Num>{set.weightRight}</Num>
              <Unit>kg</Unit>
              <span className="mx-0.5 text-2xs text-subtle">×</span>
            </>
          ) : (
            <>
              <Num>{set.weight}</Num>
              <Unit>kg</Unit>
              <span className="mx-0.5 text-2xs text-subtle">×</span>
            </>
          )}
          <Num>{set.reps}</Num>
          <Unit>회</Unit>
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

function Side({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`mr-0.5 text-2xs font-semibold text-subtle ${className}`}>
      {children}
    </span>
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

/** 통증·자세·움직임·숙제를 남겨 다음 수업으로 이어감 */
export function NoteSection({
  memberId,
  notes,
  readOnly = false,
  onDelete,
}: {
  memberId: string;
  notes: CoachingNote[];
  /** 회원 본인 화면 — 작성·수정·삭제 버튼을 숨김 */
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
            <li
              key={note.id}
              className="border-b border-line py-4 last:border-0 last:pb-0 first:pt-0"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">
                  {formatDateShort(note.date)}
                </p>
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

// ── 개인 운동 ─────────────────────────────

/** 회원이 혼자 한 운동. 회원 본인만 쓰고, 트레이너는 봄 */
export function PersonalWorkoutSection({
  workouts,
  editable = false,
}: {
  workouts: Workout[];
  /** 회원 본인 화면 — 추가·수정·삭제 */
  editable?: boolean;
}) {
  const { run, busy } = useSave();
  const [removing, setRemoving] = useState<Workout | null>(null);

  return (
    <Section
      title="개인 운동"
      subtitle={
        workouts.length > 0
          ? `최근 ${workouts.length}건`
          : editable
            ? "수업 없이 혼자 한 운동을 남겨 보세요."
            : "회원이 혼자 한 운동이 여기에 보입니다."
      }
      action={
        editable ? (
          <SectionAction
            icon="plus"
            label="기록 추가"
            href="/me/workouts/new"
          />
        ) : undefined
      }
    >
      {workouts.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="개인 운동 기록이 없습니다"
          description={
            editable
              ? "혼자 한 운동을 적어 두면 트레이너가 보고 수업에 반영합니다."
              : "회원이 앱에서 개인 운동을 기록하면 여기에 보입니다."
          }
        />
      ) : (
        <ul className="flex flex-col">
          {workouts.map((workout) => {
            const sets = workout.exercises.reduce(
              (n, e) => n + e.sets.length,
              0,
            );
            return (
              <li
                key={workout.id}
                className="flex flex-col gap-2.5 border-b border-line py-5 first:pt-0 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-extrabold">
                      {formatDateShort(workout.date)}
                    </span>
                    <span className="text-2xs font-semibold text-subtle">
                      종목 {workout.exercises.length}개 · {sets}세트
                    </span>
                  </p>
                  {editable && (
                    <span className="flex shrink-0 gap-1">
                      <IconButton
                        icon="pencil"
                        label="개인 운동 수정"
                        href={`/me/workouts/${workout.id}`}
                      />
                      <IconButton
                        icon="trash"
                        label="개인 운동 삭제"
                        danger
                        disabled={busy}
                        onClick={() => setRemoving(workout)}
                      />
                    </span>
                  )}
                </div>
                <SetGrid exercises={workout.exercises} />
                {workout.memo && <Memo text={workout.memo} />}
              </li>
            );
          })}
        </ul>
      )}

      {editable && (
        <ConfirmDialog
          open={removing !== null}
          busy={busy}
          title="개인 운동 삭제"
          message={`${removing ? formatDate(removing.date) : ""} 개인 운동을 삭제하시겠습니까?`}
          hint="삭제된 기록은 복구할 수 없습니다."
          onConfirm={async () => {
            if (!removing) return;
            await run(
              `/api/me/workouts/${removing.id}`,
              { method: "DELETE" },
              "개인 운동을 삭제했습니다.",
              "개인 운동 삭제에 실패했습니다.",
            );
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </Section>
  );
}

// ── Q&A ─────────────────────────────────

/** 회원이 묻고 트레이너가 답함. 질문 하나에 답 하나 */
export function QuestionSection({
  memberId,
  questions,
  role,
}: {
  memberId: string;
  questions: Question[];
  /** member면 질문을 올리고, trainer면 답을 닮 */
  role: "member" | "trainer";
}) {
  const { run, busy } = useSave();
  const [draft, setDraft] = useState("");
  const [removing, setRemoving] = useState<Question | null>(null);
  const waiting = questions.filter((q) => !q.answer).length;

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const ok = await run(
      "/api/me/questions",
      { method: "POST", body: JSON.stringify({ body: draft }) },
      "질문을 올렸습니다. 트레이너가 답하면 여기에 보입니다.",
      "질문을 올리지 못했습니다.",
    );
    if (ok) setDraft("");
  };

  return (
    <Section
      title="Q&A"
      subtitle={
        questions.length > 0
          ? `총 ${questions.length}건${waiting ? ` · 답변 대기 ${waiting}건` : ""}`
          : role === "member"
            ? "운동·식단 등 궁금한 것을 트레이너에게 물어보세요."
            : "회원이 남긴 질문이 여기에 보입니다."
      }
    >
      {/* 질문 쓰기 */}
      {role === "member" && (
        <form onSubmit={ask} className="flex flex-col gap-2">
          <textarea
            className="h-24 w-full resize-none rounded-xl border-[1.5px] border-edge bg-field px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={QUESTION_MAX}
            placeholder="예) 스쿼트할 때 무릎이 안으로 모여요. 어떻게 고치면 좋을까요?"
            aria-label="질문"
          />
          <Button
            type="submit"
            loading={busy}
            disabled={!draft.trim()}
            className="self-end px-5"
          >
            질문 올리기
          </Button>
        </form>
      )}

      {questions.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="아직 질문이 없습니다"
          description={
            role === "member"
              ? "궁금한 것을 남기면 트레이너가 답을 달아 드립니다."
              : "회원이 앱에서 질문을 남기면 여기에 보입니다."
          }
        />
      ) : (
        <ul className="flex flex-col">
          {questions.map((question) => (
            <QuestionItem
              key={question.id}
              memberId={memberId}
              question={question}
              role={role}
              busy={busy}
              run={run}
              onRemove={() => setRemoving(question)}
            />
          ))}
        </ul>
      )}

      {role === "member" && (
        <ConfirmDialog
          open={removing !== null}
          busy={busy}
          title="질문 삭제"
          message="이 질문을 삭제하시겠습니까?"
          hint="답이 달리기 전까지만 지울 수 있습니다."
          onConfirm={async () => {
            if (!removing) return;
            await run(
              `/api/me/questions/${removing.id}`,
              { method: "DELETE" },
              "질문을 삭제했습니다.",
              "질문 삭제에 실패했습니다.",
            );
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </Section>
  );
}

function QuestionItem({
  memberId,
  question,
  role,
  busy,
  run,
  onRemove,
}: {
  memberId: string;
  question: Question;
  role: "member" | "trainer";
  busy: boolean;
  run: ReturnType<typeof useSave>["run"];
  onRemove: () => void;
}) {
  // 트레이너가 답을 쓰는 칸. 답이 없으면 처음부터 펼쳐 둠
  const [answering, setAnswering] = useState(
    role === "trainer" && !question.answer,
  );
  const [answer, setAnswer] = useState(question.answer ?? "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const ok = await run(
      `/api/members/${memberId}/questions/${question.id}`,
      { method: "PATCH", body: JSON.stringify({ answer }) },
      question.answer ? "답변을 고쳤습니다." : "답변을 달았습니다.",
      "답변을 저장하지 못했습니다.",
    );
    if (ok) setAnswering(false);
  };

  return (
    <li className="flex flex-col gap-2.5 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      {/* 질문 */}
      <div className="flex items-start gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-xs font-extrabold text-muted-foreground">
          Q
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">
            {question.body}
          </p>
          <p className="text-2xs font-semibold text-subtle">
            {formatDayShort(question.createdAt)}
          </p>
        </div>
        {role === "member" && !question.answer && (
          <IconButton
            icon="trash"
            label="질문 삭제"
            danger
            disabled={busy}
            onClick={onRemove}
          />
        )}
      </div>

      {/* 답 */}
      {answering ? (
        <form onSubmit={submit} className="ml-8 flex flex-col gap-2">
          <textarea
            className="h-24 w-full resize-none rounded-xl border-[1.5px] border-edge bg-field px-3.5 py-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={ANSWER_MAX}
            placeholder="답변을 적어 주세요."
            aria-label="답변"
          />
          <div className="flex justify-end gap-2">
            {question.answer && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAnswering(false)}
              >
                취소
              </Button>
            )}
            <Button
              type="submit"
              loading={busy}
              disabled={!answer.trim()}
              className="px-5"
            >
              {question.answer ? "답변 고치기" : "답변 달기"}
            </Button>
          </div>
        </form>
      ) : question.answer ? (
        <div className="ml-8 flex items-start gap-2.5 rounded-xl bg-primary-light/50 px-3 py-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
            A
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.answer}
            </p>
            {question.answeredAt && (
              <p className="text-2xs font-semibold text-subtle">
                {formatDayShort(question.answeredAt)}
              </p>
            )}
          </div>
          {role === "trainer" && (
            <IconButton
              icon="pencil"
              label="답변 고치기"
              onClick={() => setAnswering(true)}
            />
          )}
        </div>
      ) : (
        <p className="ml-8 text-xs font-bold text-warning">답변 대기 중</p>
      )}
    </li>
  );
}

// ── 체중·인바디 ────────────────────────────

/**
 * 체중·인바디 — 체중만 잰 날도, 인바디를 잰 날도 같은 기록 한 건
 * 위에서부터 체성분 변화 표 → 체중 그래프 → 최근 인바디 결과. 맨 위 기록이 회원 요약의 최신 체중이 됨
 */
export function WeightSection({
  weights,
  targetWeight,
  defaults,
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
  /** 성별·나이·키 처음 값 — 지난 인바디가 없을 때 영양 정보에서 가져옴 */
  defaults?: { gender: Gender | null; age: number | null; height: number | null };
  /** 회원 본인 화면 — 기록·삭제·목표 수정을 숨김. 이때 아래 핸들러는 넘기지 않음 */
  readOnly?: boolean;
  formOpen?: boolean;
  busy?: boolean;
  serverError?: string | null;
  onToggle?: () => void;
  onSubmit?: (payload: InbodyPayload) => void;
  onSaveGoal?: (targetWeight: number | null) => void;
  onCancel?: () => void;
  onDelete?: (record: WeightRecord) => void;
}) {
  // 체중만 잰 날도 같은 표에 두고 "체중만"으로 표시. 결과지 모양은 인바디 기록만
  const inbody = weights.filter(isInbody);
  const last = inbody[0];

  return (
    <>
      <Section
        title="체중 변화"
        subtitle={
          weights.length > 0
            ? undefined
            : "체중만 적어도 되고, 인바디를 쟀으면 결과지 숫자를 같이 적어 두세요."
        }
        action={readOnly ? undefined : <SectionAction icon="plus" label="기록 추가" onClick={onToggle} />}
      >
        {/* 입력 창 — 체중만 필수, 나머지 인바디 칸은 선택 */}
        {!readOnly && onSubmit && onCancel && (
          <Dialog
            open={formOpen}
            onOpenChange={(next) => {
              if (!next) onCancel();
            }}
          >
            <DialogContent dismissOnOutsideClick className="max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>체중·인바디 기록</DialogTitle>
              </DialogHeader>
              <InbodyForm
                initial={{
                  gender: last?.gender ?? defaults?.gender ?? null,
                  age: last?.age ?? defaults?.age ?? null,
                  height: last?.height ?? defaults?.height ?? null,
                }}
                busy={busy}
                serverError={serverError}
                onSubmit={onSubmit}
              />
            </DialogContent>
          </Dialog>
        )}

        {weights.length === 0 ? (
          <EmptyState
            icon="trend"
            title="체중·인바디 기록이 없습니다"
            description={
              readOnly
                ? "트레이너가 체중이나 인바디를 기록하면 여기에 보입니다."
                : "첫 기록을 남기고 변화를 확인해 보세요."
            }
          />
        ) : (
          <>
            {/* 그래프 — 현재 체중·목표·변화 */}
            <WeightChartCard
              weights={weights}
              targetWeight={targetWeight}
              busy={busy}
              onSaveGoal={readOnly ? undefined : onSaveGoal}
              onDelete={readOnly ? undefined : onDelete}
            />
          </>
        )}
      </Section>

      {/* 최근 인바디 결과 */}
      {last && (
        <Section title="InBody" subtitle={`${formatDateShort(last.date)} 측정`}>
          <InbodyResultCard
            latest={last}
            previous={inbody[1]}
            readOnly={readOnly}
            onDelete={() => onDelete?.(last)}
          />
        </Section>
      )}
    </>
  );
}

// ── 인바디 ─────────────────────────────────

/** 인바디 저장 값. 체중 기록과 같은 API로 보냄 */
export interface InbodyPayload {
  date: string;
  weight: number;
  memo: string | null;
  measuredHour: number;
  gender: Gender | null;
  age: number | null;
  height: number | null;
  skeletalMuscle: number | null;
  bodyFatMass: number | null;
  bodyFatPercent: number | null;
  waistHipRatio: number | null;
  visceralFatLevel: number | null;
  visceralFatArea: number | null;
  balanceUpper: Balance | null;
  balanceLower: Balance | null;
  balanceUpperLower: Balance | null;
  leanRightArm: number | null;
  leanRightArmPct: number | null;
  leanLeftArm: number | null;
  leanLeftArmPct: number | null;
  leanTrunk: number | null;
  leanTrunkPct: number | null;
  leanRightLeg: number | null;
  leanRightLegPct: number | null;
  leanLeftLeg: number | null;
  leanLeftLegPct: number | null;
}

/** 인바디 숫자 칸 — [저장 키, 이름, 단위, 예시] */
const INBODY_FIELDS = [
  ["weight", "체중", "kg", "72.5"],
  ["skeletalMuscle", "골격근량", "kg", "31.2"],
  ["bodyFatMass", "체지방량", "kg", "15.8"],
  ["bodyFatPercent", "체지방률", "%", "21.8"],
  ["waistHipRatio", "복부지방률", "", "0.85"],
  ["visceralFatArea", "내장지방 면적", "cm²", "177.5"],
] as const;

type InbodyNumberKey = (typeof INBODY_FIELDS)[number][0];

const BALANCE_PARTS = [
  ["balanceUpper", "상체"],
  ["balanceLower", "하체"],
  ["balanceUpperLower", "상하체"],
] as const;

/** 신체균형 부위 — [kg 칸, % 칸, 이름] */
const LEAN_SEGMENTS = [
  ["leanRightArm", "leanRightArmPct", "오른팔"],
  ["leanLeftArm", "leanLeftArmPct", "왼팔"],
  ["leanTrunk", "leanTrunkPct", "몸통"],
  ["leanRightLeg", "leanRightLegPct", "오른다리"],
  ["leanLeftLeg", "leanLeftLegPct", "왼다리"],
] as const;

type LeanKey =
  (typeof LEAN_SEGMENTS)[number][0] | (typeof LEAN_SEGMENTS)[number][1];

/** 인바디 측정 기록. 체중 기록 중 인바디 칸이 찬 것만 보여 줌 */
function InbodyForm({
  initial,
  busy,
  serverError,
  onSubmit,
}: {
  initial: { gender: Gender | null; age: number | null; height: number | null };
  busy: boolean;
  serverError: string | null;
  onSubmit: (payload: InbodyPayload) => void;
}) {
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState(() => kstHour(new Date()));
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [age, setAge] = useState(
    initial.age === null ? "" : String(initial.age),
  );
  const [height, setHeight] = useState(
    initial.height === null ? "" : String(initial.height),
  );
  const [values, setValues] = useState<Record<InbodyNumberKey, string>>({
    weight: "",
    skeletalMuscle: "",
    bodyFatMass: "",
    bodyFatPercent: "",
    waistHipRatio: "",
    visceralFatArea: "",
  });
  const [lean, setLean] = useState<Record<LeanKey, string>>(
    () =>
      Object.fromEntries(
        LEAN_SEGMENTS.flatMap(([kg, pct]) => [
          [kg, ""],
          [pct, ""],
        ]),
      ) as Record<LeanKey, string>,
  );
  const [balance, setBalance] = useState<
    Record<(typeof BALANCE_PARTS)[number][0], Balance | null>
  >({
    balanceUpper: null,
    balanceLower: null,
    balanceUpperLower: null,
  });
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const num = (value: string) => (value.trim() === "" ? null : Number(value));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const weight = Number(values.weight);
    if (values.weight.trim() === "" || !isValidWeight(weight)) {
      setError(`체중: ${WEIGHT_RANGE_MESSAGE}`);
      return;
    }
    const numbers = [
      age,
      height,
      ...Object.values(values),
      ...Object.values(lean),
    ];
    if (numbers.some((v) => v.trim() !== "" && !Number.isFinite(Number(v)))) {
      setError("숫자 칸에는 숫자만 입력해 주세요.");
      return;
    }

    onSubmit({
      date,
      weight,
      memo: memo.trim() || null,
      measuredHour: hour,
      gender,
      age: num(age),
      height: num(height),
      skeletalMuscle: num(values.skeletalMuscle),
      bodyFatMass: num(values.bodyFatMass),
      bodyFatPercent: num(values.bodyFatPercent),
      waistHipRatio: num(values.waistHipRatio),
      visceralFatLevel: null,
      visceralFatArea: num(values.visceralFatArea),
      ...balance,
      ...(Object.fromEntries(
        Object.entries(lean).map(([key, v]) => [key, num(v)]),
      ) as Record<LeanKey, number | null>),
    });
  };

  const field =
    "h-10 w-full min-w-0 rounded-lg border border-line bg-field px-3 text-right text-md font-bold tabular-nums outline-none placeholder:font-medium placeholder:text-line-strong focus:border-primary";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 측정일시 */}
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker
          value={date}
          onChange={setDate}
          max={today()}
          ariaLabel="측정 날짜"
        />
        <HourPicker value={hour} onChange={setHour} ariaLabel="측정 시각" />
      </div>

      {/* 성별·나이·키 */}
      <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-2xs font-bold text-subtle">성별</span>
          <div className="flex h-10 gap-0.5 rounded-lg bg-canvas p-0.5">
            {(["male", "female"] as Gender[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={gender === value}
                onClick={() => setGender(gender === value ? null : value)}
                className={`rounded-md px-3 text-sm font-bold transition-colors ${
                  gender === value
                    ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                {value === "male" ? "남" : "여"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-2xs font-bold text-subtle">나이 (세)</span>
          <input
            className={field}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            inputMode="numeric"
            placeholder="35"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-2xs font-bold text-subtle">키 (cm)</span>
          <input
            className={field}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputMode="decimal"
            placeholder="175"
          />
        </label>
      </div>

      {/* 수치 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {INBODY_FIELDS.map(([key, label, unit, example]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-2xs font-bold text-subtle">
              {label}
              {unit && ` (${unit})`}
              {key === "weight" && <span className="text-danger"> *</span>}
            </span>
            <input
              className={field}
              value={values[key]}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [key]: e.target.value }));
                setError(null);
              }}
              inputMode="decimal"
              placeholder={example}
            />
          </label>
        ))}
      </div>

      {/* 부위별 근육 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-bold text-subtle">
          신체균형 — 부위별 근육 (kg · 표준 대비 %)
        </span>
        {LEAN_SEGMENTS.map(([kg, pct, label]) => (
          <div
            key={kg}
            className="grid grid-cols-[4rem_1fr_1fr] items-center gap-2"
          >
            <span className="text-sm font-bold text-muted-foreground">
              {label}
            </span>
            {([kg, pct] as const).map((key) => (
              <label key={key} className="relative">
                <input
                  className={`${field} pr-8`}
                  value={lean[key]}
                  onChange={(e) =>
                    setLean((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder={key === kg ? "3.55" : "97.5"}
                  aria-label={`${label} ${key === kg ? "근육량 kg" : "표준 대비 %"}`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {key === kg ? "kg" : "%"}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      {/* 신체균형 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-bold text-subtle">신체균형</span>
        {BALANCE_PARTS.map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-sm font-bold text-muted-foreground">
              {label}
            </span>
            <div
              role="radiogroup"
              aria-label={`${label} 균형`}
              className="flex gap-0.5 rounded-lg bg-canvas p-0.5"
            >
              {(Object.keys(BALANCE_LABEL) as Balance[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={balance[key] === value}
                  onClick={() =>
                    setBalance((prev) => ({
                      ...prev,
                      [key]: prev[key] === value ? null : value,
                    }))
                  }
                  className={`h-7 rounded-md px-2.5 text-xs font-bold transition-colors ${
                    balance[key] === value
                      ? "bg-primary-light text-primary-dark dark:text-primary-bright"
                      : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  {BALANCE_LABEL[value]}
                </button>
              ))}
            </div>
          </div>
        ))}
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

/**
 * 인바디 결과지의 표준 범위 — 키·성별로 계산함
 * 표준체중은 BMI 22(여성 21) × 키², 골격근량·체지방량은 표준체중에 대한 비율
 * 결과지(171cm 남성: 체중 54.7~73.9, 골격근량 27.5~33.5, 체지방량 7.7~15.4)와 맞춘 근사식
 */
function inbodyStandard(height: number, gender: Gender) {
  const h = height / 100;
  const weight = (gender === "male" ? 22 : 21) * h * h;
  // 결과지와 같은 반올림 — 체중·골격근은 소수 한 자리로 맞춘 표준값, 체지방은 맞추기 전 값으로 곱함
  const standardWeight = round1(weight);
  return {
    weight: standardWeight,
    muscle: round1(standardWeight * (gender === "male" ? 0.474 : 0.41)),
    fat: weight * (gender === "male" ? 0.15 : 0.23),
  };
}

/** 결과지 막대의 눈금. 눈금 사이 간격은 같게 그림 (체지방량처럼 뒤로 갈수록 성긴 눈금) */
type InbodyScale = { ticks: number[]; low: number; high: number };

const SCALE = {
  weight: {
    ticks: [55, 70, 85, 100, 115, 130, 145, 160, 175, 190, 205],
    low: 85,
    high: 115,
  },
  muscle: {
    ticks: [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170],
    low: 90,
    high: 110,
  },
  fat: {
    ticks: [40, 60, 80, 100, 160, 220, 280, 340, 400, 460, 520],
    low: 80,
    high: 160,
  },
  bodyFatMale: {
    ticks: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    low: 10,
    high: 20,
  },
  bodyFatFemale: {
    ticks: [8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58],
    low: 18,
    high: 28,
  },
  lean: {
    ticks: [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170],
    low: 90,
    high: 110,
  },
  whrMale: {
    ticks: [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2],
    low: 0.8,
    high: 0.9,
  },
  whrFemale: {
    ticks: [0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15],
    low: 0.75,
    high: 0.85,
  },
} satisfies Record<string, InbodyScale>;

/** 눈금 위의 위치 0~1 */
function scalePosition(scale: InbodyScale, value: number) {
  const { ticks } = scale;
  if (value <= ticks[0]) return 0;
  for (let i = 0; i < ticks.length - 1; i++) {
    if (value <= ticks[i + 1]) {
      return (
        (i + (value - ticks[i]) / (ticks[i + 1] - ticks[i])) /
        (ticks.length - 1)
      );
    }
  }
  return 1;
}

/** 막대 줄의 칸 — 이름, 막대, 값, 표준 범위(폰에서는 숨김) */
const INBODY_ROW =
  "grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-end gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_4.5rem_6.5rem] sm:gap-3";

/**
 * 막대 묶음의 머리 — 표준이하·표준·표준이상
 * 결과지 눈금은 모든 항목에서 표준이 눈금 3~5번째라 한 줄로 세 막대를 맞춤
 */
function InbodyBarHeader({
  title,
  rangeLabel = "표준 범위",
  unit,
}: {
  title: string;
  rangeLabel?: string;
  /** 눈금 단위 — 체중·골격근·체지방·신체균형은 표준 대비 % */
  unit?: string;
}) {
  const zones = [
    ["표준이하", "0%", "20%"],
    ["표준", "20%", "20%"],
    ["표준이상", "40%", "60%"],
  ] as const;
  const heading = (
    <span className="flex flex-col text-xs font-extrabold">
      {title}
      {unit && <span className="text-[10px] font-bold text-subtle">단위 {unit}</span>}
    </span>
  );
  const zoneRow = (
    <span className="relative h-5">
      {zones.map(([label, left, width]) => (
        <span
          key={label}
          className={`absolute inset-y-0 grid place-items-center border-x border-canvas text-2xs font-bold ${
            label === "표준"
              ? "bg-primary/15 text-primary-dark dark:text-primary-bright"
              : "bg-raised text-muted-foreground"
          }`}
          style={{ left, width }}
        >
          {label}
        </span>
      ))}
    </span>
  );

  return (
    <div className={INBODY_ROW}>
      {heading}
      {zoneRow}
      <span />
      <span className="hidden text-right text-2xs font-bold text-subtle sm:block">
        {rangeLabel}
      </span>
    </div>
  );
}

/** 결과지처럼 한 줄 — 이름, 눈금과 막대(옅은 칸이 표준), 값, 표준 범위 */
function InbodyBar({
  label,
  value,
  unit,
  scale,
  position,
  range,
  tip,
}: {
  label: string;
  value: number;
  unit: string;
  scale: InbodyScale;
  /** 막대 길이를 정하는 값 — 체중·골격근·체지방은 표준 대비 %, 나머지는 값 그대로 */
  position: number;
  range: string;
  /** 막대 끝에 붙이는 글 — 표준 대비 % */
  tip?: string;
}) {
  const low = scalePosition(scale, scale.low);
  const high = scalePosition(scale, scale.high);
  const at = scalePosition(scale, position);
  const tone =
    position < scale.low
      ? "bg-subtle"
      : position > scale.high
        ? "bg-goal"
        : "bg-primary";
  const last = scale.ticks.length - 1;

  return (
    <div className={INBODY_ROW}>
      <span className="pb-px text-xs font-bold text-muted-foreground">
        {label}
      </span>
      <span className="flex flex-col gap-0.5">
        {/* 눈금 — 폰에서는 하나 걸러 보여 줌 */}
        <span className="relative h-3.5">
          {scale.ticks.map((tick, i) => (
            <span
              key={tick}
              className={`absolute top-0 -translate-x-1/2 text-[10px] leading-none tabular-nums text-subtle ${
                i % 2 === 1 ? "hidden sm:block" : ""
              } ${i === 0 ? "translate-x-0" : ""} ${i === last ? "-translate-x-full" : ""}`}
              style={{ left: `${(i / last) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </span>
        <span className="relative h-2.5 rounded-full bg-raised">
          {/* 표준 */}
          <span
            className="absolute inset-y-0 bg-primary/15"
            style={{ left: `${low * 100}%`, width: `${(high - low) * 100}%` }}
          />
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${tone}`}
            style={{ width: `${Math.max(at, 0.02) * 100}%` }}
          />
          {tip && (
            <span
              className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-extrabold leading-none tabular-nums ${
                at > 0.8 ? "-translate-x-full pr-1 text-white" : "pl-1 text-ink"
              }`}
              style={{ left: `${at * 100}%` }}
            >
              {tip}
            </span>
          )}
        </span>
      </span>
      <span className="text-right text-sm font-extrabold leading-none tabular-nums">
        {/* 결과지처럼 소수 자리를 맞춤 — 복부지방률은 둘째 자리까지 */}
        {value.toFixed(unit ? 1 : 2)}
        {unit && (
          <span className="ml-0.5 text-2xs font-bold text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
      <span className="hidden text-right text-2xs leading-none text-subtle tabular-nums sm:block">
        {range}
      </span>
    </div>
  );
}

/**
 * 내장지방 면적 그래프 — 결과지처럼 가로는 나이, 세로는 면적(cm²)
 * 가운데 옅은 띠는 나이대별로 흔한 범위, 100cm² 선을 넘으면 내장지방형 비만
 */
function VisceralFatChart({ area, age }: { area: number; age: number | null }) {
  const width = 300;
  const height = 240;
  const max = 200;
  const left = 34;
  const right = width - 10;
  const top = 12;
  const bottom = height - 30;
  const x = (years: number) => left + ((years - 5) / 90) * (right - left);
  // 200이 넘는 값은 맨 위에 찍고 숫자는 그대로 씀
  const y = (cm2: number) => bottom - (Math.min(cm2, max) / max) * (bottom - top);
  // 나이대별로 흔한 범위 — 결과지의 띠 모양을 따라 그린 근사. 닫힌 매끄러운 곡선
  const points = [
    [12, 18], [25, 26], [40, 40], [55, 58], [70, 78], [80, 96], [84, 125],
    [83, 170], [75, 168], [60, 150], [45, 130], [30, 108], [18, 88], [12, 55],
  ].map(([a, v]) => [x(a), y(v)]);
  const band =
    points
      .map((p, i) => {
        const p0 = points[(i - 1 + points.length) % points.length];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 2) % points.length];
        const c1 = [p[0] + (p2[0] - p0[0]) / 6, p[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p[0]) / 6, p2[1] - (p3[1] - p[1]) / 6];
        return `${i === 0 ? `M${p[0]},${p[1]} ` : ""}C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
      })
      .join(" ") + " Z";
  const high = area >= 100;
  const px = x(Math.min(Math.max(age ?? 40, 12), 88));
  const py = y(area);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto h-auto w-full max-w-80"
      role="img"
      aria-label={`내장지방 면적 ${area}cm²`}
    >
      <defs>
        <clipPath id="vfa-above">
          <rect x={0} y={0} width={width} height={y(100)} />
        </clipPath>
        <clipPath id="vfa-below">
          <rect x={0} y={y(100)} width={width} height={height} />
        </clipPath>
      </defs>
      {/* 흔한 범위 — 결과지처럼 100 위는 진한 회색, 아래는 옅은 회색 */}
      <path d={band} clipPath="url(#vfa-below)" className="fill-subtle/25" />
      <path d={band} clipPath="url(#vfa-above)" className="fill-subtle/45" />
      {/* 100cm² 가로선 */}
      <line x1={left} x2={right} y1={y(100)} y2={y(100)} className="stroke-muted-foreground" strokeWidth={1.2} />
      {/* 테두리 */}
      <rect x={left} y={top} width={right - left} height={bottom - top} className="fill-none stroke-line-strong" />
      {/* 눈금 */}
      {[0, 50, 100, 150, 200].map((v) => (
        <text
          key={v}
          x={left - 6}
          y={y(v) + 3.5}
          textAnchor="end"
          className={`text-[10px] tabular-nums ${v === 100 ? "fill-ink font-bold" : "fill-subtle"}`}
        >
          {v}
        </text>
      ))}
      {[20, 40, 60, 80].map((a) => (
        <text key={a} x={x(a)} y={bottom + 16} textAnchor="middle" className="fill-subtle text-[10px]">
          {a}
        </text>
      ))}
      <text x={right} y={bottom + 16} textAnchor="end" className="fill-subtle text-[10px]">
        세
      </text>
      <text x={left + 4} y={top + 12} className="fill-subtle text-[10px]">
        cm²
      </text>
      {/* 내 값 */}
      <circle cx={px} cy={py} r={4.5} className={high ? "fill-goal" : "fill-primary"} />
      <text x={px + 9} y={py + 4} className={`text-[13px] font-extrabold tabular-nums ${high ? "fill-goal" : "fill-primary"}`}>
        {area}
      </text>
    </svg>
  );
}

/** 최근 1회 결과를 결과지처럼 — 위에는 지난 측정 대비 변화, 아래는 골격근·지방 분석과 비만 진단 */
function InbodyResultCard({
  latest,
  previous,
  readOnly,
  onDelete,
}: {
  latest: WeightRecord;
  previous: WeightRecord | undefined;
  readOnly: boolean;
  onDelete: () => void;
}) {
  const { height, gender } = latest;
  const standard =
    height !== null && gender !== null ? inbodyStandard(height, gender) : null;
  // 표준 범위 글 — 결과지처럼 아래 끝은 반올림, 위 끝은 버림
  const between = (low: number, high: number) =>
    `${round1(low).toFixed(1)}~${(Math.floor(high * 10 + 1e-9) / 10).toFixed(1)}`;

  const changes: [string, number | null, number | null, string][] = [
    ["체중", latest.weight, previous?.weight ?? null, "kg"],
    ["골격근량", latest.skeletalMuscle, previous?.skeletalMuscle ?? null, "kg"],
    ["체지방량", latest.bodyFatMass, previous?.bodyFatMass ?? null, "kg"],
    ["체지방률", latest.bodyFatPercent, previous?.bodyFatPercent ?? null, "%"],
  ];

  const profile = [
    gender && (gender === "male" ? "남성" : "여성"),
    latest.age !== null && `${latest.age}세`,
    height !== null && `${height}cm`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line p-4 md:p-5">
      {/* 측정 정보 */}
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 flex-col gap-0.5">
          <span className="text-2xs font-bold text-subtle">최근 측정</span>
          <span className="text-sm font-extrabold">
            {formatDateShort(latest.date)}
            {latest.measuredHour !== null && (
              <span className="ml-1.5 font-semibold text-muted-foreground">
                {formatHourLabel(latest.measuredHour)}
              </span>
            )}
          </span>
          {profile && (
            <span className="text-2xs font-semibold text-subtle">
              {profile}
            </span>
          )}
        </p>
        {!readOnly && (
          <IconButton
            icon="trash"
            label={`${latest.date} 인바디 기록 삭제`}
            danger
            onClick={onDelete}
          />
        )}
      </div>

      {/* 지난 측정 대비 변화 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {changes.map(([label, now, before, unit]) => {
          const delta =
            now !== null && before !== null ? round1(now - before) : null;
          return (
            <div
              key={label}
              className="flex flex-col gap-0.5 rounded-lg bg-canvas px-3 py-2"
            >
              <span className="text-2xs font-bold text-subtle">{label}</span>
              <span className="text-lg font-extrabold tabular-nums">
                {now?.toFixed(1) ?? "—"}
                {now !== null && (
                  <span className="ml-0.5 text-xs font-bold text-muted-foreground">
                    {unit}
                  </span>
                )}
              </span>
              <span
                className={`text-2xs font-bold tabular-nums ${
                  delta === null || delta === 0
                    ? "text-subtle"
                    : delta < 0
                      ? "text-primary"
                      : "text-goal"
                }`}
              >
                {delta === null
                  ? previous
                    ? "—"
                    : "첫 측정"
                  : `지난번보다 ${signed(delta)}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* 골격근·지방 분석 */}
      {standard && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <InbodyBarHeader title="골격근·지방" unit="%" />
          <InbodyBar
            label="체중"
            value={latest.weight}
            unit="kg"
            scale={SCALE.weight}
            position={(latest.weight / standard.weight) * 100}
            tip={`${Math.round((latest.weight / standard.weight) * 100)}%`}
            range={between(standard.weight * 0.85, standard.weight * 1.15)}
          />
          {latest.skeletalMuscle !== null && (
            <InbodyBar
              label="골격근량"
              value={latest.skeletalMuscle}
              unit="kg"
              scale={SCALE.muscle}
              position={(latest.skeletalMuscle / standard.muscle) * 100}
              tip={`${Math.round((latest.skeletalMuscle / standard.muscle) * 100)}%`}
              range={between(standard.muscle * 0.9, standard.muscle * 1.1)}
            />
          )}
          {latest.bodyFatMass !== null && (
            <InbodyBar
              label="체지방량"
              value={latest.bodyFatMass}
              unit="kg"
              scale={SCALE.fat}
              position={(latest.bodyFatMass / standard.fat) * 100}
              tip={`${Math.round((latest.bodyFatMass / standard.fat) * 100)}%`}
              range={between(standard.fat * 0.8, standard.fat * 1.6)}
            />
          )}
        </div>
      )}

      {/* 비만 진단 */}
      {(latest.bodyFatPercent !== null || latest.waistHipRatio !== null) && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <InbodyBarHeader title="비만 진단" />
          {latest.bodyFatPercent !== null && (
            <InbodyBar
              label="체지방률"
              value={latest.bodyFatPercent}
              unit="%"
              scale={
                gender === "female" ? SCALE.bodyFatFemale : SCALE.bodyFatMale
              }
              position={latest.bodyFatPercent}
              range={gender === "female" ? "18.0~28.0" : "10.0~20.0"}
            />
          )}
          {latest.waistHipRatio !== null && (
            <InbodyBar
              label="복부지방률"
              value={latest.waistHipRatio}
              unit=""
              scale={gender === "female" ? SCALE.whrFemale : SCALE.whrMale}
              position={latest.waistHipRatio}
              range={gender === "female" ? "0.75~0.85" : "0.80~0.90"}
            />
          )}
        </div>
      )}

      {/* 신체균형 — 부위별 근육. 막대는 표준 대비 % */}
      {LEAN_SEGMENTS.some(([, pct]) => latest[pct] !== null) && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <InbodyBarHeader title="신체균형" rangeLabel="표준 대비" unit="%" />
          {LEAN_SEGMENTS.map(([kg, pct, label]) => {
            const value = latest[kg];
            const percent = latest[pct];
            return (
              percent !== null && (
                <InbodyBar
                  key={kg}
                  label={label}
                  value={value ?? percent}
                  unit={value !== null ? "kg" : "%"}
                  scale={SCALE.lean}
                  position={percent}
                  range="90~110%"
                  tip={`${percent}%`}
                />
              )
            );
          })}
          {/* 결과지 오른쪽의 균형 판정 — 입력 창에서 고른 값 */}
          {BALANCE_PARTS.some(([key]) => latest[key]) && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
              {BALANCE_PARTS.map(([key, name]) => {
                const value = latest[key];
                return (
                  value && (
                    <span key={key}>
                      {name}{" "}
                      <span
                        className={`font-bold ${
                          value === "balanced" ? "text-ink" : value === "slight" ? "text-warning" : "text-danger"
                        }`}
                      >
                        {BALANCE_LABEL[value]}
                      </span>
                    </span>
                  )
                );
              })}
            </p>
          )}
        </div>
      )}

      {/* 내장지방 */}
      {latest.visceralFatArea != null && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="flex flex-wrap items-baseline gap-x-2 text-xs font-extrabold">
            내장지방
            <span className="font-semibold text-subtle">면적 100cm² 이상이면 내장지방형 비만</span>
          </p>
          <VisceralFatChart area={latest.visceralFatArea} age={latest.age} />
        </div>
      )}

      {latest.memo && <Memo text={latest.memo} />}
    </div>
  );
}

// ── 식단 ──────────────────────────────────

/** 섭취량 — kcal와 탄단지 g */
interface Intake {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
}

type Macro = "carbs" | "fat" | "protein";

const MACROS: { key: Macro; label: string; text: string; bg: string }[] = [
  { key: "carbs", label: "탄수화물", text: "text-carbs", bg: "bg-carbs" },
  { key: "fat", label: "지방", text: "text-fat", bg: "bg-fat" },
  { key: "protein", label: "단백질", text: "text-protein", bg: "bg-protein" },
];

/** 목표 칼로리 위아래로 권장하는 폭 */
const CALORIE_RANGE = 0.1;
/** 칼로리 막대·그래프의 끝 — 목표의 1.3배 */
const CALORIE_SCALE = 1.3;

const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, currentColor 0 1.5px, transparent 1.5px 4px)",
};

/** 숫자가 붙은 끼니만 더함. 하나도 없으면 null */
function sumIntake(meals: Meal[]): Intake | null {
  const counted = meals.filter((meal) => meal.calories != null);
  if (counted.length === 0) return null;
  return counted.reduce<Intake>(
    (total, meal) => ({
      calories: total.calories + (meal.calories ?? 0),
      carbs: total.carbs + (meal.carbs ?? 0),
      fat: total.fat + (meal.fat ?? 0),
      protein: total.protein + (meal.protein ?? 0),
    }),
    { calories: 0, carbs: 0, fat: 0, protein: 0 },
  );
}

/** 탄단지 g → 칼로리 비율(%). 합이 100이 되도록 단백질에서 맞춤 */
function macroShare(grams: Record<Macro, number>): Record<Macro, number> | null {
  const carbs = grams.carbs * 4;
  const fat = grams.fat * 9;
  const total = carbs + fat + grams.protein * 4;
  if (total === 0) return null;
  const carbsShare = Math.round((carbs / total) * 100);
  const fatShare = Math.round((fat / total) * 100);
  return { carbs: carbsShare, fat: fatShare, protein: 100 - carbsShare - fatShare };
}

/** 먹은 kcal — 숫자가 붙은 끼니가 없으면 0 */
function kcalOf(intake: Intake | null) {
  return Math.round(intake?.calories ?? 0).toLocaleString();
}

/** YYYY-MM-DD의 요일 (0 = 일요일) */
function dayOfWeek(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 일요일·공휴일 */
function isRedDay(day: string) {
  return dayOfWeek(day) === 0 || holidayName(day) !== null;
}

/**
 * 식단 탭 — 맨 위에서 고른 날의 섭취 칼로리·탄단지, 끼니 기록, 7일 그래프
 * 서버는 주소의 ?date=까지 MEAL_DAYS일치 식단을 줌. 그 밖의 날을 고르면 주소를 바꿔 다시 받음
 */
export function DietSection({
  memberId,
  meals,
  nutrition,
  role,
  initialDate,
}: {
  memberId: string;
  initialDate: string; // 주소의 ?date= — 서버가 이 날까지 식단을 줌
  meals: Meal[];
  nutrition: NutritionProfile | null;
  role: "member" | "trainer"; // 둘 다 적고 지움 — 회원은 /api/me, 트레이너는 /api/members/:id
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, startLoading] = useTransition();
  const now = today();
  const [date, setDate] = useState(initialDate);

  const byDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const meal of meals) map.set(meal.date, [...(map.get(meal.date) ?? []), meal]);
    return map;
  }, [meals]);

  const loadedFrom = shiftDay(initialDate, -(MEAL_DAYS - 1));
  const dayMeals = byDate.get(date) ?? [];
  const intake = sumIntake(dayMeals);

  // 7일 그래프까지 받아 둔 범위 안이면 그대로, 벗어나면 그 날 기준으로 다시 받음
  const pick = (day: string) => {
    setDate(day);
    if (shiftDay(day, -6) < loadedFrom || day > initialDate) {
      startLoading(() => router.replace(`${pathname}?tab=diet&date=${day}`, { scroll: false }));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <DayNav date={date} now={now} byDate={byDate} onPick={pick} />
      <div
        className={`flex flex-col gap-3 transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`}
      >
        <CalorieCard
          title={date === now ? "오늘 먹은 칼로리" : `${formatDateShort(date)} 먹은 칼로리`}
          intake={intake}
          nutrition={nutrition}
        />
        <MacroCard intake={intake} nutrition={nutrition} />
        <MealLog key={date} memberId={memberId} date={date} meals={dayMeals} role={role} />
        <WeekChart date={date} byDate={byDate} target={nutrition?.targetCalories ?? null} />
      </div>
    </div>
  );
}

function DietCard({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      {title && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold tracking-[-0.02em]">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ── 식단 · 칼로리 ──────────────────────────

function CalorieCard({
  title,
  intake,
  nutrition,
}: {
  title: string;
  intake: Intake | null;
  nutrition: NutritionProfile | null;
}) {
  const target = nutrition?.targetCalories ?? 0;

  return (
    <DietCard title={title}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {kcalOf(intake)}
          </span>
          <span className="text-base font-semibold text-muted-foreground">kcal</span>
        </p>

        {nutrition && (
          <dl className="flex flex-col gap-1 text-xs tabular-nums">
            <div className="flex items-center gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-raised text-subtle">
                  <Icon name="target" size={12} />
                </span>
                목표
              </dt>
              <dd className="font-bold">{target.toLocaleString()} kcal</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-5 rounded-full border border-line text-subtle" style={HATCH} />
                권장 범위
              </dt>
              <dd className="font-bold">
                {Math.round(target * (1 - CALORIE_RANGE)).toLocaleString()} -{" "}
                {Math.round(target * (1 + CALORIE_RANGE)).toLocaleString()}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {nutrition ? (
        <CalorieBar eaten={intake?.calories ?? 0} target={target} />
      ) : (
        <p className="rounded-xl bg-raised px-4 py-3 text-xs text-muted-foreground">
          영양 계산을 하면 목표 칼로리가 보입니다.
        </p>
      )}
    </DietCard>
  );
}

/** 0 ~ 목표×1.3 막대 — 먹은 양, 권장 범위(빗금), 목표 표시 */
function CalorieBar({ eaten, target }: { eaten: number; target: number }) {
  const max = Math.round(target * CALORIE_SCALE);
  const pct = (kcal: number) => Math.min(kcal / max, 1) * 100;
  const low = pct(target * (1 - CALORIE_RANGE));
  const high = pct(target * (1 + CALORIE_RANGE));
  const over = eaten > target * (1 + CALORIE_RANGE);

  return (
    <div className="flex flex-col gap-1.5 pt-3">
      <div className="relative h-2.5 rounded-full bg-raised">
        {/* 먹은 양 */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-goal" : "bg-primary"}`}
          style={{ width: `${pct(eaten)}%` }}
        />
        {/* 권장 범위 */}
        <div
          className="absolute inset-y-0 text-subtle/60"
          style={{ ...HATCH, left: `${low}%`, width: `${high - low}%` }}
        />
        {/* 목표 */}
        <span
          className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-subtle"
          style={{ left: `${pct(target)}%` }}
        >
          <Icon name="target" size={14} />
        </span>
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>0</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── 식단 · 영양정보 ─────────────────────────

/**
 * 탄단지 막대 하나 — 조각 너비는 칼로리 비율, 조각 안에 먹은 g과 %
 * ▼ 선은 권장 비율의 경계, 아래 줄은 영양소 이름과 목표 g
 */
function MacroCard({
  intake,
  nutrition,
}: {
  intake: Intake | null;
  nutrition: NutritionProfile | null;
}) {
  const current = intake ? macroShare(intake) : null;
  const recommended = nutrition ? macroShare(nutrition) : null;

  return (
    <DietCard
      title="영양정보"
      action={
        recommended && (
          <p className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            ▼ 권장 비율
            {MACROS.map((macro, i) => (
              <span key={macro.key} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">·</span>}
                <span className={`font-bold ${macro.text}`}>{recommended[macro.key]}%</span>
              </span>
            ))}
          </p>
        )
      }
    >
      <div className="relative pt-3.5 pb-1">
        <div className="flex h-10 gap-0.5">
          {intake && current ? (
            MACROS.map((macro) => (
              <div
                key={macro.key}
                className={`flex flex-col items-center justify-center overflow-hidden leading-tight text-white first:rounded-l-lg last:rounded-r-lg dark:text-black/80 ${macro.bg}`}
                style={{ width: `${current[macro.key]}%` }}
              >
                {current[macro.key] >= 12 && (
                  <>
                    <span className="text-sm font-extrabold tabular-nums">
                      {Math.round(intake[macro.key])}g
                    </span>
                    <span className="text-2xs font-bold tabular-nums opacity-80">
                      {current[macro.key]}%
                    </span>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="grid w-full place-items-center rounded-lg bg-raised text-xs text-muted-foreground">
              먹은 기록이 없습니다
            </p>
          )}
        </div>

        {/* 권장 경계 */}
        {recommended &&
          [recommended.carbs, recommended.carbs + recommended.fat].map((at) => (
            <span
              key={at}
              aria-hidden="true"
              className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${at}%` }}
            >
              <span className="text-[10px] leading-none text-ink">▼</span>
              <span className="w-0.5 flex-1 bg-ink outline-1 outline-surface" />
            </span>
          ))}
      </div>

      {/* 영양소 · 목표 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {nutrition && <span className="text-muted-foreground">목표</span>}
        {MACROS.map((macro) => (
          <span key={macro.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${macro.bg}`} />
            <span className="font-semibold">{macro.label}</span>
            {nutrition && (
              <span className="tabular-nums text-muted-foreground">{nutrition[macro.key]}g</span>
            )}
          </span>
        ))}
      </div>
    </DietCard>
  );
}

// ── 영양 ──────────────────────────────────

/** 계산 결과를 읽는 자리. 계산 자체는 /members/:id/nutrition 화면에서 함 */
export function NutritionPanel({
  memberId,
  nutrition,
  readOnly = false,
}: {
  memberId: string;
  nutrition: NutritionProfile | null;
  /** 회원 본인 화면 — 다시 계산 버튼을 숨김 */
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
              {nutrition.gender === "male" ? "남성" : "여성"} · {nutrition.age}
              세
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

// ── 식단 · 식사 기록 ─────────────────────────

const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

/** 맨 위 날짜 — ‹ ›로 하루씩, 가운데를 누르면 달력 */
function DayNav({
  date,
  now,
  byDate,
  onPick,
}: {
  date: string;
  now: string;
  byDate: Map<string, Meal[]>;
  onPick: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-3">
      <IconButton icon="chevronLeft" label="전날" onClick={() => onPick(shiftDay(date, -1))} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="날짜 고르기"
        className="flex h-10 min-w-44 items-center justify-center gap-1.5 rounded-full bg-raised px-5 text-base font-extrabold transition-colors hover:bg-line"
      >
        {date === now ? "오늘" : formatDateShort(date)}
        <Icon name="calendar" size={15} className="text-subtle" />
      </button>
      <IconButton
        icon="chevronRight"
        label="다음 날"
        disabled={date >= now}
        onClick={() => onPick(shiftDay(date, 1))}
      />

      {open && (
        <CalendarSheet
          date={date}
          now={now}
          byDate={byDate}
          onPick={(day) => {
            setOpen(false);
            onPick(day);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** 폰에서는 아래에서 올라오는 시트, 넓은 화면에서는 가운데 창 */
const SHEET =
  "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[88dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:data-open:slide-in-from-bottom max-sm:data-open:zoom-in-100";

/**
 * 달력 시트 — 날짜판(6주 고정)과 월 선택판. 제목을 누르면 월 선택판, ‹ ›는 한 해씩
 * 오늘은 테두리, 고른 날은 채운 원, 미래는 막음. 기록 있는 날은 점 (받아 둔 범위 안만)
 */
function CalendarSheet({
  date,
  now,
  byDate,
  onPick,
  onClose,
}: {
  date: string;
  now: string;
  byDate: Map<string, Meal[]>;
  onPick: (day: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const [picking, setPicking] = useState(false); // 월 선택판
  const [year, monthNo] = month.split("-").map(Number);
  const nowMonth = now.slice(0, 7);
  const first = `${month}-01`;
  const start = shiftDay(first, -dayOfWeek(first));
  const cells = Array.from({ length: 42 }, (_, i) => shiftDay(start, i));

  const move = (delta: number) => {
    const next = shiftMonth(month, picking ? delta * 12 : delta);
    setMonth(next > nowMonth ? nowMonth : next);
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent dismissOnOutsideClick className={`gap-4 ${SHEET}`}>
        <DialogTitle className="sr-only">날짜 고르기</DialogTitle>

        {/* 달·해 넘기기 */}
        <div className="flex items-center justify-center gap-3">
          <IconButton
            icon="chevronLeft"
            label={picking ? "이전 해" : "이전 달"}
            onClick={() => move(-1)}
          />
          <button
            type="button"
            onClick={() => setPicking(!picking)}
            aria-expanded={picking}
            className="flex min-w-32 items-center justify-center gap-1 rounded-lg px-2 py-1 text-lg font-bold tabular-nums transition-colors hover:bg-raised"
          >
            {picking ? `${year}년` : `${year}년 ${monthNo}월`}
            <Icon
              name="chevronRight"
              size={16}
              className={`text-subtle transition-transform ${picking ? "-rotate-90" : "rotate-90"}`}
            />
          </button>
          <IconButton
            icon="chevronRight"
            label={picking ? "다음 해" : "다음 달"}
            disabled={picking ? year >= Number(now.slice(0, 4)) : month >= nowMonth}
            onClick={() => move(1)}
          />
        </div>

        <div className="h-[21.5rem]">
          {picking ? (
            // 월 선택판
            <div className="grid h-full grid-cols-3 grid-rows-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const key = `${year}-${String(i + 1).padStart(2, "0")}`;
                const current = key === month;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={key > nowMonth}
                    onClick={() => {
                      setMonth(key);
                      setPicking(false);
                    }}
                    className={`rounded-xl text-base font-semibold transition-colors disabled:opacity-35 ${
                      current
                        ? "bg-ink text-canvas"
                        : `hover:bg-raised ${key === nowMonth ? "ring-[1.5px] ring-ink/70" : ""}`
                    }`}
                  >
                    {i + 1}월
                  </button>
                );
              })}
            </div>
          ) : (
            // 날짜판
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-7 text-center text-xs font-semibold">
                {WEEKDAY_SHORT.map((label, i) => (
                  <span
                    key={label}
                    className={
                      i === 0 ? "text-danger" : i === 6 ? "text-primary" : "text-muted-foreground"
                    }
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day) => {
                  const selected = day === date;
                  const future = day > now;
                  const faded = future || day.slice(0, 7) !== month;
                  const dow = dayOfWeek(day);
                  const tone = isRedDay(day) ? "text-danger" : dow === 6 ? "text-primary" : "";

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={future}
                      onClick={() => onPick(day)}
                      aria-pressed={selected}
                      aria-label={formatDateShort(day)}
                      className="flex h-12 flex-col items-center justify-center gap-0.5 disabled:cursor-default"
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-full text-base tabular-nums transition-colors ${
                          selected
                            ? "bg-ink font-bold text-canvas"
                            : `${tone} ${day === now ? "ring-[1.5px] ring-ink/70" : ""} ${future ? "" : "hover:bg-raised"}`
                        } ${faded && !selected ? "opacity-35" : ""}`}
                      >
                        {Number(day.slice(8))}
                      </span>
                      <span
                        className={`size-1 rounded-full ${byDate.has(day) && !selected ? "bg-primary" : "bg-transparent"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 고른 날의 끼니별 줄. 먹은 것은 끼니 이름 아래에 다 보여 줌
 * +는 그 날짜·끼니의 식단 작성 화면으로 넘어감 (회원·트레이너 둘 다)
 */
function MealLog({
  memberId,
  date,
  meals,
  role,
}: {
  memberId: string;
  date: string;
  meals: Meal[];
  role: "member" | "trainer";
}) {
  const editor = role === "member" ? "/me/meals/new" : `/members/${memberId}/meals/new`;

  return (
    <DietCard title="식사 기록">
      <ul className="flex flex-col">
        {MEAL_SLOTS.map((slot) => {
          const list = meals.filter((meal) => meal.slot === slot);
          const label = MEAL_SLOT_LABEL[slot];

          return (
            <li key={slot} className="group flex items-start gap-4">
              {/* 끼니 kcal */}
              <div className="mt-2 grid size-11 shrink-0 place-content-center rounded-full bg-raised text-center text-xs leading-tight">
                <span className="tabular-nums">{kcalOf(sumIntake(list))}</span>
                <span>kcal</span>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-line py-2 group-last:border-0">
                <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
                  <span className="text-base font-medium">{label}</span>
                  {list.length > 0 && (
                    <span className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {list.map((meal) => meal.content).join(", ")}
                    </span>
                  )}
                </div>
                <Link
                  href={`${editor}?date=${date}&slot=${slot}`}
                  title={`${label} 기록`}
                  aria-label={`${label} 기록`}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-raised"
                >
                  <Icon name="plus" size={22} strokeWidth={1.75} />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </DietCard>
  );
}

// ── 식단 · 지난 7일 ─────────────────────────

/** 고른 날까지 7일 막대 그래프. 고른 날 막대를 진하게 */
function WeekChart({
  date,
  byDate,
  target,
}: {
  date: string;
  byDate: Map<string, Meal[]>;
  target: number | null;
}) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(date, i - 6));
  const totals = days.map((day) => sumIntake(byDate.get(day) ?? [])?.calories ?? null);
  const counted = totals.filter((total): total is number => total !== null);
  const average = counted.length
    ? Math.round(counted.reduce((sum, total) => sum + total, 0) / counted.length)
    : null;
  const top = Math.max((target ?? 0) * CALORIE_SCALE, ...counted, 1);
  const y = (kcal: number) => `${(kcal / top) * 100}%`;

  return (
    <DietCard
      title="7일간 칼로리 섭취량"
      action={
        average !== null && (
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            평균 {average.toLocaleString()} kcal
          </span>
        )
      }
    >
      <div className="flex flex-col gap-2">
        <div className="relative h-28 pr-16">
          {/* 막대 */}
          <div className="flex h-full">
            {days.map((day, i) => (
              <div key={day} className="flex flex-1 items-end justify-center">
                {totals[i] !== null && (
                  <span
                    className={`w-3 rounded-t-full ${day === date ? "bg-primary" : "bg-primary/40"}`}
                    style={{ height: y(totals[i]) }}
                  />
                )}
              </div>
            ))}
          </div>
          {/* 목표선 */}
          {target !== null && (
            <>
              <div
                className="absolute left-0 right-16 border-t-2 border-dotted border-line-strong"
                style={{ bottom: y(target) }}
              />
              <span
                className="absolute right-0 translate-y-1/2 rounded-lg border border-line-strong bg-surface px-1.5 py-0.5 text-center text-2xs font-semibold leading-tight tabular-nums"
                style={{ bottom: y(target) }}
              >
                목표
                <br />
                {target.toLocaleString()}
              </span>
            </>
          )}
        </div>

        {/* 날짜 */}
        <div className="flex pr-16">
          {days.map((day) => (
            <span
              key={day}
              className={`flex-1 text-center text-sm tabular-nums ${
                isRedDay(day)
                  ? "text-danger"
                  : day === date
                    ? "text-ink"
                    : "text-muted-foreground"
              } ${day === date ? "font-extrabold" : "font-medium"}`}
            >
              {Number(day.slice(8))}
            </span>
          ))}
        </div>
      </div>
    </DietCard>
  );
}

// ── 체중 그래프 ─────────────────────────────

// 캔버스는 브라우저에서만 그리고, 그래프 라이브러리는 화면이 뜬 뒤에 받음
const ChartCanvas = dynamic(() => import("./weight-chart-canvas"), {
  ssr: false,
  loading: () => <div className="h-52 w-full md:h-60" />,
});

/** 체중 기록이 있으면 보이는 박스. 기록은 최신순으로 받음 */
export function WeightChartCard({
  weights,
  targetWeight,
  busy,
  onSaveGoal,
  onDelete,
}: {
  weights: WeightRecord[];
  targetWeight: number | null;
  busy?: boolean;
  /** 없으면 목표를 보여 주기만 함 (회원 본인 화면). */
  onSaveGoal?: (targetWeight: number | null) => void;
  /** 점을 눌러 고른 기록 지우기. 없으면 보기만 함 */
  onDelete?: (record: WeightRecord) => void;
}) {
  const stats = useMemo(
    () => getStats(weights, targetWeight),
    [weights, targetWeight],
  );
  const { dark } = useTheme();
  const hasInbody = stats.muscle.length > 0 || stats.fat.length > 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-4 md:p-5">
      {/* 현재 체중·목표 — 한 줄 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">
            {stats.last.weight}
            <span className="ml-0.5 text-sm font-bold text-muted-foreground">kg</span>
          </span>
          {stats.points.length > 1 && (
            <span className="text-xs text-muted-foreground">
              처음보다 <span className="font-bold text-primary">{signed(stats.change)}kg</span>
            </span>
          )}
        </p>
        {onSaveGoal ? (
          <GoalControl goal={stats.goal} busy={busy ?? false} onSave={onSaveGoal} />
        ) : (
          stats.goal && <GoalText goal={stats.goal} />
        )}
      </div>

      {/* 그래프 — 테마가 바뀌면 새로 만들어 CSS 변수 색을 다시 읽음 */}
      {/* 범례 — 체중은 왼쪽 축, 골격근·체지방은 오른쪽 축 */}
      {hasInbody && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-2xs font-bold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-3.5 rounded-full bg-primary" />
            체중 (왼쪽)
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-ink" />
              골격근량
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-goal" />
              체지방량 (오른쪽)
            </span>
          </span>
        </div>
      )}

      <ChartCanvas key={dark ? "dark" : "light"} stats={stats} />

      {/* 기록 목록 — 늘 같은 자리. 지우기도 여기서 */}
      <RecordsDialog weights={weights} onDelete={onDelete} />
    </div>
  );
}

/** 평소엔 "목표 78kg"로 보이고, 누르면 그 자리에서 숫자 칸과 저장 버튼이 됨. 모바일에서 주로 씀 */
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

  // 폼으로 감싸서 모바일 키패드의 완료 키로도 저장됨
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
      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-1.5">
        <label htmlFor="weight-goal" className="text-xs font-bold text-subtle">
          목표
        </label>
        <input
          id="weight-goal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          enterKeyHint="done"
          autoFocus
          className="h-8 w-16 rounded-lg border border-goal bg-field px-2 text-right text-sm font-extrabold tabular-nums text-goal outline-none"
        />
        <span className="text-xs font-bold text-muted-foreground">kg</span>
        {goal && (
          <button type="button" onClick={() => save(null)} disabled={busy} className="h-8 px-1.5 text-xs font-bold text-danger disabled:opacity-50">
            지우기
          </button>
        )}
        <button type="button" onClick={() => setEditing(false)} className="h-8 px-1.5 text-xs font-bold text-muted-foreground">
          취소
        </button>
        <button type="submit" disabled={busy} className="h-8 px-1.5 text-xs font-bold text-primary disabled:opacity-50">
          저장
        </button>
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
        목표 체중 정하기
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      aria-label={`목표 체중 ${goal.target}kg 수정`}
      className="group -mr-2 flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-raised disabled:opacity-50"
    >
      <GoalText goal={goal} />
      <Icon name="pencil" size={12} className="text-subtle transition-colors group-hover:text-ink" />
    </button>
  );
}

/** "목표 75kg · 3.4kg 남음" 한 줄 */
function GoalText({ goal }: { goal: Goal }) {
  return (
    <span className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
      <span className="font-bold text-subtle">목표</span>
      <span className="text-base font-extrabold tabular-nums text-goal">
        {goal.target}
        <span className="ml-0.5 text-xs font-bold text-muted-foreground">kg</span>
      </span>
      ·{" "}
      {goal.reached ? (
        <span className="font-bold text-goal">달성</span>
      ) : (
        <span>
          <span className="font-bold text-ink">{goal.remaining}kg</span> 남음
        </span>
      )}
    </span>
  );
}

/** [기록 N건 관리] — 누르면 창에서 날짜별 기록을 보고 지움. 늘 같은 자리라 화면이 흔들리지 않음 */
function RecordsDialog({
  weights,
  onDelete,
}: {
  weights: WeightRecord[];
  /** 없으면 보기만 함 (회원 본인 화면) */
  onDelete?: (record: WeightRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-fit items-center gap-0.5 self-end rounded-lg px-1 text-xs font-bold text-muted-foreground transition-colors hover:text-ink"
      >
        기록 {weights.length}건 {onDelete ? "관리" : "보기"}
        <Icon name="chevronRight" size={14} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dismissOnOutsideClick className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>체중·인바디 기록 {weights.length}건</DialogTitle>
          </DialogHeader>
          <ul className="flex flex-col">
            {weights.map((record) => (
              <li key={record.id} className="flex h-11 items-center gap-3 border-b border-line text-sm last:border-0">
                <span className="w-28 shrink-0 text-muted-foreground">{formatDateShort(record.date)}</span>
                <span className="font-extrabold tabular-nums">{record.weight.toFixed(1)}kg</span>
                <span className={`text-2xs font-bold ${isInbody(record) ? "text-primary" : "text-subtle"}`}>
                  {isInbody(record) ? "인바디" : "체중만"}
                </span>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onDelete(record);
                    }}
                    aria-label={`${record.date} 기록 삭제`}
                    className="ml-auto grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-danger/8 hover:text-danger"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── 계산 ─────────────────────────────────────

export type Point = {
  id: string;
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

/** 인바디 선의 점 — 골격근량·체지방량 */
export type SeriesPoint = { id: string; time: number; value: number; date: string };

export type Stats = {
  points: Point[];
  muscle: SeriesPoint[];
  fat: SeriesPoint[];
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

/** 최신순 기록을 날짜순 점으로 바꾸고 요약 수치를 뽑음 */
function getStats(weights: WeightRecord[], targetWeight: number | null): Stats {
  const sorted = weights
    .map((record) => ({
      id: record.id,
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
  const series = (pick: (r: WeightRecord) => number | null) =>
    weights
      .flatMap((r) => {
        const value = pick(r);
        return value == null
          ? []
          : [
              {
                id: r.id,
                time: new Date(`${r.date}T00:00:00`).getTime(),
                value,
                date: r.date,
              },
            ];
      })
      .sort((a, b) => a.time - b.time);

  return {
    points,
    muscle: series((r) => r.skeletalMuscle),
    fat: series((r) => r.bodyFatMass),
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
            // 빼는 목표면 목표 이하, 찌우는 목표면 목표 이상에서 달성임
            reached:
              first.weight >= targetWeight
                ? last.weight <= targetWeight
                : last.weight >= targetWeight,
          },
  };
}
