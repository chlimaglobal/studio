
'use client';

import { AddTransactionDialog } from './add-transaction-dialog';
import { AudioTransactionDialog } from './audio-transaction-dialog';
import { QrScannerDialog } from './qr-scanner-dialog';
import { Button } from '@/components/ui/button';
import { Mic, Plus, QrCode } from 'lucide-react';

export default function BottomActionBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center p-4 sm:hidden">
      <div className="flex items-center gap-4 rounded-full border bg-card/90 p-2 shadow-lg backdrop-blur-sm">
        <DialogTrigger asChild>
          <AudioTransactionDialog />
        </DialogTrigger>
        <DialogTrigger asChild>
          <AddTransactionDialog>
            <Button size="icon" className="h-14 w-14 rounded-full">
                <Plus className="h-6 w-6" />
                <span className="sr-only">Adicionar Transação</span>
            </Button>
          </AddTransactionDialog>
        </DialogTrigger>
        <DialogTrigger asChild>
          <QrScannerDialog />
        </DialogTrigger>
      </div>
    </div>
  );
}


function DialogTrigger({ children }: { children: React.ReactNode }) {
    // This is a simple wrapper to pass the `asChild` prop to our dialog triggers.
    // It's not a real Radix Trigger, just a helper for this component.
    if (React.isValidElement(children)) {
        return React.cloneElement(children, { asChild: true } as any);
    }
    return children;
}
