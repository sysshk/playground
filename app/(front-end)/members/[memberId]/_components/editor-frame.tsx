import Link from "next/link";
import { Icon } from "@/components/custom/icons";

/** 회원 아래 작성 화면(운동 기록·코칭 메모·영양 계산)이 함께 쓰는 껍데기. */
export function EditorFrame({
  back,
  title,
  name,
  subtitle,
  children,
}: {
  back: string;
  title: string;
  name?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <Link
        href={back}
        className="hidden w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink lg:flex"
      >
        <Icon name="arrowLeft" size={15} />
        {name ?? "회원"}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-extrabold tracking-[-0.03em]">
          {title}
          {name && (
            <span className="rounded-full bg-raised px-2.5 py-1 text-2xs font-bold text-muted-foreground">
              {name}
            </span>
          )}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}
