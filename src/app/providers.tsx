'use client';

import { ReactNode } from 'react';
import { AuthProvider, QueryProvider, ThemeProvider } from '@/components/providers';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
