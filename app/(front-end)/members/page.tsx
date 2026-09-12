"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/empty-state";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/client";
import type { MemberStats, MemberSummary } from "@/lib/types";

/** 수업이 이만큼 이하로 남으면 재등록 안내가 필요하다. */
const LOW_SESSION_THRESHOLD = 3;

function todayLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export default function MembersPage() {
  const { data: session } = useSession();
  const trainerName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "트레이너";

  const [members, setMembers] = useState<MemberSummary[] | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);


  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiFetch<{
        members: MemberSummary[];
        stats: MemberStats;
      }>("/api/members");
      setMembers(data.members);
      setStats(data.stats);
    } catch (e) {
      setLoadError(errorMessage(e, "회원 목록을 불러오지 못했습니다."));
    }
  }, []);

  // 첫 로딩은 effect 안에서 직접 부른다. load()를 그대로 부르면
  // 렌더 도중 상태를 건드리는 모양이 되어 cascading render 경고가 난다.
  useEffect(() => {
    let alive = true;
    apiFetch<{ members: MemberSummary[]; stats: MemberStats }>("/api/members").then(
      (data) => {
        if (!alive) return;
        setMembers(data.members);
        setStats(data.stats);
      },
      (e) => {
        if (alive) setLoadError(errorMessage(e, "회원 목록을 불러오지 못했습니다."));
      },
    );
    return () => {
      alive = false;
    };
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
      await Promise.all(
        ids.map((id) => apiFetch(`/api/members/${id}`, { method: "DELETE" })),
      );
      setMembers((prev) => prev?.filter((m) => !picked.has(m.id)) ?? null);
      toast(`회원 ${ids.length}명을 삭제했습니다.`);
      setConfirming(false);
      setEditing(false);
      setPicked(new Set());
    } catch (e) {
      toast(errorMessage(e, "회원 삭제에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    if (!members) return [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return members;
    return members.filter((member) =>
      [member.name, member.phone, member.goal ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [members, query]);

  /*
   * 남은 수업이 0회면 사실상 종료한 회원이다. 진행 중인 회원과 한 목록에
   * 섞여 있으면 매일 보는 목록이 지난 회원들로 길어진다.
   * 검색은 양쪽 모두에 걸리도록 filtered를 나눠서 쓴다.
   */
  const active = useMemo(
    () => filtered.filter((m) => m.remainingSessions > 0),
    [filtered],
  );
  const ended = useMemo(
    () => filtered.filter((m) => m.remainingSessions === 0),
    [filtered],
  );

  const total = members?.length ?? 0;
  const endedTotal = (members ?? []).filter(
    (m) => m.remainingSessions === 0,
  ).length;
  const activeTotal = total - endedTotal;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      {/* ── 인사 ───────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">
            오늘도 수고하셨어요, {trainerName} 님
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{todayLabel()}</p>
        </div>
        <Button asChild>
          <Link href="/members/new">
            <Icon name="plus" size={16} />
            회원 등록
          </Link>
        </Button>
      </div>

      {/* ── 지표 ───────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-line py-4 sm:grid-cols-4">
          {/* "전체"는 종료한 회원까지 세어 실제로 관리 중인 인원과 어긋난다. */}
          <Kpi
            label="진행 중 회원"
            value={activeTotal}
            unit="명"
          />
          <Kpi
            label="최근 7일 수업"
            value={stats.recentCompletions}
            unit="회"
          />
          <Kpi
            label="수업 소진 임박"
            value={stats.runningLow}
            unit="명"
            warn={stats.runningLow > 0}
          />
          <Kpi
            label="최근 7일 기록"
            value={stats.recentWorkouts}
            unit="건"
          />
        </div>
      )}

      {/* ── 회원 목록 ─────────────────────── */}
      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold tracking-[-0.02em]">
              진행 중 {activeTotal}명
            </h2>
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
                {editing ? "완료" : "편집"}
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
                className="h-11 w-full rounded-lg border-[1.5px] border-edge bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-primary"
              />
            </div>
          )}
        </div>

        {loadError ? (
          <EmptyState
            icon="alert"
            title="회원 목록을 불러오지 못했습니다"
            description={loadError}
            action={
              <Button variant="outline" onClick={() => void load()}>
                다시 시도
              </Button>
            }
          />
        ) : members === null ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[148px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface"
              />
            ))}
          </div>
        ) : total === 0 ? (
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
          // 검색 결과가 종료한 회원뿐일 때. 빈 자리만 두면 아래 종료 목록이
          // 진행 중 목록인 것처럼 보인다.
          <p className="rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-5 text-sm text-muted-foreground">
            수업이 남은 회원이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col">
            {active.map((member) => (
<MemberCard
                key={member.id}
                member={member}
                editing={editing}
                picked={picked.has(member.id)}
                onPick={togglePick}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── 종료한 회원 ─────────────────────── */}
      {ended.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="text-lg font-extrabold tracking-[-0.02em] text-muted-foreground">
            종료 {ended.length}명
          </h2>
          <ul className="flex flex-col">
            {ended.map((member) => (
<MemberCard
                key={member.id}
                member={member}
                editing={editing}
                picked={picked.has(member.id)}
                onPick={togglePick}
              />
            ))}
          </ul>
        </section>
      )}
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
        busy={busy}
        title="회원 삭제"
        message={`선택한 회원 ${picked.size}명을 삭제할까요?`}
        icon="trash"
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

/** 목록에 놓이는 회원 한 장. 진행 중과 종료 목록이 같은 카드를 쓴다. */
function MemberCard({
  member,
  editing,
  picked,
  onPick,
}: {
  member: MemberSummary;
  editing: boolean;
  picked: boolean;
  onPick: (id: string) => void;
}) {
  const left = member.remainingSessions;
  const totalSessions = left + member.completedSessions;
  /*
   * 숫자와 진행바는 "수업이 얼마나 남았나"라는 같은 사실을 말한다.
   * 색을 따로 주면 카드 한 장에 강조색이 둘이 되어 색만 늘고 뜻은 안 는다.
   * 한 색으로 묶어 카드마다 강조색이 하나만 남게 한다.
   */
  const tone =
    left === 0
      ? { text: "text-subtle" }
      : left <= LOW_SESSION_THRESHOLD
        ? { text: "text-danger" }
        : { text: "text-primary" };

  const inner = (
    <>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-base font-extrabold tracking-[-0.02em] group-hover:text-primary">
              {member.name}
            </span>
            {member.goal && (
              <span className="shrink-0 text-2xs text-subtle">{member.goal}</span>
            )}
          </span>
          <span className="text-2xs text-subtle">
            {totalSessions > 0
              ? `등록 ${totalSessions}회 중 ${member.completedSessions}회 사용`
              : "등록된 수업 없음"}
            {member.latestWeight !== null && ` · ${member.latestWeight}kg`}
            {` · 기록 ${member.workoutCount}건`}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span className="flex items-end gap-1">
            <span
              className={`text-xl font-extrabold leading-none tracking-[-0.03em] ${tone.text}`}
            >
              {left}
            </span>
            <span className="text-2xs font-bold text-muted-foreground">회</span>
          </span>
          {!editing && (
            <Icon
              name="chevronRight"
              size={16}
              className="text-subtle transition-colors group-hover:text-ink"
            />
          )}
        </span>
    </>
  );

  return (
    <li className="flex items-center gap-3 border-b border-line last:border-0">
      {editing && (
        <input
          type="checkbox"
          checked={picked}
          onChange={() => onPick(member.id)}
          aria-label={`${member.name} 선택`}
          className="size-4 shrink-0 accent-primary"
        />
      )}

      {editing ? (
        <button
          type="button"
          onClick={() => onPick(member.id)}
          className="group flex min-w-0 flex-1 items-center justify-between gap-3 py-3.5 text-left"
        >
          {inner}
        </button>
      ) : (
        <Link
          href={`/members/${member.id}`}
          className="group flex min-w-0 flex-1 items-center justify-between gap-3 py-3.5"
        >
          {inner}
        </Link>
      )}
    </li>
  );
}

function Kpi({
  label,
  value,
  unit,
  warn = false,
}: {
  label: string;
  value: number;
  unit: string;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline gap-1">
        <span
          className={`text-xl font-extrabold leading-none tracking-[-0.03em] ${
            warn ? "text-danger" : ""
          }`}
        >
          {value}
        </span>
        <span className="text-xs font-bold text-muted-foreground">{unit}</span>
      </p>
      <p className="text-xs font-bold text-ink">{label}</p>
    </div>
  );
}
