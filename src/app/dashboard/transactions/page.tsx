
'use client';

import { useState } from 'react';
import type { Transaction } from '@/lib/types';
import TransactionsTable from '@/components/transactions-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRightLeft, Download, ArrowLeft } from 'lucide-react';
import { useTransactions } from '../layout';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function TransactionsPage() {
  const { transactions, isLoading } = useTransactions();
  const router = useRouter();

  const handleExport = () => {
    const dataToExport = transactions.map(t => ({
      Data: format(new Date(t.date), 'yyyy-MM-dd'),
      Descrição: t.description,
      Valor: t.type === 'income' ? t.amount : -t.amount,
      Categoria: t.category,
      Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
      Cartão: t.creditCard || '',
      Pago: t.paid ? 'Sim' : 'Não',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financeflow_transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                <ArrowRightLeft className="h-6 w-6" />
                Transações
                </h1>
                <p className="text-muted-foreground">
                Visualize e gerencie todas as suas movimentações financeiras.
                </p>
            </div>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={transactions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar para CSV
        </Button>
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
