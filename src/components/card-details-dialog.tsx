
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Card } from '@/lib/card-types';
import type { Transaction } from '@/lib/types';
import { onTransactionsUpdate } from '@/lib/storage';
import { useEffect, useState } from 'react';
import CardIcon from './card-icon';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CardDetailsDialogProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardDetailsDialog({ card, open, onOpenChange }: CardDetailsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (open && card) {
      const unsubscribe = onTransactionsUpdate((allTransactions) => {
          const cardTransactions = allTransactions.filter(
            (t) => t.type === 'expense' && t.category === 'Cartão de Crédito' && t.creditCard === card.name
          );
          setTransactions(cardTransactions);

          const total = cardTransactions.reduce((acc, t) => acc + t.amount, 0);
          setTotalSpent(total);
      });
      return () => unsubscribe();
    }
  }, [open, card]);

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{card.name}</DialogTitle>
              <DialogDescription className="capitalize">{card.brand}</DialogDescription>
            </div>
            <CardIcon brand={card.brand} className="w-16 h-auto" />
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Fatura Atual (Estimada)</p>
                <p className="font-semibold text-lg text-destructive">
                 {formatCurrency(totalSpent)}
                </p>
            </div>

            <p className="text-sm font-medium text-muted-foreground">Transações Recentes</p>
            <ScrollArea className="h-64 pr-4">
                {transactions.length > 0 ? (
                    <ul className="space-y-3">
                    {transactions.map(t => (
                        <li key={t.id} className="flex items-center justify-between text-sm">
                            <div>
                                <p className="font-medium">{t.description}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                            </div>
                            <p className="font-mono font-medium text-right text-destructive">
                                -{formatCurrency(t.amount)}
                            </p>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>Nenhuma despesa encontrada para este cartão.</p>
                    </div>
                )}
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
