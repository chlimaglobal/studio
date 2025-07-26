
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
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransactionsTableProps {
  transactions: Transaction[];
}

export default function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDialog = () => {
    setSelectedTransaction(null);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden text-center sm:table-cell">Categoria</TableHead>
              <TableHead className="hidden text-center sm:table-cell">Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} onClick={() => handleRowClick(transaction)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-xs text-muted-foreground space-x-2">
                        {transaction.category === 'Cartão de Crédito' && transaction.creditCard && (
                            <span>{transaction.creditCard}</span>
                        )}
                        {transaction.installmentNumber && transaction.totalInstallments && (
                             <Badge variant="secondary">{`${transaction.installmentNumber}/${transaction.totalInstallments}`}</Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-center sm:table-cell">
                    <Badge variant="outline">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-center sm:table-cell">
                    {format(new Date(transaction.date), 'd MMM, yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-medium',
                      transaction.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        Nenhuma transação encontrada.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className={cn(
                    'font-semibold text-lg',
                    selectedTransaction.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                  )}>
                  {selectedTransaction.type === 'income' ? '+' : '-'} {formatCurrency(selectedTransaction.amount)}
                </p>
              </div>
               <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{selectedTransaction.type === 'income' ? 'Receita' : 'Despesa'}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Categoria</p>
                <div className="text-right">
                    <Badge variant="outline">{selectedTransaction.category}</Badge>
                </div>
              </div>
              {selectedTransaction.category === 'Cartão de Crédito' && selectedTransaction.creditCard && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Cartão</p>
                    <p className="font-medium">{selectedTransaction.creditCard}</p>
                </div>
              )}
               {selectedTransaction.installmentNumber && selectedTransaction.totalInstallments && (
                 <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Parcela</p>
                    <p className="font-medium">{`${selectedTransaction.installmentNumber} de ${selectedTransaction.totalInstallments}`}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{format(new Date(selectedTransaction.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
