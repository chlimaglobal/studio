
'use client';

import { Button } from '@/components/ui/button';
import { Plus, Mic, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { AddTransactionDialog } from './add-transaction-dialog';
import { AudioTransactionDialog } from './audio-transaction-dialog';
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';
import { usePathname } from 'next/navigation';

export function AddTransactionFab() {
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [initialTxData, setInitialTxData] = useState<Partial<z.infer<typeof TransactionFormSchema>> | undefined>(undefined);
  const pathname = usePathname();

  const handleTransactionExtracted = (data: Partial<z.infer<typeof TransactionFormSchema>>) => {
    setInitialTxData(data);
    setIsMenuOpen(false);
    setIsAddTxOpen(true);
  };

  const handleManualAddClick = () => {
    setInitialTxData(undefined);
    setIsMenuOpen(false);
    setIsAddTxOpen(true);
  };

  const handleAudioAddClick = () => {
      setIsMenuOpen(false);
      setIsAudioOpen(true);
  }
  
  if (pathname.includes('/dashboard/cards/')) {
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
            style={{bottom: '6rem', right: '1.5rem', position: 'fixed'}}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
        </Button>
      </div>

      <AddTransactionDialog
        open={isAddTxOpen}
        onOpenChange={setIsAddTxOpen}
        initialData={initialTxData}
      />
      <AudioTransactionDialog
        open={isAudioOpen}
        onOpenChange={setIsAudioOpen}
        onTransactionExtracted={handleTransactionExtracted}
      />
    </>
  );
}
