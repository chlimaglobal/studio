
'use client';

import { useState, useMemo } from 'react';
import type { Transaction } from '@/types';
import TransactionsTable from '@/components/transactions-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRightLeft, Download, ArrowLeft } from 'lucide-react';
import { useTransactions, useViewMode } from '@/components/client-providers';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Papa from 'papaparse';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { allInvestmentCategories } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

export default function TransactionsPage() {
  const { transactions, isLoading } = useTransactions();
  const { partnerData } = useViewMode();
  const router = useRouter();
  const { toast } = useToast();

  const operationalTransactions = useMemo(() => {
    return transactions.filter(t => !allInvestmentCategories.has(t.category));
  }, [transactions]);

  const handleExport = (formatType: 'csv' | 'whatsapp') => {
    if (operationalTransactions.length === 0) {
        toast({
            variant: "destructive",
            title: "Nenhuma transação",
            description: "Não há dados para exportar.",
        });
        return;
    }
    
    if (formatType === 'csv') {
        const dataToExport = operationalTransactions.map(t => ({
          Data: format(new Date(t.date), 'yyyy-MM-dd'),
          Descrição: t.description,
          Valor: t.type === 'income' ? t.amount : -t.amount,
          Categoria: t.category,
          Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
          Cartão: t.creditCard || '',
          Pago: t.paid ? 'Sim' : 'Não',
        }));

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `financeflow_transacoes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else { // WhatsApp logic
        let message = `*Resumo de Transações - FinanceFlow*\n\n`;
        let totalIncome = 0;
        let totalExpense = 0;

        operationalTransactions.forEach(t => {
            const date = format(new Date(t.date), 'dd/MM');
            const sign = t.type === 'income' ? '+' : '-';
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
            
            message += `_${date}_ | ${sign} ${formatCurrency(t.amount)} - ${t.description}\n`;
        });
        
        const balance = totalIncome - totalExpense;

        message += `\n*Resumo:*\n`;
        message += `*Receitas:* ${formatCurrency(totalIncome)}\n`;
        message += `*Despesas:* ${formatCurrency(totalExpense)}\n`;
        message += `*Balanço:* ${formatCurrency(balance)}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
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
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={operationalTransactions.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Exportar para CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('whatsapp')}>
                    Exportar para WhatsApp
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

      </div>
      <Card>
        <CardHeader>
            <CardTitle>Histórico Completo</CardTitle>
            <CardDescription>
                Aqui estão todas as suas transações. Clique em uma para ver mais detalhes.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={operationalTransactions} partnerData={partnerData} />
        </CardContent>
      </Card>
    </div>
  );
}
