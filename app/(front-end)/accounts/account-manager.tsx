/*
  계정 관리 화면 — 탭 둘
  · 연결 관리: 아직 앱 계정이 없는 회원 (담당 트레이너, 초대 링크, 가입 계정 연결)
  · 계정 관리: 가입한 회원 계정 (연결된 회원·담당 트레이너·권한·연결 해제), 트레이너·관리자 (권한)
  표마다 오른쪽 위 수정을 누르면 모든 줄이 드롭다운이 되고, 저장하면 바뀐 줄만 반영함

  @date : 2026-09-15
*/

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { Icon } from "@/components/custom/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, BASE_PATH, errorMessage, formatDayShort } from "@/lib/client";
import { formatPhone } from "@/lib/phone";
import type { AccountMemberRow, AccountUserRow } from "@/lib/queries";
import { ROLE_LABEL, type Role } from "@/lib/types";

type Tab = "connect" | "accounts";
type Editing = "connect" | "clients" | "staff" | null;
type Option = { value: string; label: string };
type Job = { label: string; request: () => Promise<unknown> };

const ROLE_OPTIONS: Option[] = (["admin", "trainer", "client"] as Role[]).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}));

/** 연결할 계정을 고르지 않은 상태 */
const NO_LINK = "none";

const TABLE = "w-full table-fixed border-collapse text-sm [&>tbody>tr:last-child>td]:border-b-0";
const TH = "truncate border-b border-line px-2 py-2 text-center text-2xs font-bold text-subtle not-last:border-r";
const TD = "h-12 border-b border-line px-2 py-1.5 text-center align-middle not-last:border-r";

function inviteUrl(token: string) {
  return `${window.location.origin}${BASE_PATH}/invite/${token}`;
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("복사하지 못했습니다. 글자를 길게 눌러 직접 복사해 주세요.");
  }
}

