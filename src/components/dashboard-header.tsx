
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { History, CreditCard, XCircle, Sun, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/app/dashboard/layout';


const LogoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 20V14.5C4 13.0667 4.58333 11.8333 5.75 10.8C6.91667 9.76667 8.33333 9.25 10 9.25C11.6667 9.25 13.0833 9.76667 14.25 10.8C15.4167 11.8333 16 13.0667 16 14.5V20H11V14.5C11 14.0333 10.85 13.65 10.55 13.35C10.25 13.05 9.86667 12.9 9.4 12.9C8.93333 12.9 8.55 13.05 8.25 13.35C7.95 13.65 7.8 14.0333 7.8 14.5V20H4ZM12 8L15.3 4H19.5L14 9.5L18 13V15.5L12 8Z" fill="hsl(var(--primary))"/>
    </svg>
)

export default function DashboardHeader() {
  const { transactions } = useTransactions();
  const [totalBalance, setTotalBalance] = useState(0);
  const [userName, setUserName] = useState('Bem-vindo(a)!');
  const [userEmail, setUserEmail] = useState('');
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const balance = transactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
    setTotalBalance(balance);
  }, [transactions]);

  useEffect(() => {
    const updateUserData = () => {
        const storedName = localStorage.getItem('userName') || 'Marcos Lima';
        setUserName(storedName);
        const storedEmail = localStorage.getItem('userEmail') || 'marcos.lima@example.com';
        setUserEmail(storedEmail);
    }
    
    updateUserData();
    window.addEventListener('storage', updateUserData);

    return () => {
        window.removeEventListener('storage', updateUserData);
    }
  }, []);

  const handleLogout = () => {
      router.push('/login');
  };

  const toggleTheme = () => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  const showPlaceholderToast = () => {
    toast({
      title: 'Funcionalidade em Breve',
      description: 'Esta opção ainda não foi implementada.',
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-auto flex-col gap-4 bg-background pt-4">
      <div className="flex items-center justify-between">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person" />
                        <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                 <DropdownMenuLabel>
                     <div className='flex items-center gap-2'>
                        <span className="font-semibold capitalize">{userName}</span>
                        <Badge variant="outline" className='border-green-500 text-green-500'>PLUS</Badge>
                     </div>
                     <p className='text-xs text-muted-foreground font-normal'>{userEmail}</p>
                 </DropdownMenuLabel>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={showPlaceholderToast}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Planos</span>
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={showPlaceholderToast}>
                    <XCircle className="mr-2 h-4 w-4" />
                    <span>Cancelar assinatura</span>
                 </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>{theme === 'dark' ? 'Light' : 'Dark'} tema</span>
                 </DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                 </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={showPlaceholderToast}>
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
       </div>
    </header>
  );
}
