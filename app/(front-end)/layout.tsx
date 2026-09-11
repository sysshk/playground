'use client';

import SessionProvider from '@/components/custom/session-provider';
import AppShell from '@/components/pt/app-shell';
import { usePathname } from 'next/navigation';

// 인증 화면은 셸 없이, 그 외 화면은 헤더/하단 탭 셸로 감싼다.
const BARE_ROUTES = ['/login', '/join'];

export default function FrontEndLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (BARE_ROUTES.includes(pathname)) {
    return <SessionProvider>{children}</SessionProvider>;
  }

  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
