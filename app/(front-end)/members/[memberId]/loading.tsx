/** 회원 상세를 읽는 동안 */
export default function MemberDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div className="h-[150px] animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="h-[200px] animate-pulse rounded-2xl border border-line bg-surface" />
    </div>
  );
}
