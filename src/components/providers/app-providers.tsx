'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import {
  AuthProvider,
  SubscriptionProvider,
  CoupleProvider,
  TransactionsProvider,
  LuminaProvider,
} from './client-providers';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      storageKey="vite-ui-theme"
      disableTransitionOnChange
    >
      <AuthProvider>
        <SubscriptionProvider>
          <CoupleProvider>
            <TransactionsProvider>
              <LuminaProvider>{children}</LuminaProvider>
            </TransactionsProvider>
          </CoupleProvider>
        </SubscriptionProvider>
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}
