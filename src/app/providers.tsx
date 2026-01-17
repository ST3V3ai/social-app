'use client';

import { ReactNode } from 'react';
import { AuthProvider, QueryProvider } from '@/components/providers';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
