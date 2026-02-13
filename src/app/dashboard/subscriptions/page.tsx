
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Repeat, PlusCircle, CalendarCheck, DollarSign, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { useToast } from '@/hooks/use-toast';
import { Transaction } from '@/types';


const recurrenceLabels: Record<string, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    annually: 'Anual'
};


export default function SubscriptionsPage() {
    const router = useRouter();
    const { transactions, isLoading, deleteTransaction } = useTransactions();
    const { toast } = useToast();
    
    const { subscriptions, totalMonthlyCost } = useMemo(() => {
        const recurringTransactions = transactions.filter(
            t => t.type === 'expense' && t.paymentMethod === 'recurring' && t.recurrence && t.amount
        );

        const latestTransactionsMap = new Map<string, Transaction>();

        recurringTransactions.forEach(transaction => {
            const key = transaction.description.toLowerCase();
            const existing = latestTransactionsMap.get(key);
            if (!existing || new Date(transaction.date) > new Date(existing.date)) {
                latestTransactionsMap.set(key, transaction);
            }
        });

        const uniqueSubscriptions = Array.from(latestTransactionsMap.values());
        
        uniqueSubscriptions.sort((a, b) => b.amount - a.amount);
        
        const totalCost = uniqueSubscriptions.reduce((acc, sub) => {
            if (sub.recurrence === 'monthly') {
                return acc + (sub.amount || 0); // Defensive check for amount
            }
            return acc;
        }, 0);

        return { subscriptions: uniqueSubscriptions, totalMonthlyCost: totalCost };
    }, [transactions]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando assinaturas...</span>
                </div>
            </div>
        );
    }
    
    const handleDelete = async (transactionId: string) => {
        try {
            await deleteTransaction(transactionId);
            toast({
                title: 'Assinatura Excluída!',
                description: 'O registro da assinatura foi removido com sucesso.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Excluir',
                description: 'Não foi possível remover a assinatura.',
            });
        }
    }


    const SubscriptionCard = ({ subscription }: { subscription: Transaction }) => {
        const lastPaymentDate = new Date(subscription.date);

        return (
             <Card className="flex flex-col">
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Repeat className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">{subscription.description}</p>
                                <p className="text-sm text-muted-foreground capitalize">
                                    {subscription.recurrence ? recurrenceLabels[subscription.recurrence] : 'Recorrente'}
                                </p>
                            </div>
                        </div>
                         <div className="text-right">
                            <p className="font-bold text-2xl">{formatCurrency(subscription.amount)}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-xs flex items-center justify-start gap-1.5 text-muted-foreground">
                        <CalendarCheck className="h-3 w-3" />
                        <span>Último pagto. em {format(lastPaymentDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-2 grid grid-cols-2 gap-2">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro da assinatura.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(subscription.id)} className="bg-destructive hover:bg-destructive/90">
                                Sim, excluir
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" onClick={() => router.push(`/dashboard/add-transaction?id=${subscription.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                </CardFooter>
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
                        <Repeat className="h-6 w-6" />
                        Minhas Assinaturas
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie seus serviços recorrentes.
                    </p>
                    </div>
                </div>
            </div>

            <div className="text-center">
                 <Button onClick={() => router.push('/dashboard/add-transaction?paymentMethod=recurring')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Assinatura
                </Button>
            </div>
            
            <Card className="bg-gradient-to-tr from-primary/10 to-background">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign />
                        Custo Mensal Estimado
                    </CardTitle>
                    <CardDescription>
                        Soma de todas as suas assinaturas com frequência mensal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthlyCost)}</p>
                </CardContent>
            </Card>

             <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    Catálogo de Assinaturas
                </h2>
                <div className="space-y-3">
                    {subscriptions.length > 0 ? (
                        subscriptions.map(sub => <SubscriptionCard key={sub.id} subscription={sub} />)
                    ) : (
                         <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                            <p>Nenhuma assinatura recorrente encontrada.</p>
                            <p className="text-sm">Adicione uma despesa recorrente para vê-la aqui.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
