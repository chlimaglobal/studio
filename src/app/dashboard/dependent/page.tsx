
'use client';

import { useMemo } from 'react';
import { useAuth, useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import TransactionsTable from '@/components/transactions-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DependentDashboardPage() {
    const { user, isLoading: isLoadingAuth } = useAuth();
    const { transactions, isLoading: isLoadingTransactions } = useTransactions();
    const router = useRouter();

    const balance = useMemo(() => {
        return transactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
    }, [transactions]);

    const handleLogout = async () => {
        try {
            await user?.getIdToken(true); // Refresh token to be safe
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };


    if (isLoadingAuth || isLoadingTransactions) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        router.replace('/login');
        return null;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm text-muted-foreground">Bem-vindo(a),</p>
                        <h1 className="text-xl font-bold">{user.displayName}</h1>
                    </div>
                </div>
                 <Button variant="ghost" onClick={handleLogout}>Sair</Button>
            </header>

            <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign />
                        Meu Saldo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft />
                        Minhas Movimentações
                    </CardTitle>
                    <CardDescription>Veja para onde seu dinheiro está indo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TransactionsTable transactions={transactions} />
                </CardContent>
            </Card>
        </div>
    );
}
