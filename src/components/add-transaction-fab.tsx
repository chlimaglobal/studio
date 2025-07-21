
'use client';

import { Button } from '@/components/ui/button';
import { Plus, Mic, QrCode } from 'lucide-react';
import { useState } from 'react';
import { AddTransactionDialog } from './add-transaction-dialog';
import { AudioTransactionDialog } from './audio-transaction-dialog';
import { QrScannerDialog } from './qr-scanner-dialog';
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';
import { usePathname } from 'next/navigation';

export function AddTransactionFab() {
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [initialTxData, setInitialTxData] = useState<Partial<z.infer<typeof TransactionFormSchema>> | undefined>(undefined);
  const pathname = usePathname();

  const handleTransactionExtracted = (data: Partial<z.infer<typeof TransactionFormSchema>>) => {
    setInitialTxData(data);
    setIsAddTxOpen(true); // Abre o diálogo de transação com os dados preenchidos
  };
  
  // Do not show FAB on specific detail pages
  if (pathname.includes('/dashboard/cards/')) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-center gap-3">
        {/* <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={() => setIsAudioOpen(true)}>
          <Mic className="h-6 w-6" />
        </Button>
         <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={() => setIsQrOpen(true)}>
          <QrCode className="h-6 w-6" />
        </Button> */}
        <Button 
            size="icon" 
            className="rounded-full h-16 w-16 shadow-2xl bg-primary hover:bg-primary/90"
            style={{bottom: '6rem', right: '1.5rem', position: 'fixed'}}
            onClick={() => {
                setInitialTxData(undefined);
                setIsAddTxOpen(true);
            }}
        >
          <Plus className="h-8 w-8" />
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
      <QrScannerDialog
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
        onTransactionExtracted={handleTransactionExtracted}
      />
    </>
  );
}
