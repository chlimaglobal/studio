
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from './ui/button';
import { useTransactions, useAuth, useViewMode } from '@/components/client-providers';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Pencil, Landmark, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User } from 'firebase/auth';
import { brandNames } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';


interface TransactionsTableProps {
  transactions: Transaction[];
  showExtraDetails?: boolean;
  partnerData?: User | null;
}

export default function TransactionsTable({ transactions, showExtraDetails = false, partnerData }: TransactionsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { deleteTransaction } = useTransactions();
  const { user } = useAuth();
  const { viewMode } = useViewMode();
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDialog = () => {
    setSelectedTransaction(null);
  };
  
  const handleEdit = (e: React.MouseEvent, transaction: Transaction) => {
    e.stopPropagation(); // Prevent dialog from opening on row click
    setSelectedTransaction(null); // Close dialog if open
    router.push(`/dashboard/add-transaction?id=${transaction.id}`);
  }

  const handleDelete = async (transaction: Transaction) => {
    try {
        await deleteTransaction(transaction.id);
        toast({
            title: 'Sucesso!',
            description: 'Transação excluída.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro!',
            description: 'Não foi possível excluir a transação.',
        });
    }
  }

  const renderOwnerAvatar = (transaction: Transaction) => {
    if (viewMode !== 'together' || transaction.ownerId === user?.uid) {
        return null;
    }
    
    return (
        <Avatar className="h-6 w-6">
            <AvatarImage src={partnerData?.photoURL || undefined} />
            <AvatarFallback className="text-xs">
                {partnerData?.displayName?.charAt(0).toUpperCase() || 'P'}
            </AvatarFallback>
        </Avatar>
    )
  }

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
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} className="cursor-pointer" onClick={() => handleRowClick(transaction)}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                        {renderOwnerAvatar(transaction)}
                        <span>{transaction.description}</span>
                        {transaction.installmentNumber && transaction.totalInstallments && (
                             <Badge variant="secondary">{`${transaction.installmentNumber}/${transaction.totalInstallments}`}</Badge>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground space-x-2">
                        {showExtraDetails && transaction.institution && (
                            <span className="flex items-center gap-1"><Landmark className="h-3 w-3" /> {transaction.institution}</span>
                        )}
                        {transaction.category === 'Cartão de Crédito' && transaction.creditCard && (
                            <span>{transaction.creditCard}</span>
                        )}
                         {transaction.cardBrand && (
                            <Badge variant="outline" className="capitalize">{brandNames[transaction.cardBrand]}</Badge>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEdit(e, transaction)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente a transação.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => selectedTransaction && handleDelete(selectedTransaction)} className="bg-destructive hover:bg-destructive/90">
                                        Sim, excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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
              {selectedTransaction.creditCard && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Apelido do Cartão</p>
                    <p className="font-medium">{selectedTransaction.creditCard}</p>
                </div>
              )}
               {selectedTransaction.cardBrand && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Bandeira</p>
                    <p className="font-medium capitalize">{brandNames[selectedTransaction.cardBrand]}</p>
                </div>
              )}
               {selectedTransaction.institution && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Instituição</p>
                    <p className="font-medium">{selectedTransaction.institution}</p>
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
               {selectedTransaction.observations && (
                 <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Observações</p>
                    <p className="text-sm font-medium p-3 bg-muted rounded-md whitespace-pre-wrap">{selectedTransaction.observations}</p>
                </div>
              )}
            </div>
          )}
           <DialogFooter className="grid grid-cols-2 gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Essa ação não pode ser desfeita. Isso excluirá permanentemente a transação dos seus registros.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => selectedTransaction && handleDelete(selectedTransaction)} className="bg-destructive hover:bg-destructive/90">
                                Sim, excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button onClick={(e) => selectedTransaction && handleEdit(e, selectedTransaction)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
