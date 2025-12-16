'use client';

import SessionProvider from '@/components/custom/SessionProvider';

export default function FrontEndLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
