
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/client-providers';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'FinanceFlow',
  description: 'Sua plataforma de controle financeiro para casais.',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-512x512.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="FinanceFlow" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="FinanceFlow" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={cn('font-sans antialiased bg-background', inter.variable)}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
