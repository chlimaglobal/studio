
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, History, Landmark, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import type { Transaction } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const LogoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 20V14.5C4 13.0667 4.58333 11.8333 5.75 10.8C6.91667 9.76667 8.33333 9.25 10 9.25C11.6667 9.25 13.0833 9.76667 14.25 10.8C15.4167 11.8333 16 13.0667 16 14.5V20H11V14.5C11 14.0333 10.85 13.65 10.55 13.35C10.25 13.05 9.86667 12.9 9.4 12.9C8.93333 12.9 8.55 13.05 8.25 13.35C7.95 13.65 7.8 14.0333 7.8 14.5V20H4ZM12 8L15.3 4H19.5L14 9.5L18 13V15.5L12 8Z" fill="hsl(var(--primary))"/>
    </svg>
)

export default function DashboardHeader() {
  const [totalBalance, setTotalBalance] = useState(0);
  const [userName, setUserName] = useState('Bem-vindo(a)!');

  useEffect(() => {
    const calculateBalance = () => {
        const transactions: Transaction[] = getStoredTransactions();
        const balance = transactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
        setTotalBalance(balance);
    };

    const updateUserData = () => {
        const storedName = localStorage.getItem('userName');
        setUserName(storedName || 'Bem-vindo(a)!');
    }

    calculateBalance();
    updateUserData();

    window.addEventListener('storage', calculateBalance);
    window.addEventListener('storage', updateUserData);

    return () => {
        window.removeEventListener('storage', calculateBalance);
        window.removeEventListener('storage', updateUserData);
    }
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-auto flex-col gap-4 bg-background pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Avatar className="h-10 w-10">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person" />
                <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="text-sm text-muted-foreground">Bem-vindo(a)!</p>
                <p className="text-base font-semibold capitalize">{userName}</p>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
                <History className="h-6 w-6" />
            </Button>
            <LogoIcon />
        </div>
      </div>
       <div className="flex items-center justify-between">
            <div className='flex flex-col'>
                <span className="text-sm text-muted-foreground">Saldo total em contas</span>
                <span className="text-2xl font-bold">{formatCurrency(totalBalance)}</span>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="w-auto justify-between h-10 px-4 rounded-full">
                        <span>Minhas Contas</span>
                        <ChevronDown className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Contas Disponíveis</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Landmark className="mr-2 h-4 w-4" />
                        <span>Conta Principal</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem disabled>
                        <Landmark className="mr-2 h-4 w-4" />
                        <span>Investimentos</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Adicionar Conta</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
       </div>
    </header>
  );
}