export function AccountManager({
  members,
  users,
  myId,
}: {
  members: AccountMemberRow[];
  users: AccountUserRow[];
  myId: string;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("connect");
  const [editing, setEditing] = useState<Editing>(null);
  /** 수정 중인 값 — `trainer:회원id`, `link:회원id`, `role:계정id` */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [invite, setInvite] = useState<{ memberId: string; name: string; url: string } | null>(null);
  const [unlinking, setUnlinking] = useState<AccountUserRow | null>(null);

  const locked = busy || refreshing;
  const unlinkedMembers = members.filter((m) => !m.account);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const staff = users.filter((u) => u.role !== "client");
  const clients = users.filter((u) => u.role === "client");
  const freeClients = clients.filter((u) => !u.linkedMember);
  const trainerOptions: Option[] = staff.map((u) => ({ value: u.id, label: u.name || u.email }));
  const trainerName = (id: string) => trainerOptions.find((o) => o.value === id)?.label ?? "없음";
  const linkOptions: Option[] = [
    { value: NO_LINK, label: "연결 안 함" },
    ...freeClients.map((u) => ({ value: u.id, label: u.name ? `${u.name} · ${u.email}` : u.email })),
  ];

  const draft = (key: string, fallback: string) => drafts[key] ?? fallback;
  const setDraft = (key: string, value: string) => setDrafts((prev) => ({ ...prev, [key]: value }));

  const cancelEdit = () => {
    setDrafts({});
    setEditing(null);
  };

  /** 바뀐 것만 차례로 보냄. 하나가 실패해도 나머지는 계속하고, 끝나면 목록을 다시 받음 */
  const saveAll = async (jobs: Job[]) => {
    if (jobs.length === 0) {
      cancelEdit();
      return;
    }
    setBusy(true);
    let done = 0;
    for (const job of jobs) {
      try {
        await job.request();
        done += 1;
      } catch (e) {
        toast(`${job.label}: ${errorMessage(e, "저장하지 못했습니다.")}`);
      }
    }
    setBusy(false);
    if (done > 0) toast(`${done}건을 저장했습니다.`);
    cancelEdit();
    startRefresh(() => router.refresh());
  };

  const trainerJob = (member: AccountMemberRow): Job[] => {
    const trainerId = drafts[`trainer:${member.id}`];
    if (!trainerId || trainerId === member.trainerId) return [];
    return [
      {
        label: `${member.name} 담당`,
        request: () =>
          apiFetch(`/api/admin/members/${member.id}/trainer`, {
            method: "PATCH",
            body: JSON.stringify({ trainerId }),
          }),
      },
    ];
  };

  const roleJob = (user: AccountUserRow): Job[] => {
    const role = drafts[`role:${user.id}`];
    if (!role || role === user.role) return [];
    return [
      {
        label: `${user.name || user.email} 권한`,
        request: () => apiFetch(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role }) }),
      },
    ];
  };

  const saveConnect = () =>
    saveAll(
      unlinkedMembers.flatMap((member) => {
        const jobs = trainerJob(member);
        const userId = drafts[`link:${member.id}`];
        if (userId && userId !== NO_LINK) {
          jobs.push({
            label: `${member.name} 계정 연결`,
            request: () =>
              apiFetch(`/api/admin/members/${member.id}/account`, {
                method: "PUT",
                body: JSON.stringify({ userId }),
              }),
          });
        }
        return jobs;
      }),
    );

  const saveClients = () =>
    saveAll(
      clients.flatMap((user) => {
        const member = user.linkedMember ? memberById.get(user.linkedMember.id) : undefined;
        return [...(member ? trainerJob(member) : []), ...roleJob(user)];
      }),
    );

  const saveStaff = () => saveAll(staff.flatMap(roleJob));

  const act = async (request: () => Promise<unknown>, done: string, fail: string) => {
    setBusy(true);
    try {
      await request();
      toast(done);
      startRefresh(() => router.refresh());
      return true;
    } catch (e) {
      toast(errorMessage(e, fail));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createInvite = async (member: AccountMemberRow) => {
    setBusy(true);
    try {
      const { token } = await apiFetch<{ token: string }>(`/api/admin/members/${member.id}/invite`, {
        method: "POST",
      });
      setInvite({ memberId: member.id, name: member.name, url: inviteUrl(token) });
      startRefresh(() => router.refresh());
    } catch (e) {
      toast(errorMessage(e, "초대 링크를 만들지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const cancelInvite = async (member: AccountMemberRow) => {
    const ok = await act(
      () => apiFetch(`/api/admin/members/${member.id}/invite`, { method: "DELETE" }),
      "초대 링크를 취소했습니다.",
      "초대를 취소하지 못했습니다.",
    );
    if (ok && invite?.memberId === member.id) setInvite(null);
  };

  const unlink = async () => {
    const member = unlinking?.linkedMember;
    if (!member) return;
    await act(
      () => apiFetch(`/api/admin/members/${member.id}/account`, { method: "DELETE" }),
      `${member.name} 회원과의 연결을 해제했습니다. 기록과 계정은 그대로입니다.`,
      "연결을 해제하지 못했습니다.",
    );
    setUnlinking(null);
  };

  const editBar = (table: Exclude<Editing, null>, onSave: () => void) => (
    <EditBar
      editing={editing === table}
      disabled={locked || (editing !== null && editing !== table)}
      onEdit={() => {
        setDrafts({});
        setEditing(table);
      }}
      onCancel={cancelEdit}
      onSave={onSave}
    />
  );

  const switchTab = (next: Tab) => {
    cancelEdit();
    setTab(next);
  };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.025em]">계정 관리</h1>

      {/* 탭 */}
      <div role="tablist" aria-label="계정 관리" className="-mt-2 flex gap-5 border-b border-line">
        <TabButton active={tab === "connect"} onClick={() => switchTab("connect")}>
          연결 관리
        </TabButton>
        <TabButton active={tab === "accounts"} onClick={() => switchTab("accounts")}>
          계정 관리
        </TabButton>
      </div>

      {invite && <InviteBox name={invite.name} url={invite.url} onClose={() => setInvite(null)} />}

      {tab === "connect" ? (
        /* 연결 안 된 회원 */
        <Block title="연결 안 된 회원" action={editBar("connect", saveConnect)}>
          <table className={TABLE}>
            <colgroup>
              <col className="w-[22%] tablet:w-[18%]" />
              <col className="hidden tablet:table-column tablet:w-[24%]" />
              <col className="w-[28%] tablet:w-[22%]" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={TH}>이름</th>
                <th scope="col" className={`${TH} hidden tablet:table-cell`}>연락처</th>
                <th scope="col" className={TH}>담당</th>
                <th scope="col" className={TH}>앱 계정</th>
              </tr>
            </thead>
            <tbody>
              {unlinkedMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${TD} text-muted-foreground`}>
                    {members.length === 0 ? "등록한 회원이 없습니다." : "모든 회원이 앱 계정에 연결됐습니다."}
                  </td>
                </tr>
              )}
              {unlinkedMembers.map((member) => (
                <tr key={member.id}>
                  <td className={`${TD} font-bold text-ink`}>
                    <Truncate>{member.name}</Truncate>
                  </td>
                  <td className={`${TD} hidden tabular-nums text-muted-foreground tablet:table-cell`}>
                    <Truncate>{formatPhone(member.phone)}</Truncate>
                  </td>
                  <td className={TD}>
                    <TrainerCell
                      member={member}
                      editing={editing === "connect"}
                      value={draft(`trainer:${member.id}`, member.trainerId)}
                      options={trainerOptions}
                      name={trainerName(member.trainerId)}
                      disabled={locked}
                      onChange={(value) => setDraft(`trainer:${member.id}`, value)}
                    />
                  </td>
                  <td className={TD}>
                    {editing === "connect" ? (
                      freeClients.length > 0 ? (
                        <InlineSelect
                          label={`${member.name}에 연결할 가입 계정`}
                          value={draft(`link:${member.id}`, NO_LINK)}
                          options={linkOptions}
                          disabled={locked}
                          onChange={(value) => setDraft(`link:${member.id}`, value)}
                        />
                      ) : (
                        <span className="text-xs text-subtle">연결할 가입 계정 없음</span>
                      )
                    ) : member.invite ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-bold text-goal">
                          초대 중 · {formatDayShort(member.invite.expiresAt)}까지
                        </span>
                        <Line>
                          <TextButton
                            tone="primary"
                            onClick={() => copy(inviteUrl(member.invite!.token), "초대 링크를 복사했습니다.")}
                          >
                            링크 복사
                          </TextButton>
                          <TextButton tone="danger" disabled={locked} onClick={() => cancelInvite(member)}>
                            취소
                          </TextButton>
                        </Line>
                      </div>
                    ) : (
                      <Line>
                        <span className="text-xs text-subtle">미연결</span>
                        <TextButton tone="primary" disabled={locked} onClick={() => createInvite(member)}>
                          초대 링크
                        </TextButton>
                      </Line>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      ) : (
        <div className="flex flex-col gap-10">
          {/* 가입한 회원 계정 */}
          <Block title="가입한 회원 계정" action={editBar("clients", saveClients)}>
            <table className={TABLE}>
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[18%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={TH}>계정</th>
                  <th scope="col" className={TH}>회원</th>
                  <th scope="col" className={TH}>담당</th>
                  <th scope="col" className={TH}>권한</th>
                  <th scope="col" className={TH}>연결</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`${TD} text-muted-foreground`}>
                      가입한 회원 계정이 없습니다.
                    </td>
                  </tr>
                )}
                {clients.map((user) => {
                  const member = user.linkedMember ? memberById.get(user.linkedMember.id) : undefined;
                  return (
                    <tr key={user.id}>
                      <td className={`${TD} text-muted-foreground`}>
                        <Truncate>{user.email}</Truncate>
                      </td>
                      <td className={`${TD} font-bold text-ink`}>
                        {member ? <Truncate>{member.name}</Truncate> : <span className="text-xs text-goal">없음</span>}
                      </td>
                      <td className={TD}>
                        {member ? (
                          <TrainerCell
                            member={member}
                            editing={editing === "clients"}
                            value={draft(`trainer:${member.id}`, member.trainerId)}
                            options={trainerOptions}
                            name={trainerName(member.trainerId)}
                            disabled={locked}
                            onChange={(value) => setDraft(`trainer:${member.id}`, value)}
                          />
                        ) : (
                          <span className="text-xs text-subtle">—</span>
                        )}
                      </td>
                      <td className={TD}>
                        <RoleCell
                          user={user}
                          editing={editing === "clients"}
                          value={draft(`role:${user.id}`, user.role)}
                          disabled={locked}
                          onChange={(value) => setDraft(`role:${user.id}`, value)}
                        />
                      </td>
                      <td className={TD}>
                        {member ? (
                          <TextButton tone="danger" disabled={locked || editing !== null} onClick={() => setUnlinking(user)}>
                            해제
                          </TextButton>
                        ) : (
                          <span className="text-xs text-subtle">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Block>

          {/* 트레이너·관리자 */}
          <Block title="트레이너·관리자" action={editBar("staff", saveStaff)}>
            <table className={TABLE}>
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[34%]" />
                <col className="w-[24%]" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={TH}>이름</th>
                  <th scope="col" className={TH}>계정</th>
                  <th scope="col" className={TH}>권한</th>
                  <th scope="col" className={TH}>담당 회원</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((user) => {
                  const me = user.id === myId;
                  return (
                    <tr key={user.id}>
                      <td className={`${TD} font-bold text-ink`}>
                        <div className="flex min-w-0 items-center justify-center gap-1">
                          <Truncate>{user.name || "이름 없음"}</Truncate>
                          {me && (
                            <span className="shrink-0 rounded bg-primary-light px-1 text-2xs font-bold text-primary-dark dark:text-primary-bright">
                              나
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${TD} text-muted-foreground`}>
                        <Truncate>{user.email}</Truncate>
                      </td>
                      <td className={TD}>
                        <RoleCell
                          user={user}
                          editing={editing === "staff" && !me}
                          value={draft(`role:${user.id}`, user.role)}
                          disabled={locked}
                          onChange={(value) => setDraft(`role:${user.id}`, value)}
                        />
                      </td>
                      <td className={`${TD} tabular-nums`}>{user.memberCount}명</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Block>
        </div>
      )}

      <ConfirmDialog
        open={unlinking !== null}
        busy={locked}
        title="계정 연결 해제"
        message={`${unlinking?.linkedMember?.name ?? ""} 회원과 ${unlinking?.email ?? ""} 계정의 연결만 끊습니다.`}
        hint="기록과 로그인 계정은 지워지지 않습니다. 연결 관리 탭에서 다시 연결할 수 있습니다."
        confirmLabel="연결 해제"
        onConfirm={unlink}
        onCancel={() => setUnlinking(null)}
      />
    </div>
  );
}

// ── 부품 ─────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px h-11 border-b-2 text-base font-bold transition-colors ${
        active ? "border-primary text-ink" : "border-transparent text-muted-foreground hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Block({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EditBar({
  editing,
  disabled,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  disabled: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!editing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-bold text-primary transition-colors hover:bg-primary-light disabled:opacity-40"
      >
        <Icon name="pencil" size={14} />
        수정
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onCancel}
        className="h-8 rounded-lg px-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-raised hover:text-ink"
      >
        취소
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="h-8 rounded-lg px-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary-light disabled:opacity-40"
      >
        저장
      </button>
    </div>
  );
}

