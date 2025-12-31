'use client';

import SessionProvider from '@/components/custom/session-provider';
import FrontTopbar from '@/components/custom/front-topbar';
import { usePathname } from 'next/navigation';

export default function FrontEndLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <SessionProvider>
        {children}
      </SessionProvider>
    )
  }

  return (
    <SessionProvider>
      <div className='h-screen flex flex-col'>
        <FrontTopbar />
        <main className='flex-1 overflow-y-auto'>
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
