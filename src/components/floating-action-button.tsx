
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus, Mic, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddTransactionDialog } from './add-transaction-dialog';
import { AudioTransactionDialog } from './audio-transaction-dialog';
import { QrScannerDialog } from './qr-scanner-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';

type FabPosition = 'left' | 'right';

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<FabPosition>('right');
  const [isMounted, setIsMounted] = useState(false);

  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const [initialData, setInitialData] = useState<Partial<z.infer<typeof TransactionFormSchema>> | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const storedPosition = localStorage.getItem('fabPosition') as FabPosition;
    if (storedPosition) {
      setPosition(storedPosition);
    }

    const handleStorageChange = () => {
      const updatedPosition = localStorage.getItem('fabPosition') as FabPosition;
      if (updatedPosition) {
        setPosition(updatedPosition);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleTransactionExtracted = (data: Partial<z.infer<typeof TransactionFormSchema>>) => {
    setInitialData(data);
    setAddTransactionOpen(true);
  };
  
  const handleOpenAddTransaction = () => {
    setInitialData(null); // Clear any previous data
    setAddTransactionOpen(true);
  }

  if (!isMounted) {
    return null; // Avoid rendering on the server to prevent hydration mismatch
  }


  return (
    <div className={cn("fixed bottom-6 z-50 sm:hidden", position === 'right' ? 'right-6' : 'left-6')}>
      <AddTransactionDialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen} initialData={initialData || undefined} />
      <AudioTransactionDialog open={audioOpen} onOpenChange={setAudioOpen} onTransactionExtracted={handleTransactionExtracted} />
      <QrScannerDialog open={qrOpen} onOpenChange={setQrOpen} onTransactionExtracted={handleTransactionExtracted} />
      
      <TooltipProvider>
        <div className="relative flex flex-col items-center gap-3">
          {/* Action Buttons */}
          <div
            className={cn(
              'flex flex-col items-center gap-3 transition-all duration-300 ease-in-out',
              isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={() => setAudioOpen(true)}>
                    <Mic className="h-6 w-6" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'right' ? 'left' : 'right'}>
                <p>Adicionar com Voz</p>
              </TooltipContent>
            </Tooltip>

             <Tooltip>
              <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={() => setQrOpen(true)}>
                    <QrCode className="h-6 w-6" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'right' ? 'left' : 'right'}>
                <p>Escanear QR Code</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={handleOpenAddTransaction}>
                    <Plus className="h-6 w-6" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'right' ? 'left' : 'right'}>
                <p>Adicionar Manualmente</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Main FAB */}
          <Button
            size="icon"
            className="h-16 w-16 rounded-full shadow-lg"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Plus
              className={cn(
                'h-8 w-8 transition-transform duration-300 ease-in-out',
                isOpen && 'rotate-45'
              )}
            />
          </Button>
        </div>
      </TooltipProvider>
    </div>
  );
}
