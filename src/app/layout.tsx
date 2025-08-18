
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/client-providers';

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="FinanceFlow" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FinanceFlow" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#FBBF24" />
        <link rel="apple-touch-icon" href="/icon-512x512.png" />
      </head>
      <body className={`font-sans ${inter.variable} antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