function TrainerCell({
  member,
  editing,
  value,
  options,
  name,
  disabled,
  onChange,
}: {
  member: AccountMemberRow;
  editing: boolean;
  value: string;
  options: Option[];
  name: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (!editing) {
    return (
      <span className="font-semibold text-ink">
        <Truncate>{name}</Truncate>
      </span>
    );
  }
  return (
    <InlineSelect
      label={`${member.name} 담당 트레이너`}
      value={value}
      options={options}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function RoleCell({
  user,
  editing,
  value,
  disabled,
  onChange,
}: {
  user: AccountUserRow;
  editing: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (!editing) return <span className="font-semibold text-ink">{ROLE_LABEL[user.role]}</span>;
  return (
    <InlineSelect
      label={`${user.name || user.email} 권한`}
      value={value}
      options={ROLE_OPTIONS}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function Line({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">{children}</div>;
}

function Truncate({ children }: { children: ReactNode }) {
  return <span className="block truncate">{children}</span>;
}

function InlineSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" aria-label={label} className="mx-auto h-8 w-full max-w-44 min-w-0 text-xs font-semibold">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TextButton({
  onClick,
  disabled,
  tone,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "primary" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 shrink-0 whitespace-nowrap rounded-md px-1.5 text-xs font-bold transition-colors hover:bg-raised disabled:opacity-40 ${
        tone === "danger" ? "text-danger" : "text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function InviteBox({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-primary bg-primary-light px-4 py-4 tablet:px-5 dark:border-edge dark:bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {name} 회원 초대 링크
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            카톡이나 문자로 보내 주세요. 7일 동안 한 번만 쓸 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="-mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-ink"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-2 tablet:flex-row tablet:items-stretch">
        <code className="min-w-0 flex-1 select-all break-all rounded-lg border border-line bg-field px-3 py-2 font-mono text-xs text-ink tablet:text-sm">
          {url}
        </code>
        <button
          type="button"
          onClick={() => copy(url, "초대 링크를 복사했습니다.")}
          className="h-10 shrink-0 rounded-lg bg-action px-4 text-sm font-bold text-action-foreground transition-colors hover:bg-action-hover"
        >
          복사
        </button>
      </div>
    </div>
  );
}
