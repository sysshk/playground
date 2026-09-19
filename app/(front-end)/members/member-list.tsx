/*
  회원 목록 화면 — 인사, 지표, 수업 달력, 진행 중·종료 회원 칸(이름순)과 일괄 삭제

  @date : 2026-09-12
*/

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { EmptyState } from "@/components/custom/empty-state";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { apiFetch, errorMessage, formatDayShort } from "@/lib/client";
import { kstDay, kstHour } from "@/lib/kst";
import type { MemberStats, MemberSummary, MonthCalendar } from "@/lib/types";
import { LessonCalendar } from "./lesson-calendar";

/** 수업이 이만큼 이하로 남으면 재등록 안내가 필요함 */
const LOW_SESSION_THRESHOLD = 3;

/** 종료 표의 칸 — 이름, 목표(폰에서는 숨김), 받은 수업, 마지막 수업 */
const ENDED_COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto_auto]";

/** 마지막 수업이 이만큼 지나면 연락이 필요한 회원으로 봄 */
const STALE_DAYS = 14;

/** 마지막 수업이 한국 날짜로 며칠 전인지. 수업 전이면 null */
function daysSince(iso: string | null, today: string) {
  if (!iso) return null;
  const diff = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${kstDay(iso)}T00:00:00Z`);
  return Math.max(0, Math.round(diff / 86_400_000));
}

/** "오늘", "3일 전", "2주 전", "2달 전" */
function lastLabel(days: number | null) {
  if (days === null) return "수업 전";
  if (days === 0) return "오늘";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}달 전`;
}

