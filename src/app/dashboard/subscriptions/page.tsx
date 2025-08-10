
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Repeat, PlusCircle, CalendarCheck, DollarSign } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const recurrenceLabels: Record<string, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    annually: 'Anual'
};


export default function SubscriptionsPage() {
    const router = useRouter();
    const { transactions, isLoading } = useTransactions();
    
    const { subscriptions, totalMonthlyCost } = useMemo(() => {
        const recurringTransactions = transactions.filter(
            t => t.type === 'expense' && t.paymentMethod === 'recurring'
        );

        // Simple de-duplication based on description
        const uniqueSubscriptions = Array.from(new Map(recurringTransactions.map(item => [item.description, item])).values());
        
        uniqueSubscriptions.sort((a, b) => b.amount - a.amount);
        
        const totalCost = uniqueSubscriptions.reduce((acc, sub) => {
            // This is a simplified calculation, assuming all recurrences are monthly for the summary
            // A more complex logic would be needed to normalize all frequencies to a monthly cost
            if (sub.recurrence === 'monthly') {
                return acc + sub.amount;
            }
            return acc; // For now, only summing up monthly for simplicity
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

    const SubscriptionCard = ({ subscription }: { subscription: typeof subscriptions[0] }) => {
        const lastPaymentDate = new Date(subscription.date);

        return (
             <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Repeat className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold">{subscription.description}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                            {subscription.recurrence ? recurrenceLabels[subscription.recurrence] : 'Recorrente'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-4 ml-auto w-full sm:w-auto">
                    <div className="text-right flex-1">
                        <p className="font-bold text-lg">{formatCurrency(subscription.amount)}</p>
                        <div className="text-xs flex items-center justify-end gap-1.5 text-muted-foreground">
                           <CalendarCheck className="h-3 w-3" />
                           <span>Último pagto. em {format(lastPaymentDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
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
                        <Repeat className="h-6 w-6" />
                        Minhas Assinaturas
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie seus serviços recorrentes.
                    </p>
                    </div>
                </div>
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
