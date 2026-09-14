/** 회원 목록을 읽는 동안 */
export default function MembersLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      <div className="h-[68px] w-2/3 animate-pulse rounded-2xl bg-surface" />
      <div className="h-[84px] animate-pulse rounded-2xl bg-surface" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[72px] animate-pulse rounded-2xl border-[1.5px] border-edge bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