/** 데이터는 서버 컴포넌트(page.tsx)가 읽어 넘김 */
export function MemberList({
  members,
  stats,
  trainerName,
  month,
  calendar,
}: {
  members: MemberSummary[];
  stats: MemberStats;
  trainerName: string;
  month: string; // 달력이 처음 보여줄 달 YYYY-MM
  calendar: MonthCalendar;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [endedOpen, setEndedOpen] = useState(false);
  const today = kstDay(now);

  // 켜 둔 채 정각을 넘기면 인사 문구도 바뀜. 분이 바뀌는 순간에 맞춰 확인함
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const next = new Date();
      setNow(next);
      timer = setTimeout(tick, 60_000 - (next.getTime() % 60_000));
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    return () => clearTimeout(timer);
  }, []);

  const toggleEditing = () => {
    setEditing((on) => !on);
    setPicked(new Set());
  };

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDelete = async () => {
    setBusy(true);
    const ids = [...picked];
    try {
      await apiFetch("/api/members", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      });
      toast(`회원 ${ids.length}명을 삭제했습니다.`);
      // 창 닫기와 새 목록·지표가 한 번에 바뀌도록 같은 전환에 묶음
      startRefresh(() => {
        setConfirming(false);
        setEditing(false);
        setPicked(new Set());
        router.refresh();
      });
    } catch (e) {
      toast(errorMessage(e, "회원 삭제에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return members;
    return members.filter((member) =>
      [member.name, member.phone, member.goal ?? ""].join(" ").toLowerCase().includes(keyword),
    );
  }, [members, query]);

  // 남은 수업이 0회면 종료한 회원임. 검색은 양쪽 모두에 걸리도록 filtered를 나눔
  // 회원을 찾아 들어가는 목록이라 이름순으로 둠
  const byName = (a: MemberSummary, b: MemberSummary) => a.name.localeCompare(b.name, "ko");
  const active = filtered.filter((m) => m.remainingSessions > 0).sort(byName);
  const ended = filtered.filter((m) => m.remainingSessions === 0).sort(byName);

  const total = members.length;
  const activeTotal = members.filter((m) => m.remainingSessions > 0).length;

  // "전체"는 종료한 회원까지 세어 실제로 관리 중인 인원과 어긋나서 진행 중만 셈
  const kpis = [
    { label: "진행 중 회원", value: activeTotal, unit: "명", warn: false },
    { label: "최근 7일 수업", value: stats.recentCompletions, unit: "회", warn: false },
    { label: "수업 소진 임박", value: stats.runningLow, unit: "명", warn: stats.runningLow > 0 },
    { label: "최근 7일 기록", value: stats.recentWorkouts, unit: "건", warn: false },
  ];

  /** 회원 칸. 진행 중과 종료 목록이 같이 씀 */
  const memberCard = (member: MemberSummary) => {
    const left = member.remainingSessions;
    const low = left > 0 && left <= LOW_SESSION_THRESHOLD;
    const days = daysSince(member.lastCompletedAt, today);
    const stale = left > 0 && days !== null && days >= STALE_DAYS;
    const selected = picked.has(member.id);

    const inner = (
      <>
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-base font-extrabold tracking-[-0.02em] group-hover:text-primary">
            {member.name}
          </span>
          <span className="flex shrink-0 items-baseline gap-0.5">
            <span
              className={`text-lg font-extrabold leading-none tracking-[-0.03em] ${
                left === 0 ? "text-subtle" : low ? "text-danger" : "text-primary"
              }`}
            >
              {left}
            </span>
            <span className="text-2xs font-bold text-muted-foreground">회</span>
          </span>
        </span>

        <span className="flex items-baseline justify-between gap-2 text-2xs">
          <span className="truncate text-subtle">{member.goal ?? "목표 없음"}</span>
          <span className={`shrink-0 ${stale ? "font-bold text-warning" : "text-subtle"}`}>
            {lastLabel(days)}
          </span>
        </span>
      </>
    );

    const cardClass = `group flex min-w-0 flex-col gap-1.5 rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors ${
      selected
        ? "border-primary bg-primary-light/40"
        : low
          ? "border-danger/50 hover:border-danger"
          : "border-line hover:border-edge"
    }`;

    return (
      <li key={member.id} className="min-w-0">
        {editing ? (
          <button
            type="button"
            onClick={() => togglePick(member.id)}
            aria-pressed={selected}
            aria-label={`${member.name} 선택`}
            className={`${cardClass} w-full`}
          >
            {inner}
          </button>
        ) : (
          <Link href={`/members/${member.id}`} className={cardClass}>
            {inner}
          </Link>
        )}
      </li>
    );
  };

  const grid = "grid grid-cols-2 gap-2 sm:grid-cols-3";

  /** 종료한 회원 한 줄. 계속 쌓이는 목록이라 표처럼 한 줄씩 */
  const endedRow = (member: MemberSummary) => {
    const selected = picked.has(member.id);
    const cells = (
      <>
        <span className="truncate font-bold group-hover:text-primary">{member.name}</span>
        <span className="hidden truncate text-subtle sm:block">{member.goal ?? "—"}</span>
        <span className="text-right tabular-nums text-muted-foreground">{member.completedSessions}회</span>
        <span className="text-right tabular-nums text-muted-foreground">
          {member.lastCompletedAt ? formatDayShort(member.lastCompletedAt) : "—"}
        </span>
      </>
    );
    const rowClass = `group grid w-full ${ENDED_COLUMNS} items-center gap-3 px-2 py-2.5 text-left text-sm transition-colors ${
      selected ? "bg-primary-light/40" : "hover:bg-raised"
    }`;

    return (
      <li key={member.id} className="border-b border-line last:border-0">
        {editing ? (
          <button
            type="button"
            onClick={() => togglePick(member.id)}
            aria-pressed={selected}
            aria-label={`${member.name} 선택`}
            className={rowClass}
          >
            {cells}
          </button>
        ) : (
          <Link href={`/members/${member.id}`} className={rowClass}>
            {cells}
          </Link>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      {/* ── 인사 ───────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            suppressHydrationWarning
            className="text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl"
          >
            {greetingAt(now, trainerName)}
          </h1>
          <p suppressHydrationWarning className="mt-1.5 text-sm text-muted-foreground">
            {DATE_LABEL.format(now)}
          </p>
        </div>
        <Button asChild>
          <Link href="/members/new">
            <Icon name="plus" size={16} />
            회원 등록
          </Link>
        </Button>
      </div>

      {/* ── 지표 ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-line py-4 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex flex-col gap-1">
            <p className="flex items-baseline gap-1">
              <span
                className={`text-xl font-extrabold leading-none tracking-[-0.03em] ${
                  kpi.warn ? "text-danger" : ""
                }`}
              >
                {kpi.value}
              </span>
              <span className="text-xs font-bold text-muted-foreground">{kpi.unit}</span>
            </p>
            <p className="text-xs font-bold text-ink">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── 수업 달력 ─────────────────────── */}
      <LessonCalendar initialMonth={month} initial={calendar} members={members} />

      {/* ── 회원 목록 ─────────────────────── */}
      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold tracking-[-0.02em]">진행 중 {activeTotal}명</h2>
            {total > 0 && (
              <button
                type="button"
                onClick={toggleEditing}
                className={`text-sm font-bold transition-colors ${
                  editing
                    ? "text-muted-foreground hover:text-ink"
                    : "text-primary hover:text-primary-dark"
                }`}
              >
                {editing ? "취소" : "편집"}
              </button>
            )}
          </div>
          {total > 0 && (
            <div className="relative w-full sm:w-[280px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름, 연락처, 목표로 검색"
                aria-label="회원 검색"
                className="h-11 w-full rounded-lg border-[1.5px] border-edge bg-field pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-primary"
              />
            </div>
          )}
        </div>

        {total === 0 ? (
          <EmptyState
            icon="users"
            title="아직 등록된 회원이 없습니다"
            description="회원 등록 버튼을 눌러 첫 번째 회원을 추가해 보세요."
            action={
              <Button asChild>
                <Link href="/members/new">
                  <Icon name="plus" size={16} />
                  회원 등록하기
                </Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="검색 결과가 없습니다"
            description="다른 검색어로 다시 시도해 보세요."
          />
        ) : active.length === 0 ? (
          // 검색 결과가 종료한 회원뿐일 때. 빈 자리만 두면 아래 종료 목록이 진행 중 목록처럼 보임
          <p className="rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-5 text-sm text-muted-foreground">
            수업이 남은 회원이 없습니다.
          </p>
        ) : (
          <ul className={grid}>{active.map(memberCard)}</ul>
        )}
      </section>

      {/* ── 종료한 회원 ─────────────────────── */}
      {ended.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <button
            type="button"
            aria-expanded={endedOpen || query.trim() !== ""}
            onClick={() => setEndedOpen((open) => !open)}
            className="flex w-fit items-center gap-1.5 text-lg font-extrabold tracking-[-0.02em] text-muted-foreground transition-colors hover:text-ink"
          >
            <Icon
              name="chevronRight"
              size={18}
              className={`transition-transform ${endedOpen || query.trim() ? "rotate-90" : ""}`}
            />
            종료 {ended.length}명
          </button>
          {/* 검색 중이면 종료한 회원도 펼쳐서 보여 줌 */}
          {(endedOpen || query.trim() !== "") && (
            <div className="flex flex-col">
              {/* 표 머리 */}
              <div
                className={`grid ${ENDED_COLUMNS} gap-3 border-b border-line px-2 pb-1.5 text-2xs font-semibold text-subtle`}
              >
                <span>이름</span>
                <span className="hidden sm:block">목표</span>
                <span className="text-right">받은 수업</span>
                <span className="text-right">마지막 수업</span>
              </div>
              <ul className="flex flex-col">{ended.map(endedRow)}</ul>
            </div>
          )}
        </section>
      )}

      {/* ── 선택 삭제 ─────────────────────── */}
      {editing && picked.size > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-3 shadow-float">
          <span className="text-sm font-bold">{picked.size}명 선택됨</span>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            삭제
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        busy={busy || refreshing}
        title="회원 삭제"
        message={`선택한 회원 ${picked.size}명을 삭제할까요?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

// ── 인사 문구 ─────────────────────────────

// 시간대에 맞는 문구 묶음에서 한 시간마다 다른 문구를 고름
// 무작위 대신 "한국 날짜+시"로 고르므로 서버와 브라우저가 같은 문구를 그림
type Line = (name: string) => string;

/** [시작 시, 문구들] — 시작 시가 큰 것부터 맞춰 봄 */
const SLOTS: [number, Line[]][] = [
  [22, [
    (n) => `늦게까지 고생 많으셨어요, ${n} 님`,
    (n) => `오늘 하루도 정말 수고하셨어요, ${n} 님`,
    (n) => `푹 쉬고 내일 봬요, ${n} 님`,
    (n) => `오늘 하루 정말 알찼어요, ${n} 님`,
    (n) => `스트레칭 한 번 하고 주무세요, ${n} 님`,
    (n) => `오늘도 회원들 잘 챙기셨어요, ${n} 님`,
    (n) => `오늘도 멋진 하루였어요, ${n} 님`,
  ]],
  [18, [
    (n) => `오늘도 수고하셨어요, ${n} 님`,
    (n) => `저녁 수업까지 힘내세요, ${n} 님`,
    (n) => `하루 마무리 잘하고 계신가요, ${n} 님?`,
    (n) => `퇴근한 회원들이 몰려올 시간이에요, ${n} 님`,
    (n) => `저녁 피크 타임도 파이팅, ${n} 님`,
    (n) => `조금만 더 힘내요, ${n} 님`,
    (n) => `물 한 잔 마시고 가요, ${n} 님`,
  ]],
  [14, [
    (n) => `오후도 힘내세요, ${n} 님`,
    (n) => `회원들이 기다리고 있어요, ${n} 님`,
    (n) => `오늘 수업 잘 흘러가고 있나요, ${n} 님?`,
    (n) => `나른한 오후, 커피 한 잔 어떠세요, ${n} 님?`,
    (n) => `오후도 기분 좋게, ${n} 님`,
    (n) => `지금 컨디션 괜찮으세요, ${n} 님?`,
    (n) => `오후 수업도 좋은 자세로, ${n} 님`,
  ]],
  [11, [
    (n) => `점심은 챙기셨어요, ${n} 님?`,
    (n) => `오후 수업 전에 잠깐 쉬어 가세요, ${n} 님`,
    (n) => `든든하게 먹고 오후도 달려요, ${n} 님`,
    (n) => `단백질 챙겨 드셨나요, ${n} 님?`,
    (n) => `맛있는 점심 드세요, ${n} 님`,
    (n) => `오전 수업 수고 많으셨어요, ${n} 님`,
  ]],
  [5, [
    (n) => `좋은 아침이에요, ${n} 님`,
    (n) => `오늘 첫 수업도 힘차게, ${n} 님`,
    (n) => `상쾌하게 하루 시작해요, ${n} 님`,
    (n) => `오늘도 좋은 하루 보내세요, ${n} 님`,
    (n) => `커피 한 잔과 함께 시작해요, ${n} 님`,
    (n) => `오늘 하루도 응원할게요, ${n} 님`,
    (n) => `아침 수업 회원들이 곧 와요, ${n} 님`,
  ]],
  [0, [
    (n) => `이 시간까지 고생 많으세요, ${n} 님`,
    (n) => `새벽 수업 준비 중이신가요, ${n} 님?`,
    (n) => `잠은 조금이라도 주무셨어요, ${n} 님?`,
    (n) => `무리하지 말고 쉬어 가세요, ${n} 님`,
  ]],
];

/** 요일에 맞는 문구 (0=일요일). 낮 시간(5~21시)에만 섞음 */
const WEEKDAY_LINES: Partial<Record<number, Line[]>> = {
  0: [
    (n) => `일요일에도 나오셨네요, ${n} 님`,
    (n) => `주말 수업도 수고 많으세요, ${n} 님`,
  ],
  1: [
    (n) => `새로운 한 주 시작이에요, ${n} 님`,
    (n) => `월요일도 힘차게, ${n} 님`,
  ],
  3: [(n) => `한 주의 반을 넘었어요, ${n} 님`],
  5: [
    (n) => `한 주 마무리까지 조금만 더, ${n} 님`,
    (n) => `금요일 수업도 파이팅, ${n} 님`,
  ],
  6: [
    (n) => `토요일에도 나오셨네요, ${n} 님`,
    (n) => `주말 수업도 수고 많으세요, ${n} 님`,
  ],
};

const DATE_LABEL = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

function greetingAt(now: Date, name: string) {
  const hour = kstHour(now);
  const day = kstDay(now);
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  const lines = [
    ...SLOTS.find(([from]) => hour >= from)![1],
    ...(hour >= 5 && hour < 22 ? (WEEKDAY_LINES[weekday] ?? []) : []),
  ];
  const seed = Number(`${day.replaceAll("-", "")}${hour}`);
  const index = Math.imul(seed, 2654435761) >>> 0;
  return lines[index % lines.length](name);
}
