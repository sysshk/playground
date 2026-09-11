"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import MemberForm, { type MemberPayload } from "./_components/member-form";
import { Icon } from "@/components/custom/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/empty-state";
import { apiFetch, errorMessage } from "@/lib/client";
import type { MemberStats, MemberSummary } from "@/lib/types";

import { toast } from "sonner";
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
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);


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

  useEffect(() => {
    void load();
  }, [load]);

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

  const lowMembers = useMemo(
    () =>
      (members ?? []).filter(
        (m) => m.remainingSessions > 0 && m.remainingSessions <= LOW_SESSION_THRESHOLD,
      ),
    [members],
  );

  const openForm = () => {
    setFormError(null);
    setFormOpen(true);
  };

  const handleCreate = async (values: MemberPayload) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/api/members", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setFormOpen(false);
      toast(`${values.name} 회원을 등록했습니다.`);
      await load();
    } catch (e) {
      setFormError(errorMessage(e, "회원 등록에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  const total = members?.length ?? 0;

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
        {!formOpen && (
          <Button onClick={openForm}>
            <Icon name="plus" size={16} />
            회원 등록
          </Button>
        )}
      </div>

      {/* ── 지표 ───────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Kpi label="전체 회원" value={stats.total} unit="명" hint="등록된 회원" />
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

      {/* ── 수업 임박 알림 ──────────────────── */}
      {lowMembers.length > 0 && (
        <section className="rounded-2xl border border-warning/35 bg-warning/8 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-base font-bold text-warning">
            <Icon name="alert" size={16} />
            수업이 곧 끝나는 회원 {lowMembers.length}명
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {lowMembers.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/members/${m.id}`}
                  className="flex items-center gap-2 rounded-full border border-warning/35 bg-surface px-3 py-1.5 transition-colors hover:border-warning"
                >
                  <span className="text-sm font-bold">{m.name}</span>
                  <span className="text-xs font-semibold text-warning">
                    {m.remainingSessions}회 남음
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 등록 폼 ───────────────────────── */}
      {formOpen && (
        <section className="rounded-2xl border border-line bg-raised p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-md font-bold tracking-tight">회원 등록</h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="닫기"
              className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-surface hover:text-ink"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <MemberForm
            submitLabel="등록하기"
            busy={submitting}
            serverError={formError}
            onSubmit={handleCreate}
            onCancel={() => setFormOpen(false)}
          />
        </section>
      )}

      {/* ── 회원 목록 ─────────────────────── */}
      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">
            회원 {total}명
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
                className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-primary"
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
                className="h-[168px] animate-pulse rounded-2xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : total === 0 ? (
          !formOpen && (
            <EmptyState
              icon="users"
              title="아직 등록된 회원이 없습니다"
              description="회원 등록 버튼을 눌러 첫 번째 회원을 추가해 보세요."
              action={
                <Button onClick={openForm}>
                  <Icon name="plus" size={16} />
                  회원 등록하기
                </Button>
              }
            />
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="검색 결과가 없습니다"
            description="다른 검색어로 다시 시도해 보세요."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((member) => {
              const low =
                member.remainingSessions > 0 &&
                member.remainingSessions <= LOW_SESSION_THRESHOLD;
              return (
                <li key={member.id}>
                  <Link
                    href={`/members/${member.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold tracking-tight">
                          {member.name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {member.phone}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-2xs font-bold ${
                          low
                            ? "bg-warning/12 text-warning"
                            : member.remainingSessions > 0
                              ? "bg-primary-light text-primary-dark"
                              : "bg-raised text-muted-foreground"
                        }`}
                      >
                        {member.remainingSessions}회 남음
                      </span>
                    </div>

                    {member.goal && (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {member.goal}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted-foreground">
                      <span className="flex gap-3.5">
                        <span>
                          체중{" "}
                          <span className="font-bold text-ink">
                            {member.latestWeight !== null
                              ? `${member.latestWeight}kg`
                              : "—"}
                          </span>
                        </span>
                        <span>
                          기록{" "}
                          <span className="font-bold text-ink">
                            {member.workoutCount}건
                          </span>
                        </span>
                      </span>
                      <span className="text-subtle transition-colors group-hover:text-primary">
                        <Icon name="arrowRight" size={16} />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

    </div>
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
    <div
      className={`rounded-2xl border bg-surface p-4 ${
        warn ? "border-warning/35" : "border-line"
      }`}
    >
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 flex items-end gap-1">
        <span
          className={`text-3xl font-extrabold leading-none tracking-[-0.03em] ${
            warn ? "text-warning" : ""
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
