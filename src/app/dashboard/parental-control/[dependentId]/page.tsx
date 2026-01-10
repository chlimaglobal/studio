
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/app-providers';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TransactionsTable from '@/components/transactions-table';
import { formatCurrency } from '@/lib/utils';
import { onTransactionsUpdate } from '@/lib/storage';
import type { AppUser, Transaction } from '@/types';

export default function DependentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: parentUser } = useAuth();
  const dependentId = params.dependentId as string;

  const [dependent, setDependent] = useState<AppUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!parentUser || !dependentId) return;

    const userDocRef = doc(db, 'users', dependentId);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppUser;
        if (data.parentUid === parentUser.uid) {
          setDependent(data);
        } else {
          setDependent(null);
          router.replace('/dashboard/parental-control');
        }
      } else {
        setIsLoading(false);
      }
    });

    const unsubTransactions = onTransactionsUpdate(dependentId, (txs) => {
      setTransactions(txs);
      setIsLoading(false);
    });

    return () => {
      unsubUser();
      unsubTransactions();
    };
  }, [parentUser, dependentId, router]);

  const balance = transactions.reduce((acc, t) => {
    return t.type === 'income' ? acc + t.amount : acc - t.amount;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando dados do dependente...</span>
        </div>
      </div>
    );
  }

  if (!dependent) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">Acesso negado ou dependente não encontrado.</p>
        <Button variant="link" onClick={() => router.push('/dashboard/parental-control')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Avatar className="h-12 w-12 border-2 border-border">
          <AvatarImage src={dependent.photoURL || undefined} />
          <AvatarFallback className="text-xl">
            {dependent.displayName?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">{dependent.displayName}</h1>
          <p className="text-muted-foreground">Dashboard do Dependente</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo Atual</CardTitle>
          <CardDescription>O saldo total na conta do seu dependente.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{formatCurrency(balance)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>Todas as movimentações financeiras de {dependent.displayName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
