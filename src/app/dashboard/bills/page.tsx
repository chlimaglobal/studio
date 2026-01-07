
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, WalletCards, CalendarCheck, CalendarX, PlusCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Transaction } from '@/types';


export default function BillsPage() {
    const router = useRouter();
    const { transactions, isLoading, updateTransaction } = useTransactions();
    const { toast } = useToast();
    
    const { upcomingBills, overdueBills } = useMemo(() => {
        const unpaidExpenses = transactions.filter(t => t.type === 'expense' && !t.paid);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = unpaidExpenses.filter(t => t.dueDate && !isPast(new Date(t.dueDate)));
        const overdue = unpaidExpenses.filter(t => t.dueDate && isPast(new Date(t.dueDate)));
        
        upcoming.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
        overdue.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

        return { upcomingBills: upcoming, overdueBills: overdue };
    }, [transactions]);

    const handleMarkAsPaid = async (transactionId: string, isPaid: boolean) => {
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        // Optimistic update can be tricky with partial form schemas
        // For simplicity, we create a compatible object
        const updatedData = {
            ...transaction,
            amount: transaction.amount,
            date: new Date(transaction.date),
            paid: isPaid,
            paymentMethod: transaction.paymentMethod || 'one-time',
        };
        
        try {
            // @ts-ignore - We are providing the necessary fields for the schema
            await updateTransaction(transactionId, updatedData);
            toast({
                title: `Conta ${isPaid ? 'paga' : 'marcada como não paga'}!`,
                description: `A transação "${transaction.description}" foi atualizada.`,
            });
        } catch (error) {
            console.error("Failed to update transaction status:", error);
            // The context already shows a toast on error
        }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando contas...</span>
                </div>
            </div>
        );
    }

    const BillCard = ({ bill }: { bill: Transaction }) => {
        const dueDate = new Date(bill.dueDate!);
        const daysLeft = differenceInDays(dueDate, new Date());
        const isBillOverdue = isPast(dueDate) && daysLeft < 0;

        return (
             <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4">
                     <Switch 
                        checked={bill.paid} 
                        onCheckedChange={(checked) => handleMarkAsPaid(bill.id, checked)}
                        id={`paid-${bill.id}`}
                    />
                    <div>
                        <p className="font-semibold">{bill.description}</p>
                        <p className="text-sm text-muted-foreground">{bill.category}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-4 ml-auto w-full sm:w-auto">
                    <div className="text-right flex-1">
                        <p className="font-bold text-lg">{formatCurrency(bill.amount)}</p>
                        <div className={cn("text-xs flex items-center justify-end gap-1.5", isBillOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                           {isBillOverdue ? <CalendarX className="h-3 w-3" /> : <CalendarCheck className="h-3 w-3" />}
                           <span>{isBillOverdue ? `Vencida há ${Math.abs(daysLeft)} dia(s)` : `Vence em ${daysLeft} dia(s)`}</span>
                        </div>
                    </div>
                </div>
            </Card>
        )
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <WalletCards className="h-6 w-6" />
                        Contas a Pagar
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie seus pagamentos pendentes e recorrentes.
                    </p>
                    </div>
                </div>
                 <Button onClick={() => router.push('/dashboard/add-transaction')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Conta
                </Button>
            </div>
            
            {overdueBills.length > 0 && (
                 <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-destructive flex items-center gap-2">
                        <CalendarX className="h-5 w-5" />
                        Contas Vencidas
                    </h2>
                    <div className="space-y-3">
                        {overdueBills.map(bill => <BillCard key={bill.id} bill={bill} />)}
                    </div>
                </section>
            )}

             <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5" />
                    Próximos Vencimentos
                </h2>
                <div className="space-y-3">
                    {upcomingBills.length > 0 ? (
                        upcomingBills.map(bill => <BillCard key={bill.id} bill={bill} />)
                    ) : (
                         <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                            <p>Nenhuma conta a pagar encontrada.</p>
                            <p className="text-sm">Todas as suas despesas estão marcadas como pagas.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

    