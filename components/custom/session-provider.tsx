'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { BASE_PATH } from '@/lib/client';

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider basePath={`${BASE_PATH}/api/auth`}>
      {children}
    </NextAuthSessionProvider>
  );
}
