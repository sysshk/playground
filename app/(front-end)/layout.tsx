/*
  앱 공통 레이아웃 — 로그인 상태 공급, 사이드바 셸, 알림 토스트

  @date : 2025-12-12
*/

'use client';

import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import FrontSidebar from '@/components/custom/front-sidebar';
import { Toaster } from '@/components/ui/sonner';
import { BASE_PATH } from '@/lib/client';

/** 사이드바 셸 없이 그리는 화면 */
const BARE_ROUTES = ['/', '/login', '/join'];

export default function FrontEndLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.includes(pathname) || pathname.startsWith('/invite/');

  return (
    <SessionProvider basePath={`${BASE_PATH}/api/auth`}>
      {bare ? children : <FrontSidebar>{children}</FrontSidebar>}
      <Toaster position="bottom-center" />
    </SessionProvider>
  );
}
