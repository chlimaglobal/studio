
'use client'; // ESSENCIAL: Transforma o layout em um Client Component para hospedar providers

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AuthProvider, ClientProviders } from '@/components/providers/client-providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// A Metadata não pode ser exportada de um client component. 
// Vamos definir o título no <head> diretamente.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>FinanceFlow</title>
        <meta name="description" content="Sua plataforma de controle financeiro para casais." />
        <meta name="application-name" content="FinanceFlow" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="FinanceFlow" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={cn('font-sans antialiased bg-background', inter.variable)}>
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
      </body>
    </html>
  );
}
