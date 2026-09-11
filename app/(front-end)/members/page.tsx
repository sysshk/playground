"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import MemberForm, { type MemberPayload } from "@/components/pt/member-form";
import { Button, EmptyState, Modal, Toast } from "@/components/pt/ui";
import { apiFetch, errorMessage } from "@/lib/client";
import type { MemberSummary } from "@/lib/types";

export default function MembersPage() {
  const [members, setMembers] = useState<MemberSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiFetch<{ members: MemberSummary[] }>("/api/members");
      setMembers(data.members);
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

  const handleCreate = async (values: MemberPayload) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/api/members", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setFormOpen(false);
      setToast(`${values.name} 회원을 등록했습니다.`);
      await load();
    } catch (e) {
      setFormError(errorMessage(e, "회원 등록에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  const total = members?.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">회원 관리</h1>
          <p className="mt-1 text-[13px] text-muted">
            {total > 0
              ? `총 ${total}명의 회원이 등록되어 있습니다.`
              : "아직 등록된 회원이 없습니다"}
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setFormOpen(true);
          }}
        >
          + 회원 등록
        </Button>
      </div>

      {total > 0 && (
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px]"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 연락처, 목표로 검색"
            aria-label="회원 검색"
            className="w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-[15px] outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary-light"
          />
        </div>
      )}

      {loadError ? (
        <EmptyState
          icon="⚠️"
          title="회원 목록을 불러오지 못했습니다"
          description={loadError}
          action={
            <Button variant="ghost" onClick={() => void load()}>
              다시 시도
            </Button>
          }
        />
      ) : members === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[172px] animate-pulse rounded-2xl border border-line bg-white"
            />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon="👥"
          title="아직 등록된 회원이 없습니다"
          description="회원 등록 버튼을 눌러 첫 번째 회원을 추가해 보세요."
          action={
            <Button
              onClick={() => {
                setFormError(null);
                setFormOpen(true);
              }}
            >
              + 회원 등록하기
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="검색 결과가 없습니다"
          description="다른 검색어로 다시 시도해 보세요."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <li key={member.id}>
              <Link
                href={`/members/${member.id}`}
                className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-raised"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[16px] font-bold tracking-tight">
                      {member.name}
                    </h2>
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {member.phone}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      member.remainingSessions > 0
                        ? "bg-primary-light text-primary-dark"
                        : "bg-slate-100 text-muted"
                    }`}
                  >
                    남은 세션 {member.remainingSessions}회
                  </span>
                </div>

                {member.goal && (
                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink">
                    🎯 {member.goal}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-[12px] text-muted">
                  <span>
                    최신 체중{" "}
                    {member.latestWeight !== null ? `${member.latestWeight}kg` : "—"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>운동 기록 {member.workoutCount}건</span>
                </div>

                <span className="mt-3 text-[13px] font-bold text-primary-dark">
                  운동 기록 보기 →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        title="회원 등록"
        onClose={() => setFormOpen(false)}
      >
        <MemberForm
          submitLabel="등록하기"
          busy={submitting}
          serverError={formError}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  );
}
