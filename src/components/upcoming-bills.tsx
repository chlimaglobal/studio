
'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WalletCards } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Transaction } from '@/lib/types';
import Link from 'next/link';
import { Button } from './ui/button';

const BillItem = ({ bill }: { bill: Transaction }) => {
    const { updateTransaction } = useTransactions();
    const { toast } = useToast();
    
    if (!bill.dueDate) return null;

    const dueDate = new Date(bill.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize current date to the beginning of the day

    const daysDifference = differenceInDays(dueDate, now);
    const isOverdue = daysDifference < 0;
    const isNearDue = !isOverdue && daysDifference <= 7;
    
    const handlePaidToggle = async (isPaid: boolean) => {
        try {
            await updateTransaction(bill.id, { ...bill, paid: isPaid });
            toast({
                title: `Conta ${isPaid ? 'marcada como paga' : 'marcada como pendente'}.`,
                description: `${bill.description} foi atualizada.`
            });
        } catch (error) {
            // The hook already shows a generic error toast.
            console.error("Failed to update bill status:", error);
        }
    };
    
    return (
        <div className="flex items-center justify-between gap-4 py-3 px-2 rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-3">
                <div 
                    className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        bill.paid ? "bg-green-500" :
                        isOverdue ? "bg-destructive" :
                        isNearDue ? "bg-yellow-500" :
                        "bg-muted"
                    )}
                />
                <div>
                    <p className="font-medium text-sm">{bill.description}</p>
                    <p className="text-xs text-muted-foreground">{bill.category}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(bill.amount)}</p>
                    <p className={cn(
                        "text-xs",
                        bill.paid ? "text-green-500" :
                        isOverdue ? "text-destructive" :
                        "text-muted-foreground"
                    )}>
                        {bill.paid ? "Pago" : `Vence ${format(dueDate, 'dd/MM')}`}
                    </p>
                </div>
                <Switch 
                    checked={bill.paid} 
                    onCheckedChange={handlePaidToggle} 
                    aria-label={`Marcar ${bill.description} como ${bill.paid ? 'não paga' : 'paga'}`}
                />
            </div>
        </div>
    );
};

export default function UpcomingBills() {
    const { transactions, isLoading } = useTransactions();

    const bills = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense' && t.dueDate)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    }, [transactions]);

    const visibleBills = bills.filter(b => !b.paid).slice(0, 4);

    if (isLoading || visibleBills.length === 0) {
        return null; // Don't render the card if there are no upcoming bills or still loading
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                 <h2 className="text-lg font-semibold">Contas a Pagar</h2>
                 <Link href="/dashboard/bills" passHref>
                    <Button variant="ghost" size="sm">Ver todas</Button>
                </Link>
            </div>
            <Card>
                <CardContent className="pt-4 divide-y divide-border">
                    {visibleBills.map(bill => (
                        <BillItem key={bill.id} bill={bill} />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
