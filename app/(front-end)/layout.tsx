'use client';

import { usePathname } from 'next/navigation';
import SessionProvider from '@/components/custom/SessionProvider';

export default function FrontEndLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname.includes('/login') || pathname.includes('/join');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <SessionProvider>{children}</SessionProvider>;
}
