
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { History, CreditCard, XCircle, Sun, LogOut, UserCircle, Fingerprint } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
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
import Link from 'next/link';


const Logo = () => (
    <div className="text-2xl font-bold tracking-tighter">
        <span className="text-primary">F</span>
        <span className="text-foreground">$</span>
        <span className="text-primary">F</span>
    </div>
);

export default function DashboardHeader() {
  const { transactions } = useTransactions();
  const [totalBalance, setTotalBalance] = useState(0);
  const [userName, setUserName] = useState('Bem-vindo(a)!');
  const [userEmail, setUserEmail] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
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
        const storedName = localStorage.getItem('userName') || '';
        setUserName(storedName);
        const storedEmail = localStorage.getItem('userEmail') || '';
        setUserEmail(storedEmail);
        const storedProfilePic = localStorage.getItem('profilePic');
        setProfilePic(storedProfilePic);
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
                        <AvatarImage src={profilePic ?? undefined} alt="User Avatar" />
                        <AvatarFallback>{userName ? userName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                 <DropdownMenuLabel>
                     <div className='flex items-center gap-2'>
                        <span className="font-semibold capitalize">{userName || 'Usuário'}</span>
                        <Badge variant="outline" className='border-green-500 text-green-500'>PLUS</Badge>
                     </div>
                     <p className='text-xs text-muted-foreground font-normal'>{userEmail}</p>
                 </DropdownMenuLabel>
                 <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                     <Link href="/dashboard/settings">
                        <Fingerprint className="mr-2 h-4 w-4" />
                        <span>Segurança</span>
                    </Link>
                  </DropdownMenuItem>
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
            <Logo />
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
