
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider, ClientProviders } from '@/components/providers/client-providers';
import { Toaster } from '@/components/ui/toaster';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      storageKey="vite-ui-theme"
      disableTransitionOnChange
    >
      <AuthProvider>
        <ClientProviders>
          {children}
          <Toaster />
        </ClientProviders>
      </AuthProvider>
    </ThemeProvider>
  );
}
