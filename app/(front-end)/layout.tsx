'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import AppShell from './_components/app-shell';
import SessionProvider from './_components/session-provider';

// 셸 없이 그리는 화면들.
// "/"는 소개 페이지라 전폭 히어로와 자체 헤더를 쓴다. 앱 셸의
// 최대 너비와 여백에 갇히면 랜딩 레이아웃을 만들 수 없다.
const BARE_ROUTES = ['/', '/login', '/join'];

export default function FrontEndLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.includes(pathname);

  return (
    <SessionProvider>
      {bare ? children : <AppShell>{children}</AppShell>}
      <Toaster position="bottom-center" />
    </SessionProvider>
  );
}
