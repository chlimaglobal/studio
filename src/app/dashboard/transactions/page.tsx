
'use client';

import { useEffect, useState } from 'react';
import type { Transaction } from '@/lib/types';
import { getStoredTransactions } from '@/lib/storage';
import TransactionsTable from '@/components/transactions-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRightLeft } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = () => {
      const fetchedTransactions = getStoredTransactions();
      const transactionsWithDates = fetchedTransactions.map(t => ({...t, date: new Date(t.date)}));
      setTransactions(transactionsWithDates);
    };

    fetchData();
    window.addEventListener('storage', fetchData);
    return () => window.removeEventListener('storage', fetchData);
  }, []);

  return (
    <div className="space-y-6">
      <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6" />
            Transações
          </h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todas as suas movimentações financeiras.
          </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Histórico Completo</CardTitle>
            <CardDescription>
                Aqui estão todas as suas transações. Clique em uma para ver mais detalhes.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
