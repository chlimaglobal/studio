
'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Transaction } from '@/lib/types';
import { useRouter } from 'next/navigation';


const BillItem = ({ bill }: { bill: Transaction }) => {
    const { updateTransaction } = useTransactions();
    const { toast } = useToast();
    
    if (!bill.dueDate) return null;

    const dueDate = new Date(bill.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize current date

    const daysDifference = differenceInDays(dueDate, now);
    const isOverdue = !bill.paid && daysDifference < 0;
    const isNearDue = !bill.paid && !isOverdue && daysDifference <= 7;
    
    const handlePaidToggle = async (isPaid: boolean) => {
        try {
            // We need to pass the full schema, so we recreate it.
            // This is a simplification; a real app might have a different update mechanism.
            const updatedData = {
                ...bill,
                amount: bill.amount,
                date: new Date(bill.date),
                paid: isPaid,
                paymentMethod: bill.paymentMethod || 'one-time',
            };
            // @ts-ignore
            await updateTransaction(bill.id, updatedData);
            toast({
                title: `Conta ${isPaid ? 'marcada como paga' : 'marcada como pendente'}.`,
                description: `${bill.description} foi atualizada.`
            });
        } catch (error) {
            console.error("Failed to update bill status:", error);
        }
    };
    
    return (
        <div className="flex items-center justify-between gap-4 py-3 px-2 rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-3">
                <div 
                    className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors",
                        bill.paid ? "bg-green-500" :
                        isOverdue ? "bg-destructive" :
                        isNearDue ? "bg-amber-500" :
                        "bg-muted-foreground/50"
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
    const router = useRouter();

    const bills = useMemo(() => {
        const principalCategories = ['Luz', 'Água', 'Internet', 'Cartão de Crédito'];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        return transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return principalCategories.includes(t.category) &&
                       t.dueDate &&
                       transactionDate.getMonth() === currentMonth &&
                       transactionDate.getFullYear() === currentYear;
            })
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    }, [transactions]);


    if (isLoading || bills.length === 0) {
        return null;
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                 <h2 className="text-lg font-semibold">Contas Principais</h2>
                 <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/bills')}>Ver todas</Button>
            </div>
            <Card>
                <CardContent className="pt-4 divide-y divide-border">
                    {bills.map(bill => (
                        <BillItem key={bill.id} bill={bill} />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
