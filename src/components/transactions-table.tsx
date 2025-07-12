
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransactionsTableProps {
  transactions: Transaction[];
}

export default function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDialog = () => {
    setSelectedTransaction(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
            <TableHead className="hidden sm:table-cell">Data</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} onClick={() => handleRowClick(transaction)} className="cursor-pointer">
              <TableCell>
                <div className="font-medium">{transaction.description}</div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline">{transaction.category}</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {format(transaction.date, 'd MMM, yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-medium',
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className={cn(
                    'text-right font-semibold text-lg',
                    selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  )}>
                  {formatCurrency(selectedTransaction.amount)}
                </p>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="text-right font-medium">{selectedTransaction.type === 'income' ? 'Receita' : 'Despesa'}</p>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <p className="text-sm text-muted-foreground">Categoria</p>
                <div className="text-right">
                    <Badge variant="outline">{selectedTransaction.category}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="text-right font-medium">{format(selectedTransaction.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

