"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/empty-state";
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
    <div className="flex flex-col gap-6">
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
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {/* "전체"는 종료한 회원까지 세어 실제로 관리 중인 인원과 어긋난다.
              진행 중을 앞에 세우고, 종료 인원은 아래 설명으로 붙인다. */}
          <Kpi
            label="진행 중 회원"
            value={activeTotal}
            unit="명"
            hint={endedTotal > 0 ? `종료 ${endedTotal}명` : "수업이 남은 회원"}
          />
          <Kpi
            label="최근 7일 수업"
            value={stats.recentCompletions}
            unit="회"
            hint="완료 처리한 수업"
          />
          <Kpi
            label="수업 소진 임박"
            value={stats.runningLow}
            unit="명"
            hint={`${LOW_SESSION_THRESHOLD}회 이하 남음`}
            warn={stats.runningLow > 0}
          />
          <Kpi
            label="최근 7일 기록"
            value={stats.recentWorkouts}
            unit="건"
            hint="작성한 운동 기록"
          />
        </div>
      )}

      {/* ── 회원 목록 ─────────────────────── */}
      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">
            진행 중 {activeTotal}명
          </h2>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </ul>
        )}
      </section>

      {/* ── 종료한 회원 ───────────────────────
          남은 수업이 0회면 진행 중인 회원과 섞어 두지 않는다. 매일 보는 것은
          지금 수업이 남은 사람들이고, 종료한 사람은 다시 등록할 때만 찾는다. */}
      {ended.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="text-lg font-extrabold tracking-[-0.02em] text-muted-foreground">
            종료 {ended.length}명
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ended.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** 목록에 놓이는 회원 한 장. 진행 중과 종료 목록이 같은 카드를 쓴다. */
function MemberCard({ member }: { member: MemberSummary }) {
  const left = member.remainingSessions;
  const totalSessions = left + member.completedSessions;
  const percent =
    totalSessions === 0
      ? 0
      : Math.round((member.completedSessions / totalSessions) * 100);

  /*
   * 숫자와 진행바는 "수업이 얼마나 남았나"라는 같은 사실을 말한다.
   * 색을 따로 주면 카드 한 장에 강조색이 둘이 되어 색만 늘고 뜻은 안 는다.
   * 한 색으로 묶어 카드마다 강조색이 하나만 남게 한다.
   */
  const tone =
    left === 0
      ? { text: "text-subtle", bar: "bg-line-strong" }
      : left <= LOW_SESSION_THRESHOLD
        ? { text: "text-danger", bar: "bg-danger" }
        : { text: "text-primary", bar: "bg-primary" };

  return (
    <li>
      <Link
        href={`/members/${member.id}`}
        className="group flex h-full flex-col gap-3.5 rounded-2xl border-[1.5px] border-edge bg-surface p-4 transition-colors hover:bg-raised sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-extrabold tracking-[-0.03em]">
              {member.name}
            </h3>
            {member.goal && (
              <span className="shrink-0 rounded-full bg-raised px-2.5 py-1 text-2xs font-bold text-muted-foreground group-hover:bg-surface">
                {member.goal}
              </span>
            )}
          </div>
          <p className="flex shrink-0 items-end gap-1">
            {/* 남은 수업이 곧 끝나면 숫자 자체가 경고가 된다.
                따로 알림 배너를 띄우면 같은 사실을 두 번 말하게 된다. */}
            <span
              className={`text-2xl font-extrabold leading-none tracking-[-0.03em] ${tone.text}`}
            >
              {left}
            </span>
            <span className="text-2xs font-bold text-muted-foreground">회</span>
          </p>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-raised group-hover:bg-line">
          <div
            className={`h-full rounded-full ${tone.bar}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-subtle">
          <span>
            기록{" "}
            <span className="font-bold text-ink">{member.workoutCount}건</span>
            {member.latestWeight !== null && (
              <>
                {" · "}
                <span className="font-bold text-ink">
                  {member.latestWeight}kg
                </span>
              </>
            )}
          </span>
          <span>
            {totalSessions > 0
              ? `등록 ${totalSessions}회 중 ${member.completedSessions}회 사용`
              : "등록된 수업 없음"}
          </span>
        </div>
      </Link>
    </li>
  );
}

function Kpi({
  label,
  value,
  unit,
  hint,
  warn = false,
}: {
  label: string;
  value: number;
  unit: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-edge bg-surface p-4">
      <p className="text-2xs font-extrabold uppercase tracking-widest text-subtle">
        {label}
      </p>
      <p className="mt-2 flex items-end gap-1">
        <span
          className={`text-3xl font-extrabold leading-none tracking-[-0.03em] ${
            warn ? "text-primary" : ""
          }`}
        >
          {value}
        </span>
        <span className="pb-0.5 text-xs font-bold text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-1.5 text-2xs text-subtle">{hint}</p>
    </div>
  );
}
