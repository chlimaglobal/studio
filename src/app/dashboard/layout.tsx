
'use client';

import React, { useEffect } from 'react';
import BottomNavBar from '@/components/bottom-nav-bar';
import { AddTransactionFab } from '@/components/add-transaction-fab';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/client-providers'; 

// Main Layout Component
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);


  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
      <div className="flex flex-col min-h-screen w-full bg-background relative">
        <main className="flex-1 overflow-y-auto pb-32 p-4">
          {children}
        </main>
        <AddTransactionFab />
        <BottomNavBar />
      </div>
  );
}
