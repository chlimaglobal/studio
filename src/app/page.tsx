
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the login page instead of the dashboard
    router.replace('/login');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-2 text-lg text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Carregando...</p>
      </div>
    </main>
  );
}
