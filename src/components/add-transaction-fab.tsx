
'use client';

import { Button } from '@/components/ui/button';
import { Plus, Mic, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { AudioTransactionDialog } from './audio-transaction-dialog';
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';
import { usePathname, useRouter } from 'next/navigation';

export function AddTransactionFab() {
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const playSound = () => {
    try {
      const audio = new Audio('/swoosh.mp3');
      audio.play().catch(e => console.error("Error playing sound:", e));
    } catch (e) {
      console.error("Failed to play audio:", e);
    }
  };

  const handleTransactionExtracted = (data: Partial<z.infer<typeof TransactionFormSchema>>) => {
    setIsMenuOpen(false);
    
    // Prepare query params, ensuring all values are strings
    const params: Record<string, string> = {};
    if (data.description) params.description = data.description;
    if (data.amount !== undefined) params.amount = String(data.amount);
    if (data.type) params.type = data.type;
    if (data.date) params.date = new Date(data.date).toISOString();
    if (data.category) params.category = data.category;
    
    const query = new URLSearchParams(params).toString();
    router.push(`/dashboard/add-transaction?${query}`);
  };

  const handleManualAddClick = () => {
    setIsMenuOpen(false);
    router.push('/dashboard/add-transaction');
  };

  const handleAudioAddClick = () => {
      setIsMenuOpen(false);
      setIsAudioOpen(true);
  }

  const toggleMenu = () => {
    playSound();
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Only show the FAB on the main dashboard page
  if (pathname !== '/dashboard') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-center gap-3">
        {isMenuOpen && (
             <div className="flex flex-col items-center gap-3 animate-in fade-in-0 zoom-in-95">
                <div className="flex items-center gap-2">
                    <span className="text-sm bg-background/80 text-foreground px-2 py-1 rounded-md shadow-sm">Adicionar por áudio</span>
                    <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={handleAudioAddClick}>
                        <Mic className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                     <span className="text-sm bg-background/80 text-foreground px-2 py-1 rounded-md shadow-sm">Adicionar manual</span>
                    <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={handleManualAddClick}>
                        <Pencil className="h-6 w-6" />
                    </Button>
                </div>
            </div>
        )}

        <Button 
            size="icon" 
            className="rounded-full h-16 w-16 shadow-2xl bg-primary hover:bg-primary/90 transition-transform duration-300"
            onClick={toggleMenu}
        >
          {isMenuOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
        </Button>
      </div>

      <AudioTransactionDialog
        open={isAudioOpen}
        onOpenChange={setIsAudioOpen}
        onTransactionExtracted={handleTransactionExtracted}
      />
    </>
  );
}
