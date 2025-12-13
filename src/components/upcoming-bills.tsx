
'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/definitions';
import { useRouter } from 'next/navigation';

const BillItem = ({ bill }: { bill: Transaction }) => {
    const { updateTransaction } = useTransactions();
    const { toast } = useToast();
    
    // Fallback to transaction date if dueDate is not present
    const billDueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(bill.date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysDifference = differenceInDays(billDueDate, today);
    const isBillOverdue = !bill.paid && daysDifference < 0;
    const isNearDue = !bill.paid && !isBillOverdue && daysDifference <= 7;
    
    const handlePaidToggle = async (isPaid: boolean) => {
        try {
            // We need to create a data object that matches the validation schema
            const updatedData = {
                ...bill,
                amount: bill.amount,
                date: new Date(bill.date), // Ensure it's a Date object
                paid: isPaid,
                paymentMethod: bill.paymentMethod || 'one-time', // Provide default
            };
            // @ts-ignore - We are providing the necessary fields for the schema
            await updateTransaction(bill.id, updatedData);
            toast({
                title: `Conta ${isPaid ? 'marcada como paga' : 'marcada como pendente'}.`,
                description: `${bill.description} foi atualizada.`
            });
        } catch (error) {
            console.error("Failed to update bill status:", error);
        }
    };
    
    const statusColor = bill.paid
      ? 'bg-green-500' // GREEN (Paid)
      : isBillOverdue
      ? 'bg-red-500' // RED (Overdue)
      : isNearDue
      ? 'bg-yellow-500' // YELLOW (Warning)
      : 'bg-red-500'; // RED (Pending)

    return (
        <div className="flex items-center justify-between gap-4 py-3 px-2 rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-3">
                <div 
                    className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors",
                        statusColor
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
                        isBillOverdue ? "text-destructive" :
                        "text-muted-foreground"
                    )}>
                        {bill.paid ? "Pago" : `Vence ${format(billDueDate, 'dd/MM')}`}
                    </p>
                </div>
                <Switch 
                    checked={!!bill.paid} 
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
        const principalCategories = new Set(['Luz', 'Água', 'Internet', 'Cartão de Crédito']);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthBills = transactions.filter(t => {
            if (t.type !== 'expense') return false;
            
            const transactionDate = t.dueDate ? new Date(t.dueDate) : new Date(t.date);
            return principalCategories.has(t.category) &&
                    transactionDate.getMonth() === currentMonth &&
                    transactionDate.getFullYear() === currentYear;
        });
        
        // Group by category and pick the one with the nearest due date.
        const uniqueBillsMap = new Map<string, Transaction>();
        
        monthBills.forEach(bill => {
            const categoryKey = bill.category;
            const existingBill = uniqueBillsMap.get(categoryKey);

            if (!existingBill) {
                uniqueBillsMap.set(categoryKey, bill);
            } else {
                // If there's an existing bill for this category, keep the one with the nearest due date.
                const existingDueDate = existingBill.dueDate ? new Date(existingBill.dueDate) : new Date(existingBill.date);
                const newDueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(bill.date);

                if (newDueDate < existingDueDate) {
                    uniqueBillsMap.set(categoryKey, bill);
                }
            }
        });


        return Array.from(uniqueBillsMap.values())
            .sort((a, b) => {
                if (a.paid !== b.paid) {
                    return a.paid ? 1 : -1;
                }
                const dateA = a.dueDate ? new Date(a.dueDate) : new Date(a.date);
                const dateB = b.dueDate ? new Date(b.dueDate) : new Date(b.date);
                return dateA.getTime() - dateB.getTime();
            });
    }, [transactions]);


    if (isLoading || bills.length === 0) {
        return null;
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                 <h2 className="text-lg font-semibold">Contas Fixas e Cartões</h2>
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
