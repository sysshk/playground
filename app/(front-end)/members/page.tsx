"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/empty-state";
import { apiFetch, errorMessage } from "@/lib/client";
import type { MemberSummary } from "@/lib/types";

/** 수업이 이만큼 이하로 남으면 재등록 안내가 필요하다. */
const LOW_SESSION_THRESHOLD = 3;

export default function MembersPage() {
  const [members, setMembers] = useState<MemberSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");


  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiFetch<{ members: MemberSummary[] }>("/api/members");
      setMembers(data.members);
    } catch (e) {
      setLoadError(errorMessage(e, "회원 목록을 불러오지 못했습니다."));
    }
  }, []);

  // 첫 로딩은 effect 안에서 직접 부른다. load()를 그대로 부르면
  // 렌더 도중 상태를 건드리는 모양이 되어 cascading render 경고가 난다.
  useEffect(() => {
    let alive = true;
    apiFetch<{ members: MemberSummary[] }>("/api/members").then(
      (data) => {
        if (alive) setMembers(data.members);
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

      {/* ── 종료한 회원 ─────────────────── */}
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
          <p className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-2xs font-bold leading-none text-subtle">
              남은 수업
            </span>
            <span className="flex items-end gap-1">
              <span
                className={`text-2xl font-extrabold leading-none tracking-[-0.03em] ${tone.text}`}
              >
                {left}
              </span>
              <span className="text-2xs font-bold leading-none text-muted-foreground">
                회
              </span>
            </span>
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
