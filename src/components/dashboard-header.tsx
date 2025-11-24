
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { History, CreditCard, XCircle, Sun, LogOut, UserCircle, Fingerprint, Eye, EyeOff, Palette, Star, Users, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
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
import { useTransactions } from '@/components/client-providers';
import Link from 'next/link';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from '@/components/client-providers';
import { allInvestmentCategories } from '@/lib/types';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import Image from 'next/image';
import { CoupleModeToggle } from './couple/CoupleModeToggle';


const Logo = () => (
    <div className="flex items-center gap-2">
        <Image src="/icon-192x192.png" alt="Finance Flow Logo" width={32} height={32} className="h-8 w-8" />
        <div className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Finance</span>
            <span className="text-primary">Flow</span>
        </div>
    </div>
);

type DashboardHeaderProps = {
    isPrivacyMode: boolean;
    onTogglePrivacyMode: () => void;
};

export default function DashboardHeader({ isPrivacyMode, onTogglePrivacyMode }: DashboardHeaderProps) {
  const { transactions } = useTransactions();
  const { user } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const operationalTransactions = transactions.filter(t => !allInvestmentCategories.has(t.category));
    const balance = operationalTransactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
    setTotalBalance(balance);
  }, [transactions]);
  
  useEffect(() => {
    // Listen for changes from localStorage to update avatar in real-time
    const handleStorageChange = () => {
      setProfilePic(localStorage.getItem('profilePic'));
    };

    if (user?.photoURL) {
      setProfilePic(user.photoURL);
    }
    const localPic = localStorage.getItem('profilePic');
    if (localPic) {
      setProfilePic(localPic);
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);

  }, [user]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      // Clear session-specific data
      sessionStorage.clear();
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Sair',
        description: 'Não foi possível fazer logout. Tente novamente.',
      });
    }
  };

  const showPlaceholderToast = () => {
    toast({
      title: 'Funcionalidade em Breve',
      description: 'Esta opção ainda não foi implementada.',
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-auto flex-col gap-4 bg-background pt-4">
      <div className="flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onTogglePrivacyMode}>
              {isPrivacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/pricing">
                <Star className="h-5 w-5" />
              </Link>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={profilePic || '/icon-192x192.png'} alt="User Avatar" />
                            <AvatarFallback>
                                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                        <div className='flex items-center gap-2'>
                            <span className="font-semibold capitalize">{user?.displayName || 'Usuário'}</span>
                            <Badge variant="outline" className='border-green-500 text-green-500'>PLUS</Badge>
                        </div>
                        <p className='text-xs text-muted-foreground font-normal'>{user?.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile">
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Minha Conta e Configurações</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={showPlaceholderToast}>
                        <XCircle className="mr-2 h-4 w-4" />
                        <span>Cancelar assinatura</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
       <div className="flex items-center justify-between">
            <div className='flex flex-col'>
                <span className="text-sm text-muted-foreground">Saldo total em contas</span>
                <span className="text-2xl font-bold">{isPrivacyMode ? 'R$ ••••••' : formatCurrency(totalBalance)}</span>
            </div>
            <CoupleModeToggle />
       </div>
    </header>
  );
}
